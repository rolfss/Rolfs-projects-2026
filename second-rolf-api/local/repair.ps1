[CmdletBinding()]
param(
    [string]$ConfigPath = $env:SECOND_ROLF_CONFIG,
    [switch]$DeployWorker
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$apiRoot = Split-Path -Parent $PSScriptRoot
$workerOrigin = 'https://second-rolf-api.rolfsselas.workers.dev'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

function Read-ConnectorConfigPath([string]$CommandLine) {
    if (-not $CommandLine) { return $null }
    $match = [regex]::Match($CommandLine, '(?i)(?:"[^"]*connector\.mjs"|\S*connector\.mjs)\s+(?:"([^"]+\.json)"|(\S+\.json))')
    if (-not $match.Success) { return $null }
    $candidate = $match.Groups[1].Value
    if (-not $candidate) { $candidate = $match.Groups[2].Value }
    if (-not [IO.Path]::IsPathRooted($candidate)) { $candidate = Join-Path $apiRoot $candidate }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $null }
    try {
        $config = Get-Content -LiteralPath $candidate -Raw | ConvertFrom-Json
        if ($config.workerUrl.TrimEnd('/') -ne $workerOrigin) { return $null }
        return (Resolve-Path -LiteralPath $candidate).Path
    } catch { return $null }
}

# Discover only a running connector's explicitly named JSON config. Do not scan private folders.
$processes = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue)
if (-not $ConfigPath) {
    $paths = @($processes | ForEach-Object { Read-ConnectorConfigPath $_.CommandLine } | Where-Object { $_ } | Select-Object -Unique)
    if ($paths.Count -eq 1) { $ConfigPath = $paths[0] }
}
if (-not $ConfigPath) {
    $ConfigPath = Read-Host 'Path to the existing private Second Rolf JSON config (NOT the secret key)'
}
$ConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
if ($config.workerUrl.TrimEnd('/') -ne $workerOrigin -or $config.key.Length -lt 40) {
    throw 'This is not a valid private Second Rolf connector config. Do not paste secrets into chat or GitHub.'
}
$major = [int](& $node -p 'process.versions.node.split(".")[0]')
if ($major -lt 22) { throw 'Node.js 22 or later is required.' }

Push-Location $apiRoot
try {
    & $npm ci --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed; existing connector was not stopped.' }
    & $npm run check
    if ($LASTEXITCODE -ne 0) { throw 'Source validation failed; existing connector was not stopped.' }

    if ($DeployWorker) {
        & $npm run deploy
        if ($LASTEXITCODE -ne 0) { throw 'Worker deployment failed. Sign in using npx wrangler login, then rerun. Existing connector was not stopped.' }
    }

    $env:OLLAMA_HOST = '127.0.0.1:11434'
    $env:OLLAMA_NO_CLOUD = '1'
    $env:OLLAMA_NUM_PARALLEL = '1'
    $env:OLLAMA_CONTEXT_LENGTH = '8192'
    $env:OLLAMA_FLASH_ATTENTION = '1'
    $env:OLLAMA_KV_CACHE_TYPE = 'q8_0'
    $env:SECOND_ROLF_CONFIG = $ConfigPath
    $ollamaReady = $false
    try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 3; $ollamaReady = $true } catch {}
    if (-not $ollamaReady) {
        $ollama = (Get-Command ollama.exe -ErrorAction Stop).Source
        $null = Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Minimized -PassThru
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; $ollamaReady = $true; break } catch {}
        }
    }
    if (-not $ollamaReady) { throw 'Ollama did not start. No existing connector was stopped.' }
    & $node local/doctor.mjs --local-only
    if ($LASTEXITCODE -ne 0) { throw 'Local Ministral did not answer. Ensure ollama pull ministral-3:14b has completed. No existing connector was stopped.' }

    # Restart only connectors using this exact, validated config. Never stop unrelated Node/Ollama processes.
    foreach ($process in $processes) {
        $oldConfig = Read-ConnectorConfigPath $process.CommandLine
        if ($oldConfig -and $oldConfig -eq $ConfigPath) {
            Stop-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
        }
    }
    $connector = Join-Path $PSScriptRoot 'connector.mjs'
    $started = Start-Process -FilePath $node -ArgumentList @(('"' + $connector + '"'), ('"' + $ConfigPath + '"')) -WorkingDirectory $apiRoot -WindowStyle Minimized -PassThru
    Write-Host ('Started updated Second Rolf connector, process ' + $started.Id + '. Checking public readiness...')
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 3
        try {
            $health = Invoke-RestMethod ($workerOrigin + '/api/second-rolf/health') -TimeoutSec 6
            $expected = & $node --input-type=module -e 'import { PROFILE_REVISION } from "./protocol.mjs"; console.log(PROFILE_REVISION)'
            if ($health.available -eq $true -and $health.model -eq 'ministral-3:14b' -and $health.profileRevision -eq $expected) {
                & $node local/doctor.mjs --public-only
                if ($LASTEXITCODE -eq 0) { Write-Host 'Public readiness confirmed. Reload the page and complete its security check.'; return }
            }
        } catch {}
    }
    & $node local/doctor.mjs --public-only
    throw 'The updated connector was started, but public chat is not confirmed ready. Check the diagnostic above. If the Worker is old, rerun with -DeployWorker. Check that an old startup task is not relaunching another connector copy.'
} finally { Pop-Location }
