param(
    [string]$Pasta = "C:\Users\User\Arte\Design\Moodboard\MoodboardStudio"
)

$indexPath = Join-Path $Pasta "index.html"
if (-Not (Test-Path $indexPath)) {
    Write-Host "[ERRO] index.html nao encontrado em $Pasta" -ForegroundColor Red
    return
}

$conteudo = Get-Content $indexPath -Raw -Encoding UTF8
$original = $conteudo

# remove qualquer <button ...>...</button> que contenha as classes injetadas
$conteudo = [regex]::Replace($conteudo, '<button[^>]*class="[^"]*button-(primary|secondary|tertiary)[^"]*"[^>]*>.*?</button>', '', 'Singleline')

# remove qualquer <div ...class="toolbar"...>...</div> injetado (o seu real usa id="toolbar", nao class="toolbar")
$conteudo = [regex]::Replace($conteudo, '<div[^>]*class="[^"]*\btoolbar\b[^"]*"[^>]*>.*?</div>', '', 'Singleline')

# remove grupos vazios que podem ter sobrado (button-group)
$conteudo = [regex]::Replace($conteudo, '<div[^>]*class="[^"]*button-group[^"]*"[^>]*>\s*</div>', '')

if ($conteudo -eq $original) {
    Write-Host "[INFO] Nada com essas classes foi encontrado - talvez a duplicata esteja em outro formato. Nao mudei nada." -ForegroundColor Yellow
    return
}

# backup pequeno so desse arquivo, por segurança, antes de sobrescrever
Copy-Item $indexPath "$indexPath.antes-fix.bak" -Force

$conteudo | Out-File -FilePath $indexPath -Encoding UTF8 -NoNewline
Write-Host "[PRONTO] index.html limpo. Backup salvo em index.html.antes-fix.bak" -ForegroundColor Green
Write-Host "Recarregue o Live Server e confira." -ForegroundColor Cyan
