[CmdletBinding()]
param([string]$BlenderPath,[ValidateSet(256,512,1024)][int]$Size=1024)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if (-not $BlenderPath) {
    $found=Get-Command blender -ErrorAction SilentlyContinue
    if ($found) { $BlenderPath=$found.Source }
    else {
        $tools=Join-Path $env:LOCALAPPDATA 'ArkivmuseetTools'
        if (Test-Path $tools) {
            $found=Get-ChildItem -LiteralPath $tools -Filter blender.exe -Recurse | Select-Object -First 1
            if ($found) { $BlenderPath=$found.FullName }
        }
        if (-not $BlenderPath) {
            $app=Get-AppxPackage -Name '*Blender*' | Sort-Object Version -Descending | Select-Object -First 1
            if ($app) {
                $found=Get-ChildItem -LiteralPath $app.InstallLocation -Filter blender.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) { $BlenderPath=$found.FullName }
            }
        }
    }
}
if (-not $BlenderPath -or -not (Test-Path -LiteralPath $BlenderPath)) { throw 'Blender was not found. Supply -BlenderPath with your official installation executable.' }
Write-Host 'Running the authoring script locally. Output is restricted to this project graphics-work folder.'
Write-Host 'OptiX must be available; the script stops rather than silently choosing CPU rendering.'
& $BlenderPath --background --factory-startup --python-exit-code 1 --python (Join-Path $PSScriptRoot 'bake-assets.py') -- --gpu --size $Size
if ($LASTEXITCODE -ne 0) { throw 'GPU bake failed. No drivers were installed and nothing was uploaded or published.' }
Write-Host 'The GPU bake and model export completed. Review the outputs before compressing/replacing web assets.'
