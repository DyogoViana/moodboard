// ==============================================================================
// Registro do Service Worker para PWA
// ==============================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const appScope = new URL('./', window.location.href).toString();

            const registrations = await navigator.serviceWorker.getRegistrations();
            const currentRegistration = registrations.find(
                reg => reg.scope === appScope
            );

            await Promise.all(
                registrations
                    .filter(reg => reg !== currentRegistration)
                    .map(reg => reg.unregister())
            );

            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './'
            });

            console.log('SW registrado/atualizado com sucesso:', registration.scope);

        } catch (err) {
            console.log('Falha no registro/atualizaÃ§Ã£o do SW:', err);
        }
    });
}

// =========================================
// ADA UX CRITIQUE: Dynamic Toolbar Grouping & Responsiveness
// =========================================
(function () {

    const toolbar = document.getElementById('tools-container');
    if (!toolbar || toolbar.classList.contains('ada-wrapped')) return;

    toolbar.classList.add('ada-wrapped');

    const wrapper = document.createElement('div');
    wrapper.className = 'ada-top-bar';
    toolbar.parentNode.insertBefore(wrapper, toolbar);
    wrapper.appendChild(toolbar);

    const primaryIds = [
        'btn-save',
        'btn-delete',
        'btn-zoom-in',
        'btn-zoom-out',
        'btn-reset-view',
        'btn-front',
        'btn-back'
    ];

    const primaryContainer = document.createElement('div');
    primaryContainer.className = 'ada-tools-primary';

    const secondaryContainer = document.createElement('div');
    secondaryContainer.className = 'ada-tools-secondary';

    const moreDropdown = document.createElement('div');
    moreDropdown.className = 'ada-more-dropdown';

    const moreBtn = document.createElement('button');
    moreBtn.className = 'ada-btn-tool';
    moreBtn.innerHTML =
        '<span class="ada-btn-icon">⋯</span><span class="ada-btn-text">Mais</span>';

    const moreMenu = document.createElement('div');
    moreMenu.className = 'ada-more-menu';

    moreDropdown.appendChild(moreBtn);
    moreDropdown.appendChild(moreMenu);

    moreBtn.addEventListener('click', e => {
        e.stopPropagation();
        moreMenu.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        moreMenu.classList.remove('open');
    });

    const buttons = Array.from(toolbar.querySelectorAll('.btn-tool'));

    buttons.forEach(btn => {
        btn.classList.add('ada-btn-tool');

        if (btn.querySelector('input[type="file"]')) {
            if (primaryIds.includes(btn.id)) {
                btn.classList.add('primary');
                primaryContainer.appendChild(btn);
            } else {
                secondaryContainer.appendChild(btn);
            }
            return;
        }

        if (!btn.querySelector('.ada-btn-text')) {
            const rawText = btn.textContent.trim();
            let iconText = '';
            let cleanText = rawText;

            const emojiMatch = rawText.match(/^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u);
            if (emojiMatch) {
                iconText = emojiMatch[0];
                cleanText = rawText.slice(iconText.length).trim();
            } else {
                const firstChar = [...rawText][0] || '';
                const isFallbackEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(firstChar);
                if (isFallbackEmoji) {
                    iconText = firstChar;
                    cleanText = rawText.slice(firstChar.length).trim();
                }
            }

            if (!cleanText) {
                iconText = rawText;
                cleanText = '';
            }

            btn.textContent = '';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'ada-btn-icon';
            iconSpan.textContent = iconText;
            if (!iconText) iconSpan.style.display = 'none';
            btn.appendChild(iconSpan);

            const textSpan = document.createElement('span');
            textSpan.className = 'ada-btn-text';
            textSpan.textContent = cleanText;
            btn.appendChild(textSpan);
        }

        if (primaryIds.includes(btn.id)) {
            btn.classList.add('primary');
            primaryContainer.appendChild(btn);
        } else {
            secondaryContainer.appendChild(btn);
        }
    });

    if (secondaryContainer.children.length) {
        moreMenu.appendChild(secondaryContainer);
        primaryContainer.appendChild(moreDropdown);
    }

    toolbar.innerHTML = '';
    toolbar.appendChild(primaryContainer);

    const fileInput = document.getElementById('file-input');
    if (fileInput && typeof IMAGES !== 'undefined') {
        fileInput.addEventListener('change', async (e) => {
            if (!STATE.currentBoardId) {
                alert('Selecione ou crie um board primeiro.');
                return;
            }

            const files = [...(e.target.files || [])].filter(f => f.type.startsWith('image/'));
            if (!files.length) {
                e.target.value = '';
                return;
            }

            const previousCount = STATE.images.length;
            for (const file of files) {
                try {
                    await IMAGES.addImageBlob(file);
                } catch (err) {
                    console.error('Erro ao carregar imagem:', file.name, err);
                }
            }

            const newImages = STATE.images.slice(previousCount);
            if (newImages.length > 1 && typeof IMAGES.organizeImagesInGrid === 'function') {
                IMAGES.organizeImagesInGrid(newImages);
            }

            e.target.value = '';
        });
    }
})();

// Painéis laterais do sidebar
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const panelName = tab.dataset.panel;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `panel-${panelName}`);
        });
        if (panelName === 'trash' && typeof TRASH !== 'undefined' && TRASH.refresh) {
            TRASH.refresh();
        }
    });
});

// ============================================================================== 
// Toolbar da árvore
// ==============================================================================
window.addEventListener('load', () => {
    document
        .getElementById('btn-new-folder')
        ?.addEventListener('click', () => TREE.createFolder(null));

    document
        .getElementById('btn-new-board')
        ?.addEventListener('click', () => TREE.createBoard(null));

    document
        .getElementById('btn-theme')
        ?.addEventListener('click', () => THEME.toggle());
});

// ==========================================================================
// TOOLTIPS — garante descrição (title) em todo controle icônico
// ==========================================================================
(function () {
    const MAP = [
        ['#btn-save', 'Salvar board (Ctrl+S)'],
        ['#btn-add-url', 'Colar link de imagem ou HTML do Pinterest'],
        ['#btn-export-image', 'Exportar este board como PNG'],
        ['#btn-front', 'Trazer seleção para frente'],
        ['#btn-back', 'Enviar seleção para trás'],
        ['#btn-flip-h', 'Espelhar horizontalmente'],
        ['#btn-flip-v', 'Espelhar verticalmente'],
        ['#btn-align-uniform', 'Alinhar e uniformizar tamanho da seleção (2+)'],
        ['#btn-delete', 'Mover seleção para a lixeira (Del)'],
        ['#btn-pan-mode', 'Ferramenta Mão — arrastar para navegar (H)'],
        ['#btn-zoom-mode', 'Ferramenta Zoom — clique amplia, Alt+clique reduz (Z)'],
        ['#btn-zoom-out', 'Reduzir zoom'],
        ['#btn-zoom-in', 'Aumentar zoom'],
        ['#btn-reset-view', 'Recentralizar na seleção (ou no palco todo)'],
        ['#btn-collapse-sidebar', 'Recolher/expandir a barra lateral'],
        ['#btn-new-folder', 'Criar nova pasta'],
        ['#btn-new-board', 'Criar novo board'],
        ['#btn-empty-trash', 'Esvaziar lixeira (ação permanente)'],
        ['#btn-eye-dropper', 'Conta-gotas: capturar cor da tela'],
        ['#btn-theme', 'Alternar tema claro/escuro'],
        ['button[onclick*="toggleThumbnails"]', 'Mostrar/ocultar miniaturas dos boards'],
        ['button[onclick*="exportBoard"]', 'Exportar este board como PNG'],
        ['.tree-row-actions .btn-tool', 'Ações da árvore']
    ];

    function apply() {
        MAP.forEach(([selector, text]) => {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.getAttribute('title')) {
                    el.setAttribute('title', text);
                }
            });
        });

        const directFallbacks = {
            '#btn-collapse-sidebar': 'Recolher/expandir a barra lateral',
            '#btn-eye-dropper': 'Conta-gotas: capturar cor da tela',
            '#btn-new-folder': 'Criar nova pasta',
            '#btn-new-board': 'Criar novo board'
        };

        Object.entries(directFallbacks).forEach(([selector, text]) => {
            const el = document.querySelector(selector);
            if (el && !el.getAttribute('title')) {
                el.setAttribute('title', text);
            }
        });
    }

    const renderTree = typeof TREE !== 'undefined' && TREE && typeof TREE.render === 'function' ? TREE.render.bind(TREE) : null;
    if (renderTree) {
        TREE.render = function () {
            renderTree();
            apply();
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
