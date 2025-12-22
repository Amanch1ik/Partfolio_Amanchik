#!/usr/bin/env pwsh
<#
Removes backend projects, k8s, docker files and related folders from the repository root.
Usage: Run from repository root or run this script (it will change location to repo root).
This script performs destructive actions: it uses Remove-Item -Recurse -Force.
Make a backup or review the list below before running.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

Write-Output "Working directory: $(Get-Location)"

$dirsToRemove = @(
    "yess-backend",
    "YessBackend-master",
    "Yess-go-v2",
    "Yess-Money---app-master",
    "YessLoyaltyApp",
    "unified-mobile-app",
    "panels-ts-v2",
    "panels-ts-v2",
    "panels-ts-v2",
    "panels-ts-v2" # duplicates safe to include
)

$extraDirs = @("k8s","monitoring","prometheus","nginx")

foreach ($d in $dirsToRemove + $extraDirs) {
    if (Test-Path $d) {
        Write-Output "Removing directory: $d"
        Remove-Item -LiteralPath $d -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Write-Output "Not found (skip): $d"
    }
}

# Remove docker-compose files in repo root
Get-ChildItem -Path (Get-Location) -Include 'docker-compose*.yml','docker-compose*.yaml' -File -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Output "Removing file: $($_.FullName)"
        Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }

# Remove any Dockerfile* found anywhere in the repository
Get-ChildItem -Path (Get-Location) -Filter 'Dockerfile*' -Recurse -File -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Output "Removing Dockerfile: $($_.FullName)"
        Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }

Write-Output "Cleanup script finished. Please review repository and commit changes if satisfied."


