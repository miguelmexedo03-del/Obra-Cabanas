# Aplica o seed 0002_seed_checklist.sql ao Supabase via Management API.
# Corre: pwsh -File scripts/apply-seed.ps1
# (ou: PowerShell -File scripts/apply-seed.ps1)

param(
    [string]$ProjectId = "larfdydhlbqupmllxunq"
)

# Extrair access token da config do Claude Code (sem expor no output)
$claudeConfig = Get-Content "$env:USERPROFILE\.claude.json" -Raw | ConvertFrom-Json
$accessToken = $claudeConfig.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN

if (-not $accessToken) {
    Write-Error "Nao foi possivel encontrar o SUPABASE_ACCESS_TOKEN em ~/.claude.json"
    exit 1
}

$apiBase = "https://api.supabase.com/v1/projects/$ProjectId/database/query"
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}

# Ler seed file
$seedPath = Join-Path $PSScriptRoot "..\supabase\migrations\0002_seed_checklist.sql"
$fullSql = Get-Content $seedPath -Raw -Encoding UTF8

# Remover begin/commit e dividir em blocos por ponto-e-virgula no fim de linha
$cleaned = $fullSql -replace '(?m)^\s*begin;\s*$', '' -replace '(?m)^\s*commit;\s*$', ''

# Separar os blocos: cada INSERT é terminado por ';' no fim de uma linha
$blocks = [System.Collections.Generic.List[string]]::new()
$current = [System.Text.StringBuilder]::new()
$depth = 0

foreach ($char in $cleaned.ToCharArray()) {
    [void]$current.Append($char)
    if ($char -eq '(') { $depth++ }
    elseif ($char -eq ')') { $depth-- }
    elseif ($char -eq ';' -and $depth -eq 0) {
        $block = $current.ToString().Trim()
        if ($block.Length -gt 5) { $blocks.Add($block) }
        [void]$current.Clear()
    }
}

# Filtrar so elementos (divisoes ja estao aplicadas)
$elementoBlocks = $blocks | Where-Object { $_ -match '(?i)^insert into elementos' }

Write-Host "Encontrados $($elementoBlocks.Count) blocos de elementos."

$i = 0
foreach ($block in $elementoBlocks) {
    $i++
    $body = @{ query = $block } | ConvertTo-Json -Depth 2

    try {
        $response = Invoke-RestMethod -Uri $apiBase -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "  [$i/$($elementoBlocks.Count)] OK"
    }
    catch {
        Write-Warning "  [$i/$($elementoBlocks.Count)] ERRO: $($_.Exception.Message)"
        Write-Warning "  Primeiros 200 chars do bloco: $($block.Substring(0, [Math]::Min(200, $block.Length)))"
    }
}

Write-Host ""
Write-Host "Seed concluido! A verificar contagem..."

$verifyBody = @{ query = "SELECT COUNT(*) as total FROM elementos;" } | ConvertTo-Json
$result = Invoke-RestMethod -Uri $apiBase -Method Post -Headers $headers -Body $verifyBody
Write-Host "Total de elementos na BD: $($result[0].total)"
