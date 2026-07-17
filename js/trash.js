/* ==========================================================================
   trash.js — recoverable bin for deleted images and deleted boards.
   ========================================================================== */

const TRASH = (() => {
  const list = document.getElementById('trash-list');

  async function refresh() {
    list.innerHTML = '';
    const allImages = await DB.getAll('images');
    const deletedImages = allImages.filter(i => i.deleted);
    const deletedBoards = (await DB.getAll('nodes')).filter(n => n.type === 'board' && n.deleted);

    if (deletedImages.length === 0 && deletedBoards.length === 0) {
      list.innerHTML = '<p class="trash-empty">A lixeira está vazia.</p>';
      return;
    }

    deletedBoards.forEach(board => list.appendChild(boardRow(board)));
    deletedImages.forEach(img => list.appendChild(imageRow(img)));
  }

  function boardRow(board) {
    const row = document.createElement('div');
    row.className = 'trash-item';

    const icon = document.createElement('div');
    icon.className = 'trash-thumb';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.fontSize = '10px';
    icon.style.color = 'var(--text-muted)';
    icon.textContent = 'Board';

    const meta = document.createElement('div');
    meta.className = 'trash-meta';
    meta.innerHTML = `<div class="trash-name">${board.name}</div><div class="trash-sub">Board inteiro</div>`;

    const actions = document.createElement('div');
    actions.className = 'trash-actions';
    actions.appendChild(actionBtn('Restaurar', async () => {
      board.deleted = false;
      await DB.put('nodes', board);
      STATE.nodes.push(board);
      TREE.render();
      refresh();
    }));
    actions.appendChild(actionBtn('Apagar', async () => {
      if (!confirm(`Apagar permanentemente o board "${board.name}" e todas as suas imagens?`)) return;
      const imgs = await DB.getByIndex('images', 'boardId', board.id);
      for (const im of imgs) await DB.del('images', im.id);
      await DB.del('nodes', board.id);
      refresh();
    }));

    row.append(icon, meta, actions);
    return row;
  }

  function imageRow(img) {
    const row = document.createElement('div');
    row.className = 'trash-item';

    const thumb = document.createElement('img');
    thumb.className = 'trash-thumb';
    thumb.src = URL.createObjectURL(img.blob);

    const originBoard = getNode(img.deletedFrom || img.boardId);
    const meta = document.createElement('div');
    meta.className = 'trash-meta';
    meta.innerHTML = `<div class="trash-name">Imagem</div><div class="trash-sub">de ${originBoard ? originBoard.name : 'board removido'}</div>`;

    const actions = document.createElement('div');
    actions.className = 'trash-actions';
    actions.appendChild(actionBtn('Restaurar', async () => {
      img.deleted = false;
      await DB.put('images', img);
      if (img.boardId === STATE.currentBoardId) {
        STATE.images.push(img);
        IMAGES.render(img);
      }
      refresh();
    }));
    actions.appendChild(actionBtn('Apagar', async () => {
      await DB.del('images', img.id);
      refresh();
    }));

    row.append(thumb, meta, actions);
    return row;
  }

  function actionBtn(label, handler) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', handler);
    return b;
  }

  async function emptyTrash() {
    const allImages = await DB.getAll('images');
    const deletedImages = allImages.filter(i => i.deleted);
    const deletedBoards = (await DB.getAll('nodes')).filter(n => n.type === 'board' && n.deleted);
    if (deletedImages.length === 0 && deletedBoards.length === 0) return;
    if (!confirm('Esvaziar a lixeira? Esta ação não pode ser desfeita.')) return;

    for (const im of deletedImages) await DB.del('images', im.id);
    for (const board of deletedBoards) {
      const imgs = await DB.getByIndex('images', 'boardId', board.id);
      for (const im of imgs) await DB.del('images', im.id);
      await DB.del('nodes', board.id);
    }
    refresh();
  }

  document.getElementById('btn-empty-trash').addEventListener('click', emptyTrash);

  return { refresh };
})();
