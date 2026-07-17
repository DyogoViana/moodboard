# ==========================================================================
# auditoria-projeto.ps1 — varre o projeto como ele está AGORA (depois de
# mesclar mudanças de vários modelos) e gera um relatório único: inventário
# de arquivos, checagens automáticas, e o conteúdo completo do código-fonte.
#
# Isso não compara com nada — é uma "foto" do estado atual, pensada pra
# colar num chat de IA que perdeu o contexto do que já foi implementado.
#
# USO: salve este arquivo em C:\Users\User\Arte\Design\Moodboard\MoodboardStudio\scripts\
# e rode, de dentro dessa pasta scripts, no PowerShell:
#   .\auditoria-projeto.ps1
#
# Gera: relatorio-auditoria.md na raiz do projeto.
# ==========================================================================

param(
    [string]$Pasta = "C:\Users\User\Arte\Design\Moodboard\MoodboardStudio"
)

# ---- 1. confirmação primeiro ----
if (-Not (Test-Path $Pasta)) {
    Write-Host "[ERRO] Pasta não encontrada: $Pasta" -ForegroundColor Red
    Write-Host "Solução: rode com -Pasta apontando pro caminho certo, ex:" -ForegroundColor Yellow
    Write-Host '  .\auditoria-projeto.ps1 -Pasta "C:\outro\caminho"' -ForegroundColor Yellow
    return
}
if (-Not (Test-Path (Join-Path $Pasta "index.html"))) {
    Write-Host "[ERRO] Não achei index.html em $Pasta — confirme que é a pasta certa do projeto." -ForegroundColor Red
    return
}

$relatorio = Join-Path $Pasta "relatorio-auditoria.md"
$temNode = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
Write-Host "[OK] Auditando: $Pasta" -ForegroundColor Green
Write-Host "     node --check disponível: $temNode" -ForegroundColor Cyan

$ignorar = @('node_modules', '.git', 'scripts')
$arquivos = Get-ChildItem $Pasta -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $rel = $_.FullName.Substring($Pasta.Length)
    -not ($ignorar | Where-Object { $rel -like "*\$_\*" })
}

$linhas = @()
$linhas += "# Relatório de auditoria — Moodboard Studio"
$linhas += ""
$linhas += "- Pasta: ``$Pasta``"
$linhas += "- Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$linhas += "- Total de arquivos (excluindo scripts/): $($arquivos.Count)"
$linhas += ""

# ---- 2. inventário ----
$linhas += "## Inventário de arquivos"
foreach ($f in ($arquivos | Sort-Object FullName)) {
    $rel = $f.FullName.Substring($Pasta.Length).TrimStart('\')
    $kb = [math]::Round($f.Length / 1KB, 1)
    $linhas += "- ``$rel`` ($kb KB)"
}
$linhas += ""

# ---- 3. checagem de sintaxe JS ----
$linhas += "## Checagem de sintaxe (node --check)"
if ($temNode) {
    $jsFiles = $arquivos | Where-Object { $_.Extension -eq '.js' }
    foreach ($f in $jsFiles) {
        $rel = $f.FullName.Substring($Pasta.Length).TrimStart('\')
        $resultado = & node --check $f.FullName 2>&1
        if ($LASTEXITCODE -eq 0) {
            $linhas += "- [OK] ``$rel``"
        } else {
            $linhas += "- [ERRO] ``$rel``: ``$resultado``"
        }
    }
} else {
    $linhas += "- node não encontrado no PATH — instale Node.js pra essa checagem funcionar automaticamente."
}
$linhas += ""

# ---- 4. cross-check entre index.html e arquivos js/ reais ----
$linhas += "## Scripts referenciados vs. arquivos existentes"
$indexPath = Join-Path $Pasta "index.html"
$indexContent = Get-Content $indexPath -Raw
$scriptsReferenciados = [regex]::Matches($indexContent, '<script[^>]+src="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$jsReais = ($arquivos | Where-Object { $_.Extension -eq '.js' } | ForEach-Object {
    "js/" + $_.Name
})

$linhas += "**Ordem de carregamento declarada no index.html:**"
$scriptsReferenciados | ForEach-Object { $linhas += "1. ``$_``" }
$linhas += ""

$faltando = $scriptsReferenciados | Where-Object { $_ -like "js/*" -and -not (Test-Path (Join-Path $Pasta $_)) }
$orfaos = $jsReais | Where-Object { $_ -notin $scriptsReferenciados }

if ($faltando) {
    $linhas += "**[ERRO] Referenciados no HTML mas o arquivo não existe:**"
    $faltando | ForEach-Object { $linhas += "- ``$_``" }
} else {
    $linhas += "**[OK]** Todo script referenciado no HTML existe no disco."
}
if ($orfaos) {
    $linhas += "**[AVISO] Arquivos .js existem mas não estão referenciados no index.html (órfãos, não vão rodar):**"
    $orfaos | ForEach-Object { $linhas += "- ``$_``" }
}
$linhas += ""

# ---- 5. IDs duplicados no HTML ----
$linhas += "## IDs duplicados no index.html"
$ids = [regex]::Matches($indexContent, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$duplicados = $ids | Group-Object | Where-Object { $_.Count -gt 1 }
if ($duplicados) {
    $duplicados | ForEach-Object { $linhas += "- [ERRO] id duplicado: ``$($_.Name)`` ($($_.Count)x)" }
} else {
    $linhas += "[OK] nenhum id duplicado."
}
$linhas += ""

# ---- 6. versão do IndexedDB declarada ----
$linhas += "## Versão do IndexedDB"
$dbPath = Join-Path $Pasta "js\db.js"
if (Test-Path $dbPath) {
    $dbContent = Get-Content $dbPath -Raw
    $versaoMatch = [regex]::Match($dbContent, "VERSION\s*=\s*(\d+)")
    $stores = [regex]::Matches($dbContent, "createObjectStore\('([^']+)'") | ForEach-Object { $_.Groups[1].Value }
    if ($versaoMatch.Success) {
        $linhas += "- VERSION = $($versaoMatch.Groups[1].Value)"
    }
    $linhas += "- Stores encontradas: $($stores -join ', ')"
} else {
    $linhas += "[ERRO] js/db.js não encontrado."
}
$linhas += ""

# ---- 7. dump completo do código-fonte ----
$linhas += "## Conteúdo completo"
$linhas += ""
$ordemPreferida = @("index.html", "manifest.json", "sw.js", "css\style.css")
$jaIncluidos = New-Object System.Collections.Generic.HashSet[string]

function Add-ArquivoAoRelatorio($caminhoCompleto, $relPath) {
    $script:linhas += "### ``$relPath``"
    $ext = [System.IO.Path]::GetExtension($relPath).TrimStart('.')
    if ($ext -eq '') { $ext = 'text' }
    $script:linhas += "``````$ext"
    $script:linhas += (Get-Content $caminhoCompleto -Raw -ErrorAction SilentlyContinue)
    $script:linhas += "``````"
    $script:linhas += ""
}

foreach ($rel in $ordemPreferida) {
    $full = Join-Path $Pasta $rel
    if (Test-Path $full) {
        Add-ArquivoAoRelatorio $full $rel
        [void]$jaIncluidos.Add($rel)
    }
}
# depois, todo js/*.js na ordem em que aparece no index.html
foreach ($rel in $scriptsReferenciados) {
    if ($jaIncluidos.Contains($rel)) { continue }
    $full = Join-Path $Pasta $rel
    if (Test-Path $full) {
        Add-ArquivoAoRelatorio $full $rel
        [void]$jaIncluidos.Add($rel)
    }
}
# por fim, qualquer outro arquivo de texto relevante que sobrou (ex: README, icons/*.svg)
foreach ($f in ($arquivos | Sort-Object FullName)) {
    $rel = $f.FullName.Substring($Pasta.Length).TrimStart('\')
    if ($jaIncluidos.Contains($rel)) { continue }
    if ($f.Extension -in '.html', '.css', '.js', '.json', '.md', '.svg', '.txt') {
        Add-ArquivoAoRelatorio $f.FullName $rel
        [void]$jaIncluidos.Add($rel)
    }
}

$linhas | Out-File -FilePath $relatorio -Encoding UTF8
$tamanhoKb = [math]::Round((Get-Item $relatorio).Length / 1KB, 1)
Write-Host "[PRONTO] Relatório gerado: $relatorio ($tamanhoKb KB)" -ForegroundColor Green
Write-Host "Cole o CONTEUDO desse arquivo no chat." -ForegroundColor Cyan
code $relatorio
