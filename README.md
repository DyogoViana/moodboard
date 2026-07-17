# Moodboard Studio

App local de moodboard em canvas infinito. Roda 100% offline no navegador, sem servidor, sem dependências externas — só HTML, CSS e JS puros. Tudo é salvo no `IndexedDB` do navegador (dentro do seu perfil local do Chrome/Edge/Firefox).

## Como rodar

1. Abra a pasta `Moodboard` no VS Code.
2. Instale a extensão **Live Server** (se ainda não tiver).
3. Clique com o botão direito em `index.html` → **Open with Live Server**.
   - Também funciona com duplo clique direto no `index.html`, mas o Live Server evita alguns bloqueios de segurança do navegador com `file://`.

Não precisa de `npm install`, não precisa de Node — é só front-end estático.

## Estrutura

```
Moodboard/
├── index.html         estrutura da página
├── css/style.css       tema, tokens de cor, layout
├── js/
│   ├── db.js            camada de IndexedDB (pastas, boards, imagens)
│   ├── state.js         estado em memória + helpers de árvore
│   ├── theme.js          claro/escuro, persistido em localStorage
│   ├── canvas.js         pan, zoom, seleção por retângulo (marquee)
│   ├── images.js         upload, mover, redimensionar, rotacionar, lixeira
│   ├── tree.js            pastas/subpastas ilimitadas, boards, drag & drop
│   ├── trash.js           lixeira: restaurar / apagar definitivo
│   └── app.js             boot e ligações finais de UI
└── assets/               (livre para você guardar recursos extras)
```

## Funcionalidades

- **Canvas infinito** — pan com `Espaço + arrastar` (ou botão do meio do mouse), zoom com `Ctrl/Cmd + scroll`, sem limite de imagens.
- **Pastas e subpastas ilimitadas** na barra lateral, com drag & drop para reorganizar.
- **Múltiplos boards** — criar, renomear (clique no nome), duplicar, excluir. Cada board guarda seu próprio conteúdo.
- **Imagens livres** — arraste para importar (botão "Adicionar imagens"), mova, redimensione (alça no canto), rotacione (alça acima da imagem), multi-seleção com `Shift+clique` ou retângulo de seleção arrastando no vazio, e ordene com "Trazer p/ frente" / "Enviar p/ trás".
- **Lixeira** — excluir (`Del` ou botão) manda para a lixeira, recuperável. Boards excluídos também vão para lá. "Esvaziar" apaga definitivamente.
- **Modo claro/escuro** — alternável a qualquer momento, com preferência salva.

## Adicionar imagens — todas as formas

- **Upload de arquivo** — botão "Adicionar imagens".
- **Colar (Ctrl/Cmd+V)** — cole uma imagem copiada (de qualquer app), um link direto de imagem, ou o HTML de uma página de board do Pinterest (veja abaixo).
- **🔗 Colar link** — um link direto de imagem (`.jpg`/`.png`/etc.), ou cole ali mesmo o HTML de um board do Pinterest.
- **📄 Lista de links (.txt)** — um link por linha. Links diretos de imagem são baixados automaticamente; links de página do Pinterest (que o navegador não consegue baixar sozinho) são oferecidos para abrir em novas abas, para salvar manualmente.

### Sobre importar do Pinterest — o que dá e o que não dá

O Pinterest bloqueia (via CORS) que este app baixe o conteúdo de uma página dele diretamente pelo link. O que funciona de verdade:

1. Abra o board no Pinterest, espere carregar as imagens que quiser (role a página).
2. Botão direito → **Exibir código-fonte da página** (ou `Ctrl+U`), selecione tudo, copie.
3. Cole aqui no app (botão "🔗 Colar link" ou `Ctrl+V` direto no board) — o app extrai automaticamente as imagens em maior resolução disponível, ignorando ícones e avatares.

Um link de pin individual (`pinterest.com/pin/...`) colado sozinho **não** funciona — precisa ser o HTML da página, não o link dela. Isso não é uma limitação deste app especificamente, é como o Pinterest bloqueia terceiros.

Para um fluxo mais automatizado (abrir dezenas de links sozinho, sem precisar copiar HTML manualmente), existe um projeto à parte (script Node.js) documentado em `prompt-pinterest-extractor.md` — fora do escopo deste app web.

## Uso com caneta (Wacom Bamboo e similares)

Toda a interação (mover, redimensionar, rotacionar, selecionar) usa Pointer Events, então a caneta se comporta como o mouse — inclusive com captura de ponteiro, então o arraste não "escapa" se a caneta levantar de leve. Como caneta não tem botão do meio para navegar pelo canvas, existem três formas de fazer pan:

1. Segurar `Espaço` e arrastar (se tiver teclado por perto).
2. Botão **"✋ Mover"** na barra de ferramentas (ou tecla `H`) — liga um modo em que qualquer arraste com a caneta navega o canvas, sem precisar segurar nada. Aperte de novo (ou `H`) pra voltar ao modo de seleção normal.
3. Clique do meio, se o seu Bamboo tiver essa opção mapeada.

Uma ressalva: reorganizar pastas arrastando itens na árvore lateral usa o drag-and-drop nativo do navegador, que tem suporte mais limitado a caneta em alguns navegadores — se notar que não pega com a caneta, use o mouse nessa parte específica (as outras interações no canvas não têm essa limitação).

## Observações importantes

- Os dados ficam no `IndexedDB` do navegador **daquele perfil específico**. Se você limpar os dados de navegação do site, ou abrir em outro navegador/perfil, o conteúdo não estará lá. Para um projeto que vai crescer bastante, vale considerar um backup periódico (posso te ajudar a montar um botão de exportação/importação depois, se quiser).
- Excluir uma **pasta** com conteúdo dentro é permanente (apaga subpastas, boards e imagens direto, com uma confirmação antes) — diferente de excluir um board ou uma imagem, que vai para a lixeira. Isso evita que a lixeira fique cheia de estruturas inteiras por engano.
