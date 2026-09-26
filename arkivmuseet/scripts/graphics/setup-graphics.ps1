<#
Approved authoring setup: official Microsoft Store or checksum-verified portable Blender.
No subscriptions, purchases, driver updates, security-policy changes or publication.
MicrosoftStore opens the official listing; it does not silently approve installation.
#>
[CmdletBinding()]
param(
    [ValidateSet('MicrosoftStore','Portable','Inspect')][string]$BlenderSource='MicrosoftStore',
    [string]$ToolsDirectory=(Join-Path $env:LOCALAPPDATA 'ArkivmuseetTools'),
    [switch]$IncludeKtx
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This setup is for Windows only.' }
if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { throw 'This package was reviewed for Windows x64.' }
$ToolsDirectory=[IO.Path]::GetFullPath($ToolsDirectory)
$homePath=[IO.Path]::GetFullPath($env:USERPROFILE).TrimEnd('\')+'\'
if (-not $ToolsDirectory.StartsWith($homePath,[StringComparison]::OrdinalIgnoreCase)) { throw 'Choose a dedicated directory inside your own user profile.' }
$existing=@(Get-Command blender -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
$store=@(Get-AppxPackage -Name '*Blender*' -ErrorAction SilentlyContinue | Select-Object Name,Version)
$gpu=@(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object Name,DriverVersion)
$memory=Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
Write-Host 'Existing Blender executable:' ($existing -join ', ')
$store | Format-Table
$gpu | Format-Table
if ($memory) { Write-Host ('System RAM: {0:N1} GB' -f ($memory.TotalPhysicalMemory/1GB)) }
Write-Host 'No purchase, subscription, driver update or cloud service is part of this setup.'
if ($BlenderSource -eq 'Inspect') { return }
if ($BlenderSource -eq 'MicrosoftStore') {
    Write-Host 'Install only the Blender Foundation listing showing Free/Get. Close it if any price appears.'
    Start-Process 'ms-windows-store://pdp/?ProductId=9PP3C07GTVRH'
    Write-Host 'The Microsoft Store was opened; this script does not claim Blender has been installed.'
    if (-not $IncludeKtx) { return }
}
$manifestPath=Join-Path $PSScriptRoot 'verified-tools.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Missing reviewed tool manifest. No downloads were made.' }
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packages=@($manifest.windows | Where-Object {
    ($BlenderSource -eq 'Portable' -and $_.file -like 'blender-*-windows-x64.zip') -or
    ($IncludeKtx -and $_.file -like 'KTX-Software-*-Windows-x64.exe')
})
if ($BlenderSource -eq 'Portable' -and -not ($packages | Where-Object { $_.file -like 'blender-*' })) { throw 'No verified portable Blender package in the manifest.' }
New-Item -ItemType Directory -Path $ToolsDirectory -Force | Out-Null
foreach ($pkg in $packages) {
    $uri=[Uri]$pkg.url
    if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('download.blender.org','github.com')) { throw 'Unexpected package host.' }
    if ($pkg.file -ne [IO.Path]::GetFileName($pkg.file) -or $pkg.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid reviewed manifest.' }
    if ([long]$pkg.bytes -gt 800MB) { throw 'Package exceeds the reviewed download ceiling.' }
    $zip=Join-Path $ToolsDirectory $pkg.file
    $target=Join-Path $ToolsDirectory ([IO.Path]::GetFileNameWithoutExtension($pkg.file))
    if (Test-Path -LiteralPath $target) { Write-Host "Already extracted: $target. Left untouched."; continue }
    if (-not (Test-Path -LiteralPath $zip)) {
        Write-Host "Downloading $($pkg.file) from the official publisher ..."
        Invoke-WebRequest -Uri $uri -OutFile ($zip+'.partial') -UseBasicParsing
        if ((Get-Item -LiteralPath ($zip+'.partial')).Length -ne [long]$pkg.bytes -or (Get-FileHash -LiteralPath ($zip+'.partial') -Algorithm SHA256).Hash -ne $pkg.sha256) {
            Remove-Item -LiteralPath ($zip+'.partial') -Force
            throw 'Size or SHA-256 mismatch. Download discarded, not installed.'
        }
        Move-Item -LiteralPath ($zip+'.partial') -Destination $zip
    }
    if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $pkg.sha256) { throw 'Existing download failed verification.' }
    if ($pkg.file.EndsWith('.exe')) {
        Write-Host "Verified official KTX installer downloaded: $zip"
        Write-Host 'It has NOT been run. Open it manually when ready to review its installation options.'
        continue
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive=[IO.Compression.ZipFile]::OpenRead($zip)
    try {
        foreach ($entry in $archive.Entries) {
            $full=[IO.Path]::GetFullPath((Join-Path $target $entry.FullName))
            if (-not $full.StartsWith($target.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive path.' }
        }
    } finally { $archive.Dispose() }
    Expand-Archive -LiteralPath $zip -DestinationPath $target
    Write-Host "Verified and extracted: $target"
}
Write-Host 'No executable was launched, and no render or publication was triggered.'
Write-Host 'Portable rollback: remove only the newly created ArkivmuseetTools directory. Store installs are removed through Windows Settings.'
