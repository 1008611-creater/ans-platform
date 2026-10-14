[CmdletBinding()]
param(
 [ValidateSet('setup','install','start','run','status','stop','uninstall')][string]$Mode='status',
 [string]$StateDirectory=(Join-Path $env:LOCALAPPDATA 'ANS/local-3d-service'),
 [string]$PostgresBin='C:/Program Files/PostgreSQL/18/bin',
 [int]$Port=3096,
 [int]$DatabasePort=55439
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$StateDirectory=[IO.Path]::GetFullPath($StateDirectory)
$configPath=Join-Path $StateDirectory 'config.clixml'
$statusPath=Join-Path $StateDirectory 'status.json'
$stopPath=Join-Path $StateDirectory 'stop.request'
$pgData=Join-Path $StateDirectory 'postgres'
$logDirectory=Join-Path $StateDirectory 'logs'
$taskName='ANS Local 3D Service'
$mutexName='Local\ANS.Local3D.Service'
$psExe=Join-Path $PSHOME 'powershell.exe'
$utf8=[Text.UTF8Encoding]::new($false)
function New-Secret {
 $bytes=New-Object byte[] 48
 $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
 try{$rng.GetBytes($bytes);return [Convert]::ToBase64String($bytes)}finally{$rng.Dispose()}
}
function Save-State($value) {
 $temporary=$statusPath+'.'+[Guid]::NewGuid().ToString('N')+'.tmp'
 [IO.File]::WriteAllText($temporary,($value|ConvertTo-Json -Depth 6),$utf8)
 if(Test-Path -LiteralPath $statusPath){[IO.File]::Replace($temporary,$statusPath,(Join-Path $StateDirectory 'status.previous.json'))}else{[IO.File]::Move($temporary,$statusPath)}
}
function Private-Directory {
 [void][IO.Directory]::CreateDirectory($StateDirectory)
 $acl=New-Object Security.AccessControl.DirectorySecurity
 $acl.SetAccessRuleProtection($true,$false)
 $identity=[Security.Principal.WindowsIdentity]::GetCurrent().User
 foreach($sid in @($identity,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
  $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  [void]$acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $StateDirectory -AclObject $acl
 [void][IO.Directory]::CreateDirectory($logDirectory)
}
function Invoke-Native([string]$file,[string[]]$argumentList) {
 & $file @argumentList
 if($LASTEXITCODE -ne 0){throw ('LOCAL_COMMAND_FAILED: '+[IO.Path]::GetFileName($file))}
}
function Load-Config {
 if(!(Test-Path -LiteralPath $configPath)){throw 'LOCAL_SERVICE_NOT_CONFIGURED'}
 $config=Import-Clixml -LiteralPath $configPath
 if($config.root -ne $root -or $config.database -ne 'ans_local_3d' -or $config.pgData -ne $pgData){throw 'LOCAL_SERVICE_CONFIG_MISMATCH'}
 return $config
}
function Reveal($secret) {
 if($secret -isnot [Security.SecureString]){throw 'LOCAL_SECRET_INVALID'}
 return [Net.NetworkCredential]::new('', $secret).Password
}
function Apply-Environment($config) {
 $dbPassword=[Uri]::EscapeDataString((Reveal $config.databasePassword))
 $env:DATABASE_URL='postgresql://ans_local:'+ $dbPassword +'@127.0.0.1:'+ $config.databasePort +'/ans_local_3d'
 $env:DIRECT_URL=$env:DATABASE_URL
 $env:PGPASSWORD=Reveal $config.databasePassword
 $env:AUTH_SECRET=Reveal $config.authSecret
 $env:AUTH_URL='http://localhost:'+ $config.port
 $env:AUTH_TRUST_HOST='true'
 $env:HOSTNAME='127.0.0.1'
 $env:PORT=[string]$config.port
 $env:ANS_VISUAL_SIGNING_SECRET=Reveal $config.signingSecret
 $env:ANS_VISUAL_WORKER_KEY=Reveal $config.workerKey
 $env:ANS_WORKER_SERVER=$env:AUTH_URL
 $env:ANS_WORKER_ID='ans-local-3d'
 $env:ANS_WORKER_JOURNAL=Join-Path $StateDirectory 'model-journal'
 $env:ANS_FOUR_VIEW_JOURNAL=Join-Path $StateDirectory 'four-view-journal'
 $env:ANS_VISUAL_STORAGE_MODE='local'
 $env:ANS_VISUAL_STORAGE_DIR=Join-Path $StateDirectory 'assets'
 $env:ANS_TRIPO_DOWNLOAD_HOSTS='tripo-data.rg1.data.tripo3d.com'
 $env:ANS_TRIPO_FLAT_PRICE_POINTS='10'
 $env:ANS_TRIPO_PRICE_POINTS='10'
 $env:ANS_TRIPO_PRICE_TABLE='[]'
 $env:ANS_TRIPO_ACCEPTING_JOBS='true'
 $env:ANS_TRIPO_ALLOW_SUBMISSIONS='true'
 $env:ANS_FOUR_VIEW_ENABLED='false'
 $env:ANS_FOUR_VIEW_API_CONFIRMED='false'
 $env:ANS_PROJECT_WORKER_DISABLED='true'
 $env:NEXT_TELEMETRY_DISABLED='1'
}
function Postgres-Running($config) {
 & (Join-Path $config.postgresBin 'pg_ctl.exe') status -D $pgData *> $null
 return $LASTEXITCODE -eq 0
}
function Ensure-Postgres($config) {
 if(Postgres-Running $config){return}
 $listeners=Get-NetTCPConnection -LocalPort $config.databasePort -State Listen -ErrorAction SilentlyContinue
 if($listeners){throw 'DATABASE_PORT_ALREADY_IN_USE'}
 # pg_ctl starts a persistent descendant. Wait for pg_ctl itself, not its
 # inherited pipeline/descendant handles, which can keep PowerShell waiting.
 $arguments=@('start','-D',('"'+$pgData+'"'),'-l',('"'+(Join-Path $logDirectory 'postgres.log')+'"'),'-w','-t','30','-o',('"-h 127.0.0.1 -p '+$config.databasePort+'"'))
 $control=Start-Process -FilePath (Join-Path $config.postgresBin 'pg_ctl.exe') -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'postgres-control.out.log') -RedirectStandardError (Join-Path $logDirectory 'postgres-control.err.log')
 if(!$control.WaitForExit(40000)){throw 'POSTGRES_START_TIMEOUT'}
 if(!(Postgres-Running $config)){throw 'POSTGRES_START_FAILED'}
}
function Sync-Site($config) {
 $standalone=Join-Path $root '.next/standalone'
 if(!(Test-Path -LiteralPath (Join-Path $standalone 'server.js'))){throw 'STANDALONE_BUILD_REQUIRED'}
 $buildId=[IO.File]::ReadAllText((Join-Path $root '.next/BUILD_ID')).Trim()
 $sha=[Security.Cryptography.SHA256]::Create()
 try{$buildHash=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($buildId)))).Replace('-','').Substring(0,16).ToLowerInvariant()}finally{$sha.Dispose()}
 $site=Join-Path $StateDirectory ('site-'+$buildHash)
 [void][IO.Directory]::CreateDirectory($site)
 if(!(Test-Path -LiteralPath (Join-Path $site 'snapshot-complete'))){
  foreach($item in Get-ChildItem -LiteralPath $standalone -Force){
   if($item.Name -eq '.env' -or $item.Name.StartsWith('.env.')){continue}
   Copy-Item -LiteralPath $item.FullName -Destination $site -Recurse -Force
  }
  $static=Join-Path $site '.next/static'
  [void][IO.Directory]::CreateDirectory($static)
  foreach($item in Get-ChildItem -LiteralPath (Join-Path $root '.next/static') -Force){Copy-Item -LiteralPath $item.FullName -Destination $static -Recurse -Force}
  $public=Join-Path $site 'public'
  [void][IO.Directory]::CreateDirectory($public)
  foreach($item in Get-ChildItem -LiteralPath (Join-Path $root 'public') -Force){Copy-Item -LiteralPath $item.FullName -Destination $public -Recurse -Force}
  [IO.File]::WriteAllText((Join-Path $site 'snapshot-complete'),$buildId,$utf8)
 }
 $config | Add-Member -NotePropertyName siteDirectory -NotePropertyValue $site -Force
 $config | Add-Member -NotePropertyName buildId -NotePropertyValue $buildId -Force
 $config | Export-Clixml -LiteralPath $configPath
}
function Setup {
 if(!(Test-Path -LiteralPath (Join-Path $root '.next/BUILD_ID'))){throw 'BUILD_REQUIRED'}
 if(!(Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'ANS/credentials/tripo3d.credential.xml'))){throw 'TRIPO_CREDENTIAL_REQUIRED'}
 if(Test-Path -LiteralPath $configPath){$config=Load-Config}else{
 if($Port -ne 3096 -or $DatabasePort -ne 55439){throw 'UNEXPECTED_SERVICE_PORTS'}
 if(Get-NetTCPConnection -LocalPort $Port,$DatabasePort -State Listen -ErrorAction SilentlyContinue){throw 'SERVICE_PORT_ALREADY_IN_USE'}
 Private-Directory
 $config=[pscustomobject]@{
  version=1;root=$root;node=(Get-Command node.exe -ErrorAction Stop).Source
  postgresBin=[IO.Path]::GetFullPath($PostgresBin);pgData=$pgData;port=$Port;databasePort=$DatabasePort;database='ans_local_3d'
  databasePassword=(ConvertTo-SecureString (New-Secret) -AsPlainText -Force)
  authSecret=(ConvertTo-SecureString (New-Secret) -AsPlainText -Force)
  signingSecret=(ConvertTo-SecureString (New-Secret) -AsPlainText -Force)
  workerKey=(ConvertTo-SecureString (New-Secret) -AsPlainText -Force)
 }
 foreach($file in @('initdb.exe','pg_ctl.exe','psql.exe')){if(!(Test-Path -LiteralPath (Join-Path $config.postgresBin $file))){throw 'POSTGRES_BIN_UNAVAILABLE'}}
 # The DPAPI-encrypted configuration and inherited ACL belong to this Windows user.
 $config | Export-Clixml -LiteralPath $configPath
 }
 Apply-Environment $config
 if(!(Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))){
  $passwordFile=Join-Path $StateDirectory 'init-password.tmp'
  try{
   [IO.File]::WriteAllText($passwordFile,(Reveal $config.databasePassword),$utf8)
   Invoke-Native (Join-Path $config.postgresBin 'initdb.exe') @('-D',$pgData,'-U','ans_local','-A','scram-sha-256','--pwfile',$passwordFile,'--encoding=UTF8','--locale=C')
  }finally{if(Test-Path -LiteralPath $passwordFile){Remove-Item -LiteralPath $passwordFile -Force}}
  [IO.File]::AppendAllText((Join-Path $pgData 'postgresql.conf'),"`ntimezone='UTC'`n",$utf8)
 }
 Ensure-Postgres $config
 & (Join-Path $config.postgresBin 'psql.exe') -h 127.0.0.1 -p $config.databasePort -U ans_local -d postgres -v ON_ERROR_STOP=1 -Atc "SELECT 1 FROM pg_database WHERE datname='ans_local_3d'" | Set-Variable -Name databaseExists
 if($LASTEXITCODE -ne 0){throw 'DATABASE_INSPECTION_FAILED'}
 if(!$databaseExists){Invoke-Native (Join-Path $config.postgresBin 'psql.exe') @('-h','127.0.0.1','-p',[string]$config.databasePort,'-U','ans_local','-d','postgres','-v','ON_ERROR_STOP=1','-c','CREATE DATABASE ans_local_3d')}
 Push-Location -LiteralPath $root
 try{Invoke-Native $config.node @('node_modules/prisma/build/index.js','migrate','deploy')}finally{Pop-Location}
 Sync-Site $config
 [IO.File]::WriteAllText((Join-Path $StateDirectory 'setup-complete'),[DateTime]::UtcNow.ToString('o'),$utf8)
 return $config
}
function New-ChildJob {
 if(!('AnsLocal3D.ChildJob' -as [type])){
  Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
namespace AnsLocal3D {
 public sealed class ChildJob : IDisposable {
  [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
   public long ProcessTime, JobTime; public uint Flags;
   public UIntPtr MinimumWorkingSet, MaximumWorkingSet; public uint ActiveProcessLimit;
   public UIntPtr Affinity; public uint PriorityClass, SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong ReadOperations, WriteOperations, OtherOperations, ReadBytes, WriteBytes, OtherBytes; }
  [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {
   public BasicLimits Basic; public IoCounters Io;
   public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
  }
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int informationClass, ref ExtendedLimits information, uint length);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
  IntPtr handle;
  public ChildJob() {
   handle=CreateJobObject(IntPtr.Zero,null);
   if(handle==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
   var limits=new ExtendedLimits(); limits.Basic.Flags=0x2000;
   if(!SetInformationJobObject(handle,9,ref limits,(uint)Marshal.SizeOf(typeof(ExtendedLimits)))) {
    int error=Marshal.GetLastWin32Error(); CloseHandle(handle); handle=IntPtr.Zero; throw new Win32Exception(error);
   }
  }
  public void Add(IntPtr process) { if(!AssignProcessToJobObject(handle,process)) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  public void Dispose() { if(handle!=IntPtr.Zero) { CloseHandle(handle); handle=IntPtr.Zero; } }
 }
}
"@
 }
 return [AnsLocal3D.ChildJob]::new()
}
function Child-Alive($process) {return $process -and !$process.HasExited}
function Stop-Child($process) {
 if(Child-Alive $process){$process.Kill();[void]$process.WaitForExit(10000)}
}
function Start-Child($config,[string]$kind,[string[]]$argumentList) {
 # Keep the processes hidden, and separate stdout/stderr. Only the owned Process
 # objects are terminated; no port-based or global Node process termination.
 $child=Start-Process -FilePath $config.node -ArgumentList $argumentList -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory ($kind+'.out.log')) -RedirectStandardError (Join-Path $logDirectory ($kind+'.err.log'))
 try{$script:childJob.Add($child.Handle)}catch{Stop-Child $child;throw}
 return $child
}
function Write-Runtime($config,$app,$worker,[string]$phase,[int]$appRestarts,[int]$workerRestarts) {
 Save-State @{
  updatedAt=[DateTime]::UtcNow.ToString('o');phase=$phase;root=$root;supervisorPid=$PID
  supervisorStartedAt=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')
  appPid=if(Child-Alive $app){$app.Id}else{$null}
  workerPid=if(Child-Alive $worker){$worker.Id}else{$null}
  url=('http://localhost:'+$config.port);modelingPoints=10;fourViewEnabled=$false
  appRestarts=$appRestarts;workerRestarts=$workerRestarts
 }
}
function Run-Service {
 $config=Load-Config
 if(!(Test-Path -LiteralPath (Join-Path $StateDirectory 'setup-complete'))){throw 'SETUP_INCOMPLETE'}
 $mutex=[Threading.Mutex]::new($false,$mutexName)
 $owned=$false;$app=$null;$worker=$null;$appRestarts=0;$workerRestarts=0
 try{
  try{$owned=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$owned=$true}
  if(!$owned){return}
  if(Test-Path -LiteralPath $stopPath){Remove-Item -LiteralPath $stopPath -Force}
  $script:childJob=New-ChildJob
  Apply-Environment $config
  $appBackoff=2;$workerBackoff=2;$nextApp=Get-Date;$nextWorker=Get-Date;$lastProbe=[DateTime]::MinValue;$badHealth=0
  while(!(Test-Path -LiteralPath $stopPath)){
   try{Ensure-Postgres $config}catch{Write-Runtime $config $app $worker 'database-unavailable' $appRestarts $workerRestarts;Start-Sleep -Seconds 5;continue}
   if(!(Child-Alive $app) -and (Get-Date) -ge $nextApp){
    Stop-Child $worker;$worker=$null
    if(Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue){Write-Runtime $config $app $worker 'website-port-in-use' $appRestarts $workerRestarts;Start-Sleep -Seconds 5;continue}
    $app=Start-Child $config 'website' @(('"'+(Join-Path $config.siteDirectory 'server.js')+'"'))
    $appRestarts++;$nextApp=(Get-Date).AddSeconds($appBackoff);$appBackoff=[Math]::Min(60,$appBackoff*2);$badHealth=0
   }
   $ready=$false
   if(Child-Alive $app){
    try{$probe=Invoke-RestMethod -Uri ('http://localhost:'+$config.port+'/api/health') -TimeoutSec 4;$ready=$probe.status -eq 'healthy'}catch{}
    if($ready){$appBackoff=2;$badHealth=0}else{$badHealth++;if($badHealth -ge 12){Stop-Child $worker;$worker=$null;Stop-Child $app;$app=$null;$nextApp=(Get-Date).AddSeconds(5)}}
   }else{Stop-Child $worker;$worker=$null}
   if($ready -and !(Child-Alive $worker) -and (Get-Date) -ge $nextWorker){
    $worker=Start-Child $config 'worker' @('scripts/visual-worker/start.mjs','start')
    $workerRestarts++;$nextWorker=(Get-Date).AddSeconds($workerBackoff);$workerBackoff=[Math]::Min(60,$workerBackoff*2)
   }
   if((Child-Alive $worker) -and ((Get-Date)-$worker.StartTime).TotalSeconds -ge 60){$workerBackoff=2}
   Write-Runtime $config $app $worker $(if($ready){'running'}else{'starting'}) $appRestarts $workerRestarts
   Start-Sleep -Seconds 5
  }
 }finally{
  if($owned){Stop-Child $worker;Stop-Child $app;Write-Runtime $config $null $null 'stopped' $appRestarts $workerRestarts;if($script:childJob){$script:childJob.Dispose()};$mutex.ReleaseMutex()}
  $mutex.Dispose()
 }
}
function Start-Service {
 Enable-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Out-Null
 $config=Load-Config
 $mutex=[Threading.Mutex]::new($false,$mutexName);$owned=$false
 try{try{$owned=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$owned=$true};if(!$owned){Write-Output 'Local service is already running.';return}}finally{if($owned){$mutex.ReleaseMutex()};$mutex.Dispose()}
 if(Test-Path -LiteralPath $stopPath){Remove-Item -LiteralPath $stopPath -Force}
 $arguments=@('-NoProfile','-NonInteractive','-File',('"'+$PSCommandPath+'"'),'-Mode','run','-StateDirectory',('"'+$StateDirectory+'"'))
 $process=Start-Process -FilePath $psExe -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'supervisor.out.log') -RedirectStandardError (Join-Path $logDirectory 'supervisor.err.log')
 Write-Output ('Local supervisor launched. PID '+$process.Id)
}
function Stop-Service {
 Disable-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Out-Null
 if(!(Test-Path -LiteralPath $configPath)){return}
 [IO.File]::WriteAllText($stopPath,[DateTime]::UtcNow.ToString('o'),$utf8)
 $deadline=(Get-Date).AddSeconds(45)
 do{
  if(!(Test-Path -LiteralPath $statusPath)){break}
  $state=Get-Content -LiteralPath $statusPath -Raw|ConvertFrom-Json
  if($state.phase -eq 'stopped'){break}
  $ownedProcess=Get-Process -Id $state.supervisorPid -ErrorAction SilentlyContinue
  if(!$ownedProcess -or $ownedProcess.StartTime.ToUniversalTime().ToString('o') -ne $state.supervisorStartedAt){break}
  Start-Sleep -Seconds 1
 }while((Get-Date) -lt $deadline)
 if($ownedProcess -and $state.phase -ne 'stopped' -and (Get-Date) -ge $deadline){throw 'SERVICE_STOP_TIMED_OUT'}
 $config=Load-Config
 if(Postgres-Running $config){Invoke-Native (Join-Path $config.postgresBin 'pg_ctl.exe') @('stop','-D',$pgData,'-m','fast','-w','-t','30')}
 Write-Output 'Local service stopped; data preserved.'
}
function Install-Service {
 $config=Setup
 if(!(Test-Path -LiteralPath (Join-Path $StateDirectory 'setup-complete'))){throw 'SETUP_INCOMPLETE'}
 $identity=[Security.Principal.WindowsIdentity]::GetCurrent().Name
 $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
 $arguments='-NoProfile -NonInteractive -File "'+$PSCommandPath+'" -Mode run -StateDirectory "'+$StateDirectory+'"'
 if($existing -and ($existing.Actions.Execute -ne $psExe -or $existing.Actions.Arguments -ne $arguments)){throw 'SCHEDULED_TASK_NAME_IN_USE'}
 $action=New-ScheduledTaskAction -Execute $psExe -Argument $arguments -WorkingDirectory $root
 $trigger=New-ScheduledTaskTrigger -AtLogOn -User $identity
 $watchdog=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
 $principal=New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
 $settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
 Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger,$watchdog) -Principal $principal -Settings $settings -Description 'ANS local website and 3D task worker; private local database; no automatic paid demo submissions.' -Force | Out-Null
 Start-ScheduledTask -TaskName $taskName
 Write-Output 'Login startup installed and started.'
}
switch($Mode){
 'setup' {$null=Setup}
 'install' {Install-Service}
 'start' {Start-Service}
 'run' {Run-Service}
 'status' {
  if(Test-Path -LiteralPath $statusPath){Get-Content -LiteralPath $statusPath -Raw}else{Write-Output '{"phase":"not-configured"}'}
  Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | Select-Object TaskName,State
 }
 'stop' {Stop-Service}
 'uninstall' {
  $existing=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if($existing -and $existing.Actions.Arguments.Contains($PSCommandPath)){Unregister-ScheduledTask -TaskName $taskName -Confirm:$false}
  Stop-Service
  Write-Output 'Login startup removed; database, encrypted credentials and assets preserved.'
 }
}