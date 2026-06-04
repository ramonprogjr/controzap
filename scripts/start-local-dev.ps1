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

Write-Host "Limpando cache Next..."
npm run clean

Write-Host "Iniciando dev:turbo em http://localhost:3003 ..."
npm run dev:turbo -- -p 3003
