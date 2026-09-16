Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Checked([string]$Label, [scriptblock]$Command) {
    Write-Host "`n==> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

Assert-Command node
Assert-Command pnpm

$nodeVersion = (& node --version).Trim()
$pnpmVersion = (& pnpm --version).Trim()
Write-Host "Arkivmuseet enhancement tooling installer"
Write-Host "Node: $nodeVersion"
Write-Host "pnpm: $pnpmVersion"

if ($pnpmVersion -ne '11.19.0') {
    Write-Warning "The project pins pnpm 11.19.0; current pnpm is $pnpmVersion. Installation may still work, but 11.19.0 is preferred."
}

Invoke-Checked 'Install pinned dependencies and refresh pnpm-lock.yaml' {
    pnpm install --no-frozen-lockfile
}

Invoke-Checked 'Run dependency security audit (high severity threshold)' {
    pnpm audit --audit-level high
}

Invoke-Checked 'Run Arkivmuseet tests' {
    pnpm test
}

Invoke-Checked 'Build Arkivmuseet' {
    pnpm build
}

Write-Host "`nInstalled/staged tooling:"
Write-Host '  Runtime: three-mesh-bvh, @theatre/core, xstate, postprocessing, @dimforge/rapier3d'
Write-Host '  Development: @theatre/studio, @gltf-transform/cli, tweakpane, three-bvh-csg, spectorjs'
Write-Host "`nNotes:"
Write-Host '  - Theatre Studio is development-only and is not imported into the production app.'
Write-Host '  - three-bvh-csg is experimental and is development-only until deliberately integrated.'
Write-Host '  - No Arkivmuseet runtime code is changed by this installer.'
Write-Host "`nDone. Review package.json and pnpm-lock.yaml before committing the refreshed lockfile."
