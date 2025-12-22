#!/usr/bin/env pwsh
<#
Start both panel frontends (admin-panel and partner-panel) in separate PowerShell windows.
Usage (from repo root):
  pwsh .\scripts\start_panels.ps1
This script will:
 - run `npm install` in each panel if node_modules is missing
 - open two new PowerShell windows and run `npm run dev` for each panel
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

function Ensure-Installed {
    param($path)
    if (-not (Test-Path (Join-Path $path "node_modules"))) {
        Write-Output "Installing dependencies in $path..."
        Push-Location $path
        npm install
        Pop-Location
    } else {
        Write-Output "node_modules exists in $path — skipping install."
    }
}

$panels = @(
    @{ Name = "admin-panel"; Path = (Join-Path (Get-Location) "admin-panel"); Script = "npm run dev" },
    @{ Name = "partner-panel"; Path = (Join-Path (Get-Location) "partner-panel"); Script = "npm run dev" }
)

foreach ($p in $panels) {
    if (-not (Test-Path $p.Path)) {
        Write-Output "Panel not found: $($p.Name) at $($p.Path) — skipping."
        continue
    }
    Ensure-Installed -path $p.Path
    $cmd = "cd `"$($p.Path)`"; $($p.Script)"
    Write-Output "Starting $($p.Name) in a new PowerShell window..."
    # Try to start in PowerShell Core (pwsh) if available, otherwise use Windows PowerShell
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        Start-Process pwsh -ArgumentList "-NoExit","-Command",$cmd
    } else {
        Start-Process powershell -ArgumentList "-NoExit","-Command",$cmd
    }
}

Write-Output "Start commands issued. Check the new windows for server logs."


