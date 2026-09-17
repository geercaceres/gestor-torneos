$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  $nodePath = $nodeCommand.Source
} else {
  $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Instalá Node.js 24 antes de ejecutar este archivo.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'dist-web/index.html'))) { throw 'Falta compilar la web: ejecutá npm ci y npm run build:gcp.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath '.env'))) {
  & $nodePath (Join-Path $projectPath 'scripts/setup.mjs') --access-file (Join-Path $projectPath '../ACCESO-LOCAL.txt')
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar el administrador.' }
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
  Write-Host 'Servidor local iniciado. Si no abre, revisá data/server-error.log.'
} else { Write-Host 'El servidor local ya está disponible.' }
Start-Process 'http://localhost:3001'
Write-Host 'Administración: http://localhost:3001/admin'
Write-Host 'Credenciales: ACCESO-LOCAL.txt, al lado de esta carpeta.'
