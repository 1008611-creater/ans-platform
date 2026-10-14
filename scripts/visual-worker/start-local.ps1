param([ValidateSet('preflight','start')][string]$Mode='preflight')
$ErrorActionPreference='Stop'
foreach($name in @('ANS_WORKER_SERVER','ANS_VISUAL_WORKER_KEY','ANS_WORKER_ID','ANS_WORKER_JOURNAL','ANS_TRIPO_DOWNLOAD_HOSTS','ANS_TRIPO_ALLOW_SUBMISSIONS')){
 $value=[Environment]::GetEnvironmentVariable($name,'User')
 if($value){[Environment]::SetEnvironmentVariable($name,$value,'Process')}
}
$root=Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')
Push-Location -LiteralPath $root
try{& node (Join-Path $PSScriptRoot 'start.mjs') $Mode;exit $LASTEXITCODE}finally{Pop-Location}
