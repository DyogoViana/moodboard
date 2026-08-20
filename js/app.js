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
            console.log('Falha no registro/atualização do SW:', err);
        }
    });
}

function renderStaticIcons(root = document) {
    if (!window.ICONS) return;
    root.querySelectorAll('[data-icon]').forEach(el => {
        const key = el.dataset.icon;
        if (!key || !ICONS[key]) return;
        if (el.classList.contains('ada-btn-tool')) return;
        const target = el.classList.contains('theme-icon') || el.tagName === 'SPAN' ? el : null;
        if (target) {
            const visibleText = target.tagName === 'BUTTON' || target.tagName === 'LABEL'
                ? [...target.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim()
                : '';
            const fileInput = target.querySelector('input[type="file"]');
            target.innerHTML = ICONS[key];
            if (visibleText) target.appendChild(document.createTextNode(` ${visibleText}`));
            if (fileInput) target.appendChild(fileInput);
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
        'btn-import-pinterest',
        'btn-delete',
        'btn-zoom-in',
        'btn-zoom-out',
        'btn-reset-view',
        'btn-front',
        'btn-back',
        'btn-export-image',
        'btn-organize-grid'
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
        '<span class="ada-btn-icon">' + (window.ICONS ? ICONS.more : '⋯') + '</span><span class="ada-btn-text">Mais</span>';

    const moreMenu = document.createElement('div');
    moreMenu.className = 'ada-more-menu';

    moreDropdown.appendChild(moreBtn);
    moreDropdown.appendChild(moreMenu);

    moreBtn.addEventListener('click', e => {
        e.stopPropagation();
        const rect = moreBtn.getBoundingClientRect();
        moreMenu.style.left = `${Math.max(8, rect.left)}px`;
        moreMenu.style.top = `${rect.bottom + 6}px`;
        moreMenu.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        moreMenu.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') moreMenu.classList.remove('open');
    });

    const buttons = Array.from(toolbar.querySelectorAll('.btn-tool'));

    function applyIconMarkup(btn, iconKey, defaultLabel) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'ada-btn-icon';

        if (window.ICONS && iconKey && ICONS[iconKey]) {
            iconSpan.innerHTML = ICONS[iconKey];
        } else if (defaultLabel) {
            iconSpan.textContent = defaultLabel;
        } else {
            iconSpan.style.display = 'none';
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'ada-btn-text';
        textSpan.textContent = btn.dataset.label || '';

        btn.textContent = '';
        btn.appendChild(iconSpan);
        btn.appendChild(textSpan);
    }

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

        const rawText = (btn.textContent || '').trim();
        const keyMap = {
            'btn-save': 'save',
            'btn-add-url': 'link',
            'btn-export-image': 'image',
            'btn-organize-grid': 'align',
            'btn-front': 'front',
            'btn-back': 'back',
            'btn-flip-h': 'flipH',
            'btn-flip-v': 'flipV',
            'btn-align-uniform': 'align',
            'btn-delete': 'trash',
            'btn-pan-mode': 'move',
            'btn-zoom-mode': 'zoom',
            'btn-zoom-out': 'zoomOut',
            'btn-zoom-in': 'zoomIn',
            'btn-reset-view': 'reset'
        };

        const iconKey = btn.dataset.icon || keyMap[btn.id] || null;
        const cleanText = (btn.dataset.label || rawText).replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9]+$/g, '').trim();

        btn.dataset.label = cleanText || btn.dataset.label || rawText;

        btn.textContent = '';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'ada-btn-icon';
        if (window.ICONS && iconKey && ICONS[iconKey]) {
            iconSpan.innerHTML = ICONS[iconKey];
        } else if (rawText && !cleanText) {
            iconSpan.textContent = rawText;
        } else {
            iconSpan.style.display = 'none';
        }
        btn.appendChild(iconSpan);

        const textSpan = document.createElement('span');
        textSpan.className = 'ada-btn-text';
        textSpan.textContent = cleanText || '';
        btn.appendChild(textSpan);

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

    const saveStatus = document.getElementById('save-status');
    toolbar.innerHTML = '';
    toolbar.appendChild(primaryContainer);
    if (saveStatus) primaryContainer.appendChild(saveStatus);

    const collapseButton = document.getElementById('btn-collapse-sidebar');
    const updateCollapseIcon = () => {
        const collapsed = document.getElementById('app').classList.contains('sidebar-collapsed');
        collapseButton.innerHTML = window.ICONS ? (collapsed ? ICONS.chevRight : ICONS.chevLeft) : '';
        collapseButton.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        collapseButton.setAttribute('aria-label', collapseButton.title);
    };
    if (collapseButton) {
        updateCollapseIcon();
        collapseButton.addEventListener('click', () => {
            document.getElementById('app').classList.toggle('sidebar-collapsed');
            updateCollapseIcon();
        });
    }

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
    renderStaticIcons();
    document
        .getElementById('btn-new-folder')
        ?.addEventListener('click', () => TREE.createFolder(null));

    document
        .getElementById('btn-new-board')
        ?.addEventListener('click', () => TREE.createBoard(null));

    document
        .getElementById('btn-theme')
        ?.addEventListener('click', () => THEME.toggle());

    const explicitSave = () => {
        if (typeof BACKUP === 'undefined' || !BACKUP.pushExport) return;
        BACKUP.pushExport().then(ok => {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = ok ? 'Board salvo' : 'Falha ao salvar exportação';
            toast.classList.remove('hidden');
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.classList.add('hidden'), 180);
            }, 1800);
        });
    };
    document.getElementById('btn-save')?.addEventListener('click', explicitSave);
    window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            explicitSave();
        }
    });
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

// --- boot: open DB, load nodes, and restore last opened board ---
(async function boot() {
    if (typeof THEME !== 'undefined' && THEME.init) {
        try { THEME.init(); } catch (e) { console.error('THEME.init error', e); }
    }

    try {
        await DB.open();
    } catch (e) {
        console.error('Failed to open DB:', e);
    }

    try {
        if (typeof TREE !== 'undefined' && TREE.loadNodes) await TREE.loadNodes();

        const last = (function(){ try { return localStorage.getItem('lastBoardId'); } catch (_) { return null; }})();
        if (last && typeof getNode === 'function') {
            const node = getNode(last);
            if (node && typeof TREE.openBoardUI === 'function') {
                await IMAGES.loadBoard(node.id).catch(()=>{});
                TREE.openBoardUI(node);
            }
        }

        if (typeof CANVAS !== 'undefined' && CANVAS.apply) CANVAS.apply();
        if (typeof BACKUP !== 'undefined' && BACKUP.requestPersistence) BACKUP.requestPersistence();
    } catch (e) {
        console.error('Boot sequence error:', e);
    }
})();

// Prevent accidental reload/navigate when a board is open
window.addEventListener('beforeunload', (e) => {
    try {
        if (typeof STATE !== 'undefined' && STATE.currentBoardId) {
            e.preventDefault();
            e.returnValue = '';
        }
    } catch (_) {}
});
