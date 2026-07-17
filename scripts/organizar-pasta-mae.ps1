# ==========================================================================
# organizar-pasta-mae.ps1 — limpa a pasta _Moodboard (um nível acima do
# projeto), onde costumam se acumular zips baixados, cópias de conflito
# do OneDrive, e pastas de backup soltas.
#
# Não mexe no CONTEÚDO da pasta MoodboardStudio (isso é o trabalho do
# scripts\organizar-projeto.ps1) — só no que está solto ao lado dela.
#
# Mesma regra de sempre: lista tudo, uma confirmação, só depois age.
#
# USO: de dentro de MoodboardStudio\scripts:
#   .\organizar-pasta-mae.ps1
# ==========================================================================

$raizProjeto = Split-Path -Parent $PSScriptRoot        # ...\_Moodboard\MoodboardStudio
$pastaMae = Split-Path -Parent $raizProjeto             # ...\_Moodboard

if (-Not (Test-Path (Join-Path $raizProjeto "index.html"))) {
    Write-Host "[ERRO] Não consegui confirmar a pasta do projeto a partir daqui." -ForegroundColor Red
    return
}

Write-Host "[1/3] Levantando o que existe em: $pastaMae" -ForegroundColor Cyan
Write-Host "      (a pasta MoodboardStudio em si não será tocada por este script)" -ForegroundColor DarkGray

$itens = Get-ChildItem $pastaMae -Force -ErrorAction SilentlyContinue |
         Where-Object { $_.Name -ne (Split-Path $raizProjeto -Leaf) }

# ---- classificar o que está solto na pasta mãe ----
$zipsAntigos = $itens | Where-Object { $_.Extension -eq ".zip" -and $_.Name -match "MoodboardStudio" }
$conflitosOneDrive = $itens | Where-Object { $_.Name -match "conflicted copy|-Copy\d*\.|  \(\d+\)\." -or $_.Name -match " \(\d+\)$" }
$pastasBackup = $itens | Where-Object { $_.PSIsContainer -and $_.Name -match "^Backup" }
$outrasCopiasDoProjeto = $itens | Where-Object { $_.PSIsContainer -and $_.Name -match "MoodboardStudio" -and $_.Name -ne "MoodboardStudio" }

$conhecidos = @($zipsAntigos.FullName) + @($conflitosOneDrive.FullName) + @($pastasBackup.FullName) + @($outrasCopiasDoProjeto.FullName) | Select-Object -Unique
$desconhecidos = $itens | Where-Object { $conhecidos -notcontains $_.FullName }

Write-Host ""
Write-Host "=== Zips antigos do projeto (serão apagados — já foram aplicados) ===" -ForegroundColor Yellow
if ($zipsAntigos) { $zipsAntigos | ForEach-Object { Write-Host "  $($_.Name)" } } else { Write-Host "  (nenhum)" }

Write-Host ""
Write-Host "=== Cópias de conflito do OneDrive (serão apagadas) ===" -ForegroundColor Yellow
if ($conflitosOneDrive) { $conflitosOneDrive | ForEach-Object { Write-Host "  $($_.Name)" } } else { Write-Host "  (nenhuma)" }

Write-Host ""
Write-Host "=== Pastas de backup soltas (serão apagadas) ===" -ForegroundColor Yellow
if ($pastasBackup) { $pastasBackup | ForEach-Object { Write-Host "  $($_.Name)" } } else { Write-Host "  (nenhuma)" }

Write-Host ""
Write-Host "=== Outras pastas parecidas com MoodboardStudio (NÃO apago sozinho — só aviso) ===" -ForegroundColor Yellow
if ($outrasCopiasDoProjeto) {
    $outrasCopiasDoProjeto | ForEach-Object { Write-Host "  $($_.Name) — confira manualmente, pode ser uma cópia duplicada de sincronização" }
} else { Write-Host "  (nenhuma)" }

Write-Host ""
Write-Host "=== Itens que não reconheço (não mexo, só listo) ===" -ForegroundColor DarkGray
if ($desconhecidos) { $desconhecidos | ForEach-Object { Write-Host "  $($_.Name)" } } else { Write-Host "  (nenhum)" }

$paraApagar = @($zipsAntigos) + @($conflitosOneDrive) + @($pastasBackup)
if ($paraApagar.Count -eq 0) {
    Write-Host ""
    Write-Host "Nada identificado pra apagar automaticamente." -ForegroundColor Green
    return
}

Write-Host ""
$resp = Read-Host "Confirma apagar os itens das 3 primeiras listas acima ($($paraApagar.Count) no total)? (s/n)"
if ($resp -ne "s") {
    Write-Host "Cancelado. Nada foi alterado." -ForegroundColor Yellow
    return
}

Write-Host ""
Write-Host "[2/3] Apagando..." -ForegroundColor Cyan
foreach ($item in $paraApagar) {
    if ($item.PSIsContainer) {
        Remove-Item $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Remove-Item $item.FullName -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  apagado: $($item.Name)"
}

Write-Host ""
Write-Host "[3/3] Feito." -ForegroundColor Green
Write-Host "[PRONTO] Pasta $pastaMae organizada (fora do MoodboardStudio em si)." -ForegroundColor Green
