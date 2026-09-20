[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$RuntimeRoot,
    [string]$InstallationPath = (Join-Path $env:LOCALAPPDATA 'LocalModelLab\Bonsai-2-27B\installation.json'),
    [switch]$NoConnector
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$RuntimeRoot = [IO.Path]::GetFullPath($RuntimeRoot)
$privateRoot = Join-Path $RuntimeRoot '.private'
$null = New-Item -ItemType Directory -Path $privateRoot -Force
$statusPath = Join-Path $privateRoot 'bonsai-status.json'
$bridgeStatusPath = Join-Path $privateRoot 'bridge-status.json'
$pausedPath = Join-Path $RuntimeRoot '.paused'
$apiRoot = Split-Path -Parent $PSScriptRoot
$connectorPath = Join-Path $PSScriptRoot 'connector.mjs'
$created = $false
$mutex = [Threading.Mutex]::new($true, 'Local\SecondRolfPC', [ref]$created)
if (-not $created) { $mutex.Dispose(); exit }
$server = $null
$bridge = $null
$bridgeOwnershipChecked = $false
$env:SECOND_ROLF_CONFIG = Join-Path $privateRoot 'config.json'
$env:SECOND_ROLF_MODEL_STATUS = $statusPath
$env:SECOND_ROLF_BRIDGE_STATUS = $bridgeStatusPath
$node = $null
$utf8 = New-Object Text.UTF8Encoding($false)

function Write-Status($value) {
    $temporary = $statusPath + '.tmp'
    [IO.File]::WriteAllText($temporary, ($value | ConvertTo-Json -Depth 6), $utf8)
    Move-Item -LiteralPath $temporary -Destination $statusPath -Force
}
function Write-BridgeStatus($value) {
    $temporary = $bridgeStatusPath + '.tmp'
    [IO.File]::WriteAllText($temporary, ($value | ConvertTo-Json -Depth 6), $utf8)
    Move-Item -LiteralPath $temporary -Destination $bridgeStatusPath -Force
}
function Known-Process($state) {
    if (-not $state -or -not $state.processId -or -not $state.startTicks -or -not $state.executable) { return $null }
    try {
        $candidate = Get-Process -Id ([int]$state.processId) -ErrorAction Stop
        if ($candidate.Path -eq $state.executable -and [string]$candidate.StartTime.ToUniversalTime().Ticks -eq [string]$state.startTicks) { return $candidate }
    } catch {}
    return $null
}
function Native-Arguments($values) {
    # All executable arguments are fixed switches, integers or verified Windows file paths.
    return (($values | ForEach-Object {
        $text = [string]$_
        if ($text -match '["\r\n\x00]') { throw 'Invalid native process argument.' }
        '"' + [regex]::Replace($text, '(\\+)$', '$1$1') + '"'
    }) -join ' ')
}
function Stop-Bridge {
    if ($script:bridge) {
        try {
            if (-not $script:bridge.HasExited) {
                try { Stop-Process -InputObject $script:bridge -ErrorAction Stop }
                catch { if (-not $script:bridge.HasExited) { throw } }
                if (-not $script:bridge.WaitForExit(5000)) { throw 'The owned connector did not exit.' }
            }
        } catch { throw }
        $script:bridge.Dispose()
    }
    $script:bridge = $null
    if ($script:bridgeOwnershipChecked) { Write-BridgeStatus @{ processId=0 } }
}
function Known-Bridge($state, $candidate) {
    if ($state.executable -ne $node -or $state.startTicks -isnot [string]) { return $null }
    $savedConnector = [IO.Path]::GetFullPath([string]$state.connectorPath)
    $savedConfig = [IO.Path]::GetFullPath([string]$state.configPath)
    if ($savedConfig -ne $env:SECOND_ROLF_CONFIG) { return $null }
    $releaseRoot = (Join-Path $RuntimeRoot 'releases').TrimEnd('\') + '\'
    $allowedRelease = $savedConnector.StartsWith($releaseRoot, [StringComparison]::OrdinalIgnoreCase) -and $savedConnector -match '\\second-rolf-api\\local\\connector\.mjs$'
    if ($savedConnector -ne $connectorPath -and -not $allowedRelease) { return $null }
    if (-not (Test-Path -LiteralPath $savedConnector -PathType Leaf)) { return $null }
    # Saved labels alone cannot authorize stopping another node.exe. Confirm the
    # exact live command line in addition to its executable and start time.
    if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
        Import-Module (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\Modules\CimCmdlets\CimCmdlets.psd1') -ErrorAction Stop
    }
    $live = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$candidate.Id) -ErrorAction Stop
    if (-not $live -or $live.ExecutablePath -ne $state.executable) { return $null }
    $arguments = Native-Arguments @($savedConnector, $savedConfig)
    $quoted = (Native-Arguments @($state.executable)) + ' ' + $arguments
    $unquoted = [string]$state.executable + ' ' + $arguments
    $commandLine = ([string]$live.CommandLine).Trim()
    if ($commandLine -ne $quoted -and $commandLine -ne $unquoted) { return $null }
    return $candidate
}
function Recover-Bridge {
    if (Test-Path -LiteralPath $bridgeStatusPath) {
        $oldBridge = Get-Content -LiteralPath $bridgeStatusPath -Raw | ConvertFrom-Json
        if ($oldBridge.processId) {
            $candidate = Known-Process $oldBridge
            if ($candidate) {
                $ownedBridge = Known-Bridge $oldBridge $candidate
                if (-not $ownedBridge) { throw 'A live saved connector could not be verified; no process was stopped and no duplicate connector will start.' }
                $script:bridge = $ownedBridge
            }
        }
    }
    $script:bridgeOwnershipChecked = $true
    Stop-Bridge
}
function Stop-Server {
    if ($script:server) {
        try {
            if (-not $script:server.HasExited) {
                Stop-Process -InputObject $script:server -ErrorAction SilentlyContinue
                $null = $script:server.WaitForExit(5000)
            }
        } finally { $script:server.Dispose() }
    }
    $script:server = $null
}
function Test-ChatPortInUse {
    # Unlike Get-NetTCPConnection, this read does not require CIM access.
    $netstat = Join-Path $env:SystemRoot 'System32\netstat.exe'
    $listeners = @(& $netstat -ano -p tcp)
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect local TCP listeners.' }
    return [bool]($listeners -match '^\s*TCP\s+\S+:8099\s+\S+\s+LISTENING\s+\d+\s*$')
}
function File-Sha256([string]$file) {
    # Stream large GGUF files and avoid PSModulePath differences between PS7 and PS5.
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try {
        $stream = [IO.File]::OpenRead($file)
        try { return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-','').ToLowerInvariant() }
        finally { $stream.Dispose() }
    } finally { $algorithm.Dispose() }
}
function Read-Installation {
    $cfg = Get-Content -LiteralPath $InstallationPath -Raw | ConvertFrom-Json
    if ($cfg.ModelRepo -ne 'prism-ml/Ternary-Bonsai-2-27B-gguf' -or $cfg.ModelRevision -ne '6ed5e12bf84b7a63069882c91dd9e9218647d17b' -or $cfg.RuntimeRelease -ne 'prism-b10683-d8f26ee' -or $cfg.Cuda -ne '12.4') { throw 'Unexpected Bonsai installation version.' }
    if ((Split-Path -Leaf $cfg.Executable) -ne 'llama-server.exe' -or -not (Test-Path -LiteralPath $cfg.Executable -PathType Leaf)) { throw 'Missing PrismML runtime.' }
    foreach ($file in @($cfg.Executable, $cfg.Weights.Path, $cfg.Vision.Path)) {
        if ($file -notmatch '^[A-Za-z]:[\\/]' -or $file -match '["\r\n\x00]') { throw 'Bonsai runtime and models must use absolute local Windows paths.' }
    }
    $cfg.Executable = [IO.Path]::GetFullPath($cfg.Executable)
    $cfg.RuntimeDir = [IO.Path]::GetFullPath($cfg.RuntimeDir)
    if ($cfg.RuntimeDir.TrimEnd('\') -ne (Split-Path -Parent $cfg.Executable).TrimEnd('\')) { throw 'Unexpected PrismML runtime directory.' }
    $expected = @(
        @{ File=$cfg.Weights.Path; Size=[long]7206168928; Hash='3907dc1658db1f78a9826bf8d5bcb8dc65db0d466388937af57f2294fae62ec1' },
        @{ File=$cfg.Vision.Path; Size=[long]629246976; Hash='6807ede61d570bb86ba34b756a0fa109edc33668604de867c6ea6d8f1d631903' }
    )
    foreach ($item in $expected) {
        if (-not (Test-Path -LiteralPath $item.File -PathType Leaf) -or [long](Get-Item -LiteralPath $item.File).Length -ne $item.Size) { throw 'Bonsai model file is missing or incomplete.' }
        if ((File-Sha256 $item.File) -ne $item.Hash) { throw 'Bonsai model checksum mismatch.' }
    }
    return $cfg
}
try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    Recover-Bridge
    $cfg = Read-Installation
    # A previous supervisor can leave its own server behind after an interrupted shutdown.
    # PID alone is never sufficient: require the executable and exact start time as well.
    if (Test-Path -LiteralPath $statusPath) {
        try {
            $old = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
            $owned = Known-Process $old
            if ($owned -and $old.model -eq 'Bonsai-2-27B-PQ2_0' -and $old.executable -eq $cfg.Executable) {
                Stop-Process -InputObject $owned
                $null = $owned.WaitForExit(5000)
            }
        } catch {}
    }
    while (-not (Test-Path -LiteralPath $pausedPath)) {
        try {
            if (-not $server -or $server.HasExited) {
                Stop-Bridge
                Stop-Server
                Write-Status @{ model='Bonsai-2-27B-PQ2_0'; processId=0; gpuLayers=0; totalLayers=65 }
                # Never take over or kill an unrelated listener on the chat port.
                if (Test-ChatPortInUse) { throw 'Port 8099 is already in use. Stop the separately launched Bonsai session first.' }
                $stdout = Join-Path $privateRoot 'bonsai-server.log'
                $stderr = Join-Path $privateRoot 'bonsai-server-errors.log'
                $arguments = @('-m',$cfg.Weights.Path,'--mmproj',$cfg.Vision.Path,
                    '--host','127.0.0.1','--port','8099','--alias','Bonsai-2-27B-PQ2_0',
                    '--log-verbosity','4','--cors-origins','localhost',
                    '-ngl','99','-fa','on','-c','8192','-np','1','-b','512','-ub','256',
                    '--jinja','--temp','1.0','--top-p','0.95','--top-k','20','--min-p','0',
                    '--repeat-penalty','1.0','--reasoning-budget','2048')
                $server = Start-Process -FilePath $cfg.Executable -ArgumentList (Native-Arguments $arguments) -WorkingDirectory $cfg.RuntimeDir -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
                $state = @{ model='Bonsai-2-27B-PQ2_0'; processId=$server.Id; executable=$cfg.Executable; startTicks=[string]$server.StartTime.ToUniversalTime().Ticks; gpuLayers=0; totalLayers=65 }
                Write-Status $state
                $ready = $false
                for ($attempt=0; $attempt -lt 150; $attempt++) {
                    if (Test-Path -LiteralPath $pausedPath) { break }
                    $server.Refresh()
                    if ($server.HasExited) { throw 'Bonsai exited while loading.' }
                    try { if ((Invoke-RestMethod 'http://127.0.0.1:8099/health' -TimeoutSec 2).status -eq 'ok') { $ready=$true; break } } catch {}
                    Start-Sleep -Seconds 2
                }
                if (-not $ready) { throw 'Bonsai did not become ready.' }
                $log = Get-Content -LiteralPath $stderr -Raw
                if ($log -notmatch 'offloaded 65/65 layers to GPU') { throw 'Bonsai did not load all 65 layers on the GPU.' }
                $state.gpuLayers=65
                Write-Status $state
                & $node (Join-Path $PSScriptRoot 'doctor.mjs') --local-only
                if ($LASTEXITCODE -ne 0) { throw 'Bonsai failed the local answer/GPU check.' }
                Write-Output 'Bonsai ready: local GPU, 65/65 layers, context 8192.'
            }
            if (Test-Path -LiteralPath $pausedPath) { break }
            if (-not $NoConnector -and (-not $bridge -or $bridge.HasExited)) {
                Stop-Bridge
                $bridge = Start-Process -FilePath $node -ArgumentList (Native-Arguments @($connectorPath,$env:SECOND_ROLF_CONFIG)) -WorkingDirectory $apiRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $privateRoot 'connection.log') -RedirectStandardError (Join-Path $privateRoot 'connection-errors.log')
                Write-BridgeStatus @{ processId=$bridge.Id; executable=$node; startTicks=[string]$bridge.StartTime.ToUniversalTime().Ticks; connectorPath=$connectorPath; configPath=$env:SECOND_ROLF_CONFIG }
            }
            Start-Sleep -Seconds 5
        } catch {
            Stop-Bridge
            Stop-Server
            Write-Status @{ model='Bonsai-2-27B-PQ2_0'; processId=0; gpuLayers=0; totalLayers=65 }
            # Status-only diagnostics; visitor prompts/replies and connector credentials are never logged here.
            Write-Warning $_.Exception.Message
            Start-Sleep -Seconds 15
        }
    }
} finally {
    try {
        try { Stop-Bridge } finally { Stop-Server }
        Write-Status @{ model='Bonsai-2-27B-PQ2_0'; processId=0; gpuLayers=0; totalLayers=65 }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}
