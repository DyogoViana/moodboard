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
            const original = btn.innerHTML;
            const text = btn.textContent.trim();
            btn.innerHTML =
                `<span class="ada-btn-icon">${original}</span>` +
                `<span class="ada-btn-text">${text}</span>`;
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
