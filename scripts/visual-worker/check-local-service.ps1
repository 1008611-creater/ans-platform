[CmdletBinding()]
param([string]$StateDirectory=(Join-Path $env:LOCALAPPDATA 'ANS/local-3d-service'))
$ErrorActionPreference='Stop'
$statePath=Join-Path $StateDirectory 'status.json'
$config=Import-Clixml -LiteralPath (Join-Path $StateDirectory 'config.clixml')
$launcher=Join-Path $config.root 'scripts/visual-worker/local-service.ps1'
$psExe=Join-Path $PSHOME 'powershell.exe'
$base='http://127.0.0.1:'+ $config.port
$checks=New-Object 'Collections.Generic.List[object]'
function Assert($condition,[string]$name){if(!$condition){throw ('CHECK_FAILED: '+$name)};$checks.Add(@{name=$name;passed=$true});Write-Output ($name+': passed')}
function Read-State {return Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json}
function Wait-State([scriptblock]$predicate,[int]$seconds=45){
 $deadline=(Get-Date).AddSeconds($seconds)
 do{$current=Read-State;if(&$predicate $current){return $current};Start-Sleep -Seconds 2}while((Get-Date) -lt $deadline)
 throw 'RECOVERY_CHECK_TIMED_OUT'
}
function Kill-Owned([int]$processId,[int]$parentId,[string]$commandFragment){
 $target=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$processId)
 if(!$target -or $target.ParentProcessId -ne $parentId -or !$target.CommandLine.Contains($commandFragment)){throw 'PROCESS_OWNERSHIP_MISMATCH'}
 Stop-Process -Id $processId -ErrorAction Stop
}
function Database-Counts {
 $env:PGPASSWORD=[Net.NetworkCredential]::new('', $config.databasePassword).Password
 try{
  $value=& (Join-Path $config.postgresBin 'psql.exe') -w -h 127.0.0.1 -p $config.databasePort -U ans_local -d ans_local_3d -Atc 'SELECT (SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL),(SELECT COUNT(*) FROM visual_model_jobs),(SELECT COUNT(*) FROM visual_four_view_jobs)'
  if($LASTEXITCODE -ne 0){throw 'DATABASE_CHECK_FAILED'}
  return $value.Split('|')
 }finally{Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue}
}
try{
 $counts=Database-Counts
 Assert (([int]$counts[1] -eq 0) -and ([int]$counts[2] -eq 0)) 'empty-paid-task-queues'
 Assert ([int]$counts[0] -eq (Get-ChildItem -LiteralPath (Join-Path $config.root 'prisma/migrations') -Directory).Count) 'all-migrations-applied'
 $initial=Wait-State {param($s) $s.phase -eq 'running' -and $s.appPid -and $s.workerPid}
 $health=Invoke-RestMethod -Uri ($base+'/api/health') -TimeoutSec 10
 Assert ($health.status -eq 'healthy' -and $health.database -eq 'connected') 'website-database-health'
 $model=Invoke-RestMethod -Uri ($base+'/api/visual-model-jobs/config') -TimeoutSec 10
 Assert ($model.data.available -eq $true -and $model.data.flatCostPoints -eq 10) 'modeling-enabled-at-10-points'
 $four=Invoke-RestMethod -Uri ($base+'/api/visual-four-view-jobs/config') -TimeoutSec 10
 Assert ($four.data.available -eq $false) 'four-view-remains-disabled'
 $page=Invoke-WebRequest -UseBasicParsing -Uri ($base+'/market/resume-website') -TimeoutSec 15
 Assert ($page.StatusCode -eq 200) 'portfolio-editor-page'
 $asset=Invoke-WebRequest -UseBasicParsing -Uri ($base+'/visual-portfolio/scene.mjs') -TimeoutSec 10
 Assert ($asset.StatusCode -eq 200) 'public-renderer-asset'
 $scriptMatch=[regex]::Match($page.Content,'(?:src|href)="(/_next/static/[^"?]+\.js)')
 Assert ($scriptMatch.Success) 'static-script-reference'
 $static=Invoke-WebRequest -UseBasicParsing -Uri ($base+$scriptMatch.Groups[1].Value) -TimeoutSec 10
 Assert ($static.StatusCode -eq 200) 'static-script-served'
 try{Invoke-WebRequest -UseBasicParsing -Uri ($base+'/api/visual-worker/claim') -Method Post -ContentType 'application/json' -Body '{"workerId":"unauthorized-check"}' -TimeoutSec 10|Out-Null;throw 'UNAUTHORIZED_REQUEST_ACCEPTED'}catch [Net.WebException]{Assert ([int]$_.Exception.Response.StatusCode -eq 401) 'worker-api-requires-secret'}
 $workerLog=Get-Content -LiteralPath (Join-Path $StateDirectory 'logs/worker.out.log') -Raw
 Assert ($workerLog.Contains('"authenticated":true') -and $workerLog.Contains('Local task service ready.')) 'upstream-authenticated-worker-ready'
 & $psExe -NoProfile -NonInteractive -File $launcher -Mode start
 Assert ((Read-State).supervisorPid -eq $initial.supervisorPid) 'single-supervisor'
 $before=Read-State
 Kill-Owned $before.workerPid $before.supervisorPid 'scripts/visual-worker/start.mjs'
 $after=Wait-State {param($s) $s.workerPid -and $s.workerPid -ne $before.workerPid -and $s.supervisorPid -eq $before.supervisorPid}
 Assert ($after.workerPid -ne $before.workerPid) 'worker-exit-recovery'
 $before=Read-State
 Kill-Owned $before.appPid $before.supervisorPid 'server.js'
 $after=Wait-State {param($s) $s.phase -eq 'running' -and $s.appPid -ne $before.appPid -and $s.workerPid -and $s.workerPid -ne $before.workerPid}
 Assert ($after.appPid -ne $before.appPid) 'website-exit-recovery'
 $before=Read-State
 $supervisor=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$before.supervisorPid)
 if(!$supervisor.CommandLine.Contains($launcher)){throw 'SUPERVISOR_OWNERSHIP_MISMATCH'}
 Stop-Process -Id $before.supervisorPid
 Start-Sleep -Seconds 3
 Assert (!(Get-Process -Id $before.appPid,$before.workerPid -ErrorAction SilentlyContinue)) 'supervisor-exit-reaps-owned-children'
 $after=Wait-State {param($s) $s.phase -eq 'running' -and $s.supervisorPid -ne $before.supervisorPid -and $s.appPid -and $s.workerPid} 100
 Assert ($after.supervisorPid -ne $before.supervisorPid) 'scheduled-supervisor-recovery'
 & $psExe -NoProfile -NonInteractive -File $launcher -Mode stop
 if($LASTEXITCODE -ne 0){throw 'STOP_COMMAND_FAILED'}
 Assert ((Read-State).phase -eq 'stopped') 'manual-stop'
 & (Join-Path $config.postgresBin 'pg_ctl.exe') status -D (Join-Path $StateDirectory 'postgres') *> $null
 Assert ($LASTEXITCODE -ne 0) 'owned-database-stopped'
 & $psExe -NoProfile -NonInteractive -File $launcher -Mode start
 if($LASTEXITCODE -ne 0){throw 'START_COMMAND_FAILED'}
 $after=Wait-State {param($s) $s.phase -eq 'running' -and $s.appPid -and $s.workerPid} 60
 $health=Invoke-RestMethod -Uri ($base+'/api/health') -TimeoutSec 10
 Assert ($health.status -eq 'healthy') 'cold-start-including-database'
 $counts=Database-Counts
 Assert (([int]$counts[1] -eq 0) -and ([int]$counts[2] -eq 0)) 'no-paid-tasks-created'
 $task=Get-ScheduledTask -TaskName 'ANS Local 3D Service'
 Assert ($task.Settings.Enabled -and $task.Triggers[0].CimClass.CimClassName -eq 'MSFT_TaskLogonTrigger' -and $task.Principal.RunLevel -eq 'Limited') 'login-trigger-without-elevation'
 $evidence=@{completedAt=[DateTime]::UtcNow.ToString('o');checks=$checks.ToArray();migrations=[int]$counts[0];liveStatus=$after;paidTasksSubmitted=0;actualWindowsReloginTested=$false}
 [IO.File]::WriteAllText((Join-Path $StateDirectory 'verification.json'),($evidence|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
 Write-Output ('Completed '+$checks.Count+' service checks. No paid tasks submitted.')
}finally{
 Enable-ScheduledTask -TaskName 'ANS Local 3D Service'|Out-Null
 $current=Read-State
 if($current.phase -ne 'running' -or !(Get-Process -Id $current.supervisorPid -ErrorAction SilentlyContinue)){Start-ScheduledTask -TaskName 'ANS Local 3D Service'}
}