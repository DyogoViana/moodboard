# ==========================================================================
# organizar-projeto.ps1 — limpa arquivos e pastas acumulados no projeto.
#
# Segue o protocolo: nada é apagado sem você ver a lista antes e confirmar
# uma vez. Não mexe em nenhum código-fonte (.html/.css/.js) — só em
# arquivos soltos, backups e scripts órfãos de rodadas anteriores.
#
# USO: de dentro da pasta scripts do projeto:
#   .\organizar-projeto.ps1
# ==========================================================================

$raiz = Split-Path -Parent $PSScriptRoot

if (-Not (Test-Path (Join-Path $raiz "index.html"))) {
    Write-Host "[ERRO] Não parece ser a pasta do projeto (sem index.html): $raiz" -ForegroundColor Red
    return
}

Write-Host "[1/3] Levantando o que existe em: $raiz" -ForegroundColor Cyan

# ---- 1. backups grandes que deveriam morar fora do projeto ----
$pastaBackups = Join-Path $raiz "backups"
$backupsGrandes = @()
if (Test-Path $pastaBackups) {
    $backupsGrandes = Get-ChildItem $pastaBackups -Filter "*.json" -ErrorAction SilentlyContinue
}

# ---- 2. arquivos/pastas órfãos conhecidos, de rodadas anteriores ----
$candidatosRemocao = @()
$nomesConhecidos = @(
    "scripts\analisar-projeto.ps1",
    "scripts\implementar_os_deepseek.py",
    "scripts\os-deepseek-vscode-automation.zip",
    "scripts\remover-duplicata.ps1",
    "index.html.antes-fix.bak"
)
foreach ($nome in $nomesConhecidos) {
    $caminho = Join-Path $raiz $nome
    if (Test-Path $caminho) { $candidatosRemocao += $caminho }
}
# qualquer pasta Backup_* solta na raiz do projeto (o problema da pasta recursiva já visto antes)
$pastasBackupSoltas = Get-ChildItem $raiz -Directory -Filter "Backup_*" -ErrorAction SilentlyContinue
foreach ($p in $pastasBackupSoltas) { $candidatosRemocao += $p.FullName }
# zips antigos soltos direto na raiz do projeto (não deveriam estar aqui, só em Downloads)
$zipsSoltos = Get-ChildItem $raiz -File -Filter "*.zip" -ErrorAction SilentlyContinue
foreach ($z in $zipsSoltos) { $candidatosRemocao += $z.FullName }
# arquivos de relatório/análise que já cumpriram a função
$relatoriosAntigos = Get-ChildItem $raiz -File -Filter "relatorio-*.md" -ErrorAction SilentlyContinue
foreach ($r in $relatoriosAntigos) { $candidatosRemocao += $r.FullName }

# ---- 2. mostrar tudo antes de fazer qualquer coisa ----
Write-Host ""
Write-Host "=== O que vou MOVER (backup grande, pra fora do projeto) ===" -ForegroundColor Yellow
if ($backupsGrandes.Count -eq 0) {
    Write-Host "  (nenhum backup .json encontrado em backups\)"
} else {
    $backupsGrandes | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length/1MB,1)) MB)" }
}

Write-Host ""
Write-Host "=== O que vou APAGAR (arquivos órfãos/obsoletos de rodadas anteriores) ===" -ForegroundColor Yellow
if ($candidatosRemocao.Count -eq 0) {
    Write-Host "  (nada encontrado)"
} else {
    $candidatosRemocao | ForEach-Object { Write-Host "  $_" }
}

if ($backupsGrandes.Count -eq 0 -and $candidatosRemocao.Count -eq 0) {
    Write-Host ""
    Write-Host "Nada pra limpar. Projeto já está organizado." -ForegroundColor Green
    return
}

Write-Host ""
$resp = Read-Host "Confirma mover os backups pra fora e apagar os itens listados acima? (s/n)"
if ($resp -ne "s") {
    Write-Host "Cancelado. Nada foi alterado." -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "[2/3] Movendo backups..." -ForegroundColor Cyan
if ($backupsGrandes.Count -gt 0) {
    $destinoBackup = Join-Path (Split-Path -Parent $raiz) "Backups-Moodboard"
    if (-Not (Test-Path $destinoBackup)) { New-Item -ItemType Directory -Path $destinoBackup | Out-Null }
    foreach ($b in $backupsGrandes) {
        Move-Item $b.FullName -Destination $destinoBackup -Force
        Write-Host "  movido: $($b.Name) -> $destinoBackup"
    }
    # remove a pasta backups vazia dentro do projeto, se ficou vazia
    if ((Get-ChildItem $pastaBackups -ErrorAction SilentlyContinue).Count -eq 0) {
        Remove-Item $pastaBackups -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[3/3] Apagando itens órfãos..." -ForegroundColor Cyan
foreach ($c in $candidatosRemocao) {
    if (Test-Path $c -PathType Container) {
        Remove-Item $c -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Remove-Item $c -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  apagado: $c"
}

Write-Host ""
Write-Host "[PRONTO] Projeto organizado." -ForegroundColor Green
Write-Host "Backups grandes agora ficam em: $(Join-Path (Split-Path -Parent $raiz) 'Backups-Moodboard')" -ForegroundColor Cyan
