#!/usr/bin/env pwsh
<#
Keeps only panel frontends in the repository and removes all other top-level items.
Keep list (allowlist) can be adjusted in the $keep array below.
This script is destructive. It shows what will be removed and asks for confirmation.
Usage: run from repository root: `pwsh .\scripts\keep_panels_only.ps1`
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

Write-Output "Repository root: $(Get-Location)"

$keep = @(
    "admin-panel",
    "partner-panel",
    "panels-ts-v2",
    "README.md",
    "LICENSE",
    "scripts",
    ".git",
    ".gitignore",
    ".gitattributes"
)

Write-Output "Allowlist (kept items):"
$keep | ForEach-Object { Write-Output "  - $_" }

$allTopLevel = Get-ChildItem -Force -LiteralPath (Get-Location) | Where-Object { $_.Name -ne '.' -and $_.Name -ne '..' }
$toRemove = $allTopLevel | Where-Object { -not ($keep -contains $_.Name) }

if (-not $toRemove) {
    Write-Output "Nothing to remove. Repository already minimal."
    exit 0
}

Write-Output "`nItems that WILL BE REMOVED:"
$toRemove | ForEach-Object { Write-Output "  - $($_.Name)" }

$confirm = Read-Host "`nType 'yes' to proceed with deletion, anything else will abort"
if ($confirm -ne 'yes') {
    Write-Output "Aborted by user. No changes made."
    exit 1
}

foreach ($item in $toRemove) {
    try {
        if ($item.PSIsContainer) {
            Write-Output "Removing directory: $($item.Name)"
            Remove-Item -LiteralPath $item.FullName -Recurse -Force -ErrorAction Stop
        } else {
            Write-Output "Removing file: $($item.Name)"
            Remove-Item -LiteralPath $item.FullName -Force -ErrorAction Stop
        }
    } catch {
        Write-Output "Failed to remove $($item.FullName): $($_.Exception.Message)"
    }
}

Write-Output "`nCleanup complete. Review repository and commit desired changes."


