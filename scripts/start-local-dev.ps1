# Sobe o ControlZap em dev (porta 3003). Mata processo antigo na mesma porta.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$p = (netstat -ano 2>$null | findstr ":3003" | findstr "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
if ($p) {
  Write-Host "Encerrando processo na porta 3003 (PID $p)..."
  Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

$nodeVer = node -v 2>$null
Write-Host "Node: $nodeVer (recomendado: v20.x)"
if ($nodeVer -notmatch '^v20\.') {
  Write-Warning "Use Node 20 (engines no package.json: >=20 <21)"
}

# npm.cmd evita PSSecurityException quando ExecutionPolicy bloqueia npm.ps1
$npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }

Write-Host "Limpando cache Next..."
& $npm run clean

# Webpack dev (sem --turbo): evita "Invalid hook call" / useContext em /login após HMR longo.
$env:NEXT_DIST_DIR = ".next-local"
Write-Host "Iniciando dev em http://localhost:3003 (NEXT_DIST_DIR=.next-local) ..."
& $npm run dev -- -p 3003
