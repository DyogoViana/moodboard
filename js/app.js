/* ==========================================================================
   app.js — boots the app and wires the bits that don't belong to one module.
   ========================================================================== */

(function () {
  const sidebar = document.getElementById('sidebar');
  const collapseBtn = document.getElementById('btn-collapse-sidebar');
  const boardTitle = document.getElementById('board-title');

  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    collapseBtn.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
  });

  // panel tabs (Projetos / Lixeira)
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-tree').classList.toggle('hidden', tab.dataset.panel !== 'tree');
      document.getElementById('panel-trash').classList.toggle('hidden', tab.dataset.panel !== 'trash');
      document.getElementById('panel-color').classList.toggle('hidden', tab.dataset.panel !== 'color');
      if (tab.dataset.panel === 'trash') TRASH.refresh();
    });
  });

  // rename current board from the toolbar title
  boardTitle.addEventListener('click', () => {
    if (!STATE.currentBoardId) return;
    boardTitle.contentEditable = 'true';
    boardTitle.focus();
    document.execCommand('selectAll', false, null);
  });
  boardTitle.addEventListener('blur', () => {
    boardTitle.contentEditable = 'false';
    if (!STATE.currentBoardId) return;
    const node = getNode(STATE.currentBoardId);
    if (!node) return;
    const newName = boardTitle.textContent.trim() || node.name;
    boardTitle.textContent = newName;
    node.name = newName;
    DB.put('nodes', node);
    TREE.render();
  });
  boardTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); boardTitle.blur(); }
  });

  document.getElementById('btn-new-folder').addEventListener('click', () => TREE.createFolder(null));
  document.getElementById('btn-new-board').addEventListener('click', () => TREE.createBoard(null));
  document.getElementById('btn-theme').addEventListener('click', () => THEME.toggle());

  // ---- explicit save (everything already autosaves on every change; this
  // just forces a flush of the current board's state and gives visible
  // confirmation, for peace of mind) ----
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 200);
    }, 1600);
  }

  async function saveBoardNow() {
    if (!STATE.currentBoardId) { showToast('Nenhum board aberto'); return; }
    const node = getNode(STATE.currentBoardId);
    if (node) await DB.put('nodes', node);
    for (const img of STATE.images) await DB.put('images', img);
    showToast('Board salvo ✓');
  }

  document.getElementById('btn-save').addEventListener('click', saveBoardNow);
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      saveBoardNow();
    }
  });

  // ---- backup: export / import ----
  document.getElementById('btn-export').addEventListener('click', async () => {
    const { nodeCount, imageCount } = await BACKUP.exportBackup();
    showToast(`Backup baixado (${nodeCount} itens, ${imageCount} imagens)`);
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { nodeCount, imageCount } = await BACKUP.importBackup(file);
      await TREE.loadNodes();
      if (STATE.currentBoardId) await IMAGES.loadBoard(STATE.currentBoardId);
      TRASH.refresh();
      showToast(`Backup importado (${nodeCount} itens, ${imageCount} imagens)`);
    } catch (err) {
      alert(err.message || 'Não foi possível importar esse backup.');
    }
  });

  async function boot() {
    THEME.init();
    await DB.open();
    await TREE.loadNodes();
    CANVAS.apply();
    BACKUP.requestPersistence();
  }

  boot();
})();

// ==============================================================================
// Registro do Service Worker para PWA
// ==============================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const appScope = new URL('./', window.location.href).toString();
            const registrations = await navigator.serviceWorker.getRegistrations();
            const currentRegistration = registrations.find(reg => reg.scope === appScope);

            await Promise.all(registrations
                .filter(reg => reg !== currentRegistration)
                .map(reg => reg.unregister()));

            const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
            console.log('SW registrado/atualizado com sucesso:', registration.scope);
        } catch (err) {
            console.log('Falha no registro/atualização do SW:', err);
        }
// ADA UX CRITIQUE: Dynamic Toolbar Grouping & Responsiveness
// =========================================
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const toolbar = document.getElementById('tools-container');
        if (!toolbar || toolbar.classList.contains('ada-wrapped')) return;

        toolbar.classList.add('ada-wrapped');

        // 1. Create Top Bar Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'ada-top-bar';
        toolbar.parentNode.insertBefore(wrapper, toolbar);
        wrapper.appendChild(toolbar);

        // 2. Define Primary Actions (High Hierarchy)
        const primaryIds = ['btn-save', 'btn-add-image', 'btn-delete', 'btn-move', 'btn-zoom-in', 'btn-zoom-out', 'btn-reset-view'];
        const primaryContainer = document.createElement('div');
        primaryContainer.className = 'ada-tools-primary';
        const secondaryContainer = document.createElement('div');
        secondaryContainer.className = 'ada-tools-secondary';

        // 3. Create "More" Dropdown
        const moreDropdown = document.createElement('div');
        moreDropdown.className = 'ada-more-dropdown';
        const moreBtn = document.createElement('button');
        moreBtn.className = 'ada-btn-tool';
        moreBtn.innerHTML = '<span class="ada-btn-icon">⋯</span><span class="ada-btn-text">Mais</span>';
        const moreMenu = document.createElement('div');
        moreMenu.className = 'ada-more-menu';
        moreDropdown.appendChild(moreBtn);
        moreDropdown.appendChild(moreMenu);

        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreMenu.classList.toggle('open');
        });
        document.addEventListener('click', () => moreMenu.classList.remove('open'));

        // 4. Sort and Group Buttons dynamically
        const buttons = Array.from(toolbar.querySelectorAll('.btn-tool'));
        buttons.forEach(btn => {
            btn.classList.add('ada-btn-tool');
            if (!btn.querySelector('.ada-btn-text')) {
                const text = btn.textContent.trim();
                btn.innerHTML = '<span class="ada-btn-icon">' + btn.innerHTML + '</span><span class="ada-btn-text">' + text + '</span>';
            }

            if (primaryIds.some(id => btn.id.includes(id) || btn.id === id)) {
                btn.classList.add('primary');
                primaryContainer.appendChild(btn);
            } else {
                secondaryContainer.appendChild(btn);
            }
        });

        if (secondaryContainer.children.length > 0) {
            moreMenu.appendChild(secondaryContainer);
            primaryContainer.appendChild(moreDropdown);
        }

        toolbar.innerHTML = '';
        toolbar.appendChild(primaryContainer);
    });
})();