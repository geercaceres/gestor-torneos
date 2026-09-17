$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  $nodePath = $nodeCommand.Source
} else {
  $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 24 before running this script.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'dist-web/index.html'))) { throw 'The web build is missing. Run npm ci and npm run build:gcp.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath '.env'))) {
  & $nodePath (Join-Path $projectPath 'scripts/setup.mjs') --access-file (Join-Path $projectPath '../LOCAL-ACCESS.txt')
  if ($LASTEXITCODE -ne 0) { throw 'Could not configure the administrator account.' }
}
$env:PUBLIC_ORIGIN = 'http://localhost:3001'
$env:PORT = '3001'
$env:HOST = '127.0.0.1'
$env:NODE_ENV = 'development'
$dataPath = Join-Path $projectPath 'data'
New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
$existing = $null
try { $existing = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -TimeoutSec 2 } catch {}
if (-not $existing.ok) {
  $serverProcess = Start-Process -FilePath $nodePath -ArgumentList @('server/server.mjs') -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log')
  Set-Content -LiteralPath (Join-Path $dataPath 'server.pid') -Value $serverProcess.Id
  Write-Host 'Local server started. If it does not open, check data/server-error.log.'
} else { Write-Host 'The local server is already available.' }
Start-Process 'http://localhost:3001'
Write-Host 'Administration: http://localhost:3001/admin'
Write-Host 'Credentials: LOCAL-ACCESS.txt, next to this folder.'
