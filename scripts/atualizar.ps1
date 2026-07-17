# ==========================================================================
# atualizar.ps1 — aplica o zip mais novo do Moodboard Studio por cima
# do projeto, sem tocar nos seus dados (que vivem no navegador, não aqui).
#
# USO: dentro da pasta do projeto, no PowerShell:
#   .\scripts\atualizar.ps1
#
# Padrão: tenta, e se algo não validar, já tem um caminho alternativo —
# nunca declara sucesso sem checar de verdade o resultado.
# ==========================================================================

$destino = Split-Path -Parent $PSScriptRoot   # a pasta do projeto (uma acima de /scripts)
$nomeEsperado = "MoodboardStudio*.zip"

Write-Host "Procurando o zip mais recente em todo o seu usuário..." -ForegroundColor Cyan
$candidatos = Get-ChildItem "$env:USERPROFILE" -Recurse -Filter $nomeEsperado -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending

if (-Not $candidatos) {
    Write-Host "[ERRO] Nenhum $nomeEsperado encontrado no seu usuário." -ForegroundColor Red
    Write-Host "Solução: baixe o zip clicando no anexo da mensagem do chat, depois rode este script de novo." -ForegroundColor Yellow
    return
}

$arquivoZip = $candidatos[0].FullName
$idade = (Get-Date) - $candidatos[0].LastWriteTime
Write-Host "[OK] Mais recente: $arquivoZip (baixado ha $([math]::Round($idade.TotalMinutes)) min)" -ForegroundColor Green

if ($candidatos.Count -gt 1) {
    Write-Host "[AVISO] Existem $($candidatos.Count) arquivos $nomeEsperado no sistema. Usando o mais novo. Os outros (considere apagar):" -ForegroundColor Yellow
    $candidatos | Select-Object -Skip 1 | ForEach-Object { Write-Host "   $($_.FullName)" -ForegroundColor DarkGray }
}

if ($idade.TotalHours -gt 6) {
    Write-Host "[AVISO] Esse zip tem mais de 6h. Se esperava uma versao mais nova de hoje, baixe o anexo do chat antes de continuar." -ForegroundColor Yellow
    if ((Read-Host "Continuar mesmo assim com esse arquivo? (s/n)") -ne "s") { Write-Host "Cancelado." -ForegroundColor Red; return }
}

try {
    Expand-Archive -Path $arquivoZip -DestinationPath $destino -Force -ErrorAction Stop
} catch {
    Write-Host "[ERRO] Falha ao extrair: $($_.Exception.Message)" -ForegroundColor Red
    return
}

if (Test-Path "$destino\MoodboardStudio") {
    Copy-Item "$destino\MoodboardStudio\*" -Destination $destino -Recurse -Force
    Remove-Item "$destino\MoodboardStudio" -Recurse -Force
}

if (Test-Path "$destino\index.html") {
    Write-Host "[PRONTO] Projeto atualizado em $destino" -ForegroundColor Green
    code $destino
} else {
    Write-Host "[ERRO] Extraiu, mas index.html nao apareceu. Verifique manualmente:" -ForegroundColor Red
    Write-Host "  Get-ChildItem `"$destino`" -Recurse" -ForegroundColor Yellow
}
