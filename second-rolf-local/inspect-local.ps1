# Read-only inventory. No installs, credential reads, firewall changes or LAN scanning.
$ErrorActionPreference = 'Stop'
$report = [ordered]@{ verifiedAt = (Get-Date).ToString('o'); commands = @{}; ollama = $null }
foreach ($name in @('hermes', 'ollama', 'docker', 'python', 'node', 'wsl')) {
    $report.commands[$name] = [bool](Get-Command $name -ErrorAction SilentlyContinue)
}
try {
    $tags = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
    $report.ollama = @($tags.models | Select-Object name, digest, size, details)
} catch {
    $report.ollama = 'No Ollama API verified at 127.0.0.1:11434. Do not infer a runner or install another model.'
}
$report | ConvertTo-Json -Depth 5
