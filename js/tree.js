/* ==========================================================================
   tree.js — sidebar folder/board tree.
   Folders can be nested without limit. Boards live inside folders or at root.
   Deleting a board is a *soft* delete (recoverable from Lixeira).
   Deleting a non-empty folder is a *permanent* cascade delete (confirmed).
   ========================================================================== */

const TREE = (() => {
  const root = document.getElementById('tree-root');
  const expanded = new Set();

  async function loadNodes() {
    const all = await DB.getAll('nodes');
    STATE.nodes = all.filter(n => !n.deleted);
    render();
  }

  function render() {
    root.innerHTML = '';
    const top = childrenOf(null);
    if (top.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'trash-empty';
      hint.textContent = 'Crie uma pasta ou um board para começar.';
      root.appendChild(hint);
      return;
    }
    top.forEach(n => root.appendChild(renderNode(n)));
  }

  function renderNode(node) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-node';
    wrap.dataset.id = node.id;
    wrap.dataset.type = node.type;

    const row = document.createElement('div');
    row.className = 'tree-row' + (node.id === STATE.currentBoardId ? ' active' : '');
    row.draggable = true;

    const kids = node.type === 'folder' ? childrenOf(node.id) : [];
    const isOpen = expanded.has(node.id);

    const caret = document.createElement('span');
    caret.className = 'tree-caret ' + (node.type === 'folder' ? (isOpen ? 'open' : '') : 'leaf');
    caret.textContent = node.type === 'folder' ? '▸' : '';
    row.appendChild(caret);

    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = node.type === 'folder' ? '' : '▤';
    row.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = node.name;
    row.appendChild(label);

    const actions = document.createElement('div');
    actions.className = 'tree-row-actions';
        const thumbImg = document.createElement('img');
        thumbImg.className = 'tree-thumbnail';
        thumbImg.style.display = 'none';
        actions.appendChild(thumbImg);
        setTimeout(() => { if(typeof loadThumbnail === 'function') loadThumbnail(node, thumbImg); }, 0);
        if (node.type === 'board') {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'btn-tool';
            tagBtn.textContent = '🏷';
            tagBtn.title = 'Etiqueta de cliente';
            tagBtn.onclick = (e) => { e.stopPropagation(); if (typeof editClientTag === 'function') editClientTag(node); };
            actions.appendChild(tagBtn);
        }
    if (node.type === 'folder') {
      actions.appendChild(makeActionBtn('+', 'Nova subpasta', () => createFolder(node.id)));
      actions.appendChild(makeActionBtn('▤', 'Novo board aqui', () => createBoard(node.id)));
    } else {
      actions.appendChild(makeActionBtn('⧉', 'Duplicar board', () => duplicateBoard(node.id)));
    }
    actions.appendChild(makeActionBtn('✎', 'Renomear', () => startRename(label, node)));
    actions.appendChild(makeActionBtn('×', node.type === 'folder' ? 'Excluir pasta' : 'Mover para lixeira', () => deleteNode(node)));
    row.appendChild(actions);

    row.addEventListener('click', (e) => {
      if (e.target.closest('.tree-row-actions')) return;
      if (node.type === 'folder') {
        toggleFolder(node.id);
      } else {
        IMAGES.loadBoard(node.id).then(() => openBoardUI(node));
      }
    });

    setupDragDrop(row, node);
    wrap.appendChild(row);

    if (node.type === 'folder') {
      const childrenBox = document.createElement('div');
      childrenBox.className = 'tree-children';
      childrenBox.style.display = isOpen ? 'block' : 'none';
      kids.forEach(k => childrenBox.appendChild(renderNode(k)));
      wrap.appendChild(childrenBox);
    }

    return wrap;
  }

  function makeActionBtn(symbol, title, handler) {
    const b = document.createElement('button');
    b.textContent = symbol;
    b.title = title;
    b.addEventListener('click', (e) => { e.stopPropagation(); handler(); });
    return b;
  }

  function toggleFolder(id) {
    if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
    render();
  }

  // ---- create ----
  async function createFolder(parentId = null) {
    const node = { id: uid('f'), type: 'folder', name: 'Nova pasta', parentId, deleted: false, createdAt: Date.now() };
    await DB.put('nodes', node);
    STATE.nodes.push(node);
    if (parentId) expanded.add(parentId);
    render();
  }

  async function createBoard(parentId = null) {
    const node = { id: uid('b'), type: 'board', name: 'Novo board', parentId, deleted: false, createdAt: Date.now() };
    await DB.put('nodes', node);
    STATE.nodes.push(node);
    if (parentId) expanded.add(parentId);
    render();
    await IMAGES.loadBoard(node.id);
    openBoardUI(node);
  }

  async function duplicateBoard(boardId) {
    const original = getNode(boardId);
    if (!original) return;
    const copy = { ...original, id: uid('b'), name: original.name + ' (cópia)' };
    await DB.put('nodes', copy);
    STATE.nodes.push(copy);

    const originalImages = await DB.getByIndex('images', 'boardId', boardId);
    for (const img of originalImages.filter(i => !i.deleted)) {
      const clone = { ...img, id: uid('img'), boardId: copy.id };
      await DB.put('images', clone);
    }
    render();
  }

  // ---- rename ----
  function startRename(labelEl, node) {
    labelEl.contentEditable = 'true';
    labelEl.focus();
    document.execCommand('selectAll', false, null);

    function commit() {
      labelEl.contentEditable = 'false';
      const newName = labelEl.textContent.trim() || node.name;
      labelEl.textContent = newName;
      node.name = newName;
      DB.put('nodes', node);
      if (node.id === STATE.currentBoardId) {
        document.getElementById('board-title').textContent = newName;
      }
      labelEl.removeEventListener('blur', commit);
      labelEl.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); labelEl.blur(); }
      if (e.key === 'Escape') { labelEl.textContent = node.name; labelEl.blur(); }
    }
    labelEl.addEventListener('blur', commit);
    labelEl.addEventListener('keydown', onKey);
  }

  // ---- delete ----
  async function deleteNode(node) {
    if (node.type === 'board') {
      node.deleted = true;
      await DB.put('nodes', node);
      STATE.nodes = STATE.nodes.filter(n => n.id !== node.id);
      if (STATE.currentBoardId === node.id) {
        STATE.currentBoardId = null;
        IMAGES.clearCanvasDom();
        document.getElementById('board-title').textContent = 'Selecione ou crie um board';
        document.getElementById('tools-container').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
      }
      render();
      TRASH.refresh();
      return;
    }

    // folder: permanent cascade delete
    const folderIds = descendantFolderIds(node.id);
    const boards = STATE.nodes.filter(n => n.type === 'board' && folderIds.includes(n.parentId));
    const subCount = folderIds.length - 1;
    const msg = (boards.length || subCount)
      ? `Excluir "${node.name}" também apagará permanentemente ${subCount} subpasta(s) e ${boards.length} board(s) com todas as suas imagens. Esta ação não pode ser desfeita. Continuar?`
      : `Excluir a pasta "${node.name}"?`;
    if (!confirm(msg)) return;

    for (const board of boards) {
      const imgs = await DB.getByIndex('images', 'boardId', board.id);
      for (const img of imgs) await DB.del('images', img.id);
      await DB.del('nodes', board.id);
    }
    for (const fid of folderIds) await DB.del('nodes', fid);

    STATE.nodes = STATE.nodes.filter(n => !folderIds.includes(n.id) && !(n.type === 'board' && folderIds.includes(n.parentId)));
    if (boards.some(b => b.id === STATE.currentBoardId)) {
      STATE.currentBoardId = null;
      IMAGES.clearCanvasDom();
      document.getElementById('board-title').textContent = 'Selecione ou crie um board';
      document.getElementById('tools-container').classList.add('hidden');
      document.getElementById('empty-state').classList.remove('hidden');
    }
    render();
  }

  // ---- drag & drop reorganize ----
  let dragNodeId = null;

  function setupDragDrop(row, node) {
    row.addEventListener('dragstart', (e) => {
      dragNodeId = node.id;
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragover', (e) => {
      if (!dragNodeId || dragNodeId === node.id) return;
      if (node.type !== 'folder') return;
      if (descendantFolderIds(dragNodeId).includes(node.id)) return; // no dropping a folder into itself
      e.preventDefault();
      row.classList.add('drop-target');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drop-target');
      if (!dragNodeId || dragNodeId === node.id || node.type !== 'folder') return;
      if (descendantFolderIds(dragNodeId).includes(node.id)) return;
      const dragged = getNode(dragNodeId);
      dragged.parentId = node.id;
      await DB.put('nodes', dragged);
      expanded.add(node.id);
      dragNodeId = null;
      render();
    });
  }

  // allow dropping on the root list to un-nest an item
  root.addEventListener('dragover', (e) => { if (dragNodeId) e.preventDefault(); });
  root.addEventListener('drop', async (e) => {
    if (e.target !== root || !dragNodeId) return;
    const dragged = getNode(dragNodeId);
    dragged.parentId = null;
    await DB.put('nodes', dragged);
    dragNodeId = null;
    render();
  });

  function openBoardUI(node) {
    STATE.currentBoardId = node.id;
    document.getElementById('board-title').textContent = node.name;
    document.getElementById('tools-container').classList.remove('hidden');
    document.getElementById('empty-state').classList.add('hidden');
    CANVAS.reset();
    render();
  }

  return { loadNodes, render, createFolder, createBoard };
})();

// --- HANDOFF: Etiqueta de Cliente e Miniaturas ---
window.editClientTag = function(node) {
    const newTag = prompt('Etiqueta do cliente:', node.clientTag || '');
    if (newTag !== null) {
        node.clientTag = newTag.trim();
        DB.put('nodes', node).then(() => { if (typeof renderTree === 'function') renderTree(); });
    }
};

window.toggleThumbnails = function() {
    const current = localStorage.getItem('showThumbnails');
    const newVal = current === 'false' ? 'true' : 'false';
    localStorage.setItem('showThumbnails', newVal);
    if (typeof renderTree === 'function') renderTree();
};

window.loadThumbnail = function(node, imgElement) {
    if (!node || node.type !== 'board' || !imgElement) return;
    const show = localStorage.getItem('showThumbnails') !== 'false';
    if (!show) { imgElement.style.display = 'none'; return; }
    if (typeof DB !== 'undefined' && DB.getAll) {
        DB.getAll('images').then(images => {
            const boardImg = images.find(img => img.boardId === node.id && !img.deleted);
            if (boardImg && boardImg.blob) {
                imgElement.src = URL.createObjectURL(boardImg.blob);
                imgElement.style.display = 'block';
            } else {
                imgElement.style.display = 'none';
            }
        });
    }
};