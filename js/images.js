/* ==========================================================================
   images.js — placing, moving, resizing, rotating and deleting images
   on the open board. Supports multi-select (shift+click / marquee)
   and group dragging. All manipulation uses Pointer Events with pointer
   capture so a stylus (Wacom, etc.) drags exactly like a mouse would,
   even if the pen tip lifts slightly or moves fast.
   ========================================================================== */

const IMAGES = (() => {
  const canvas = document.getElementById('canvas');
  const fileInput = document.getElementById('file-input');
  const GRID_MARGIN = 20;
  const MAX_COLS = 5;

  const els = new Map(); // imgId -> DOM element

  function organizeImagesInGrid(images) {
    if (!Array.isArray(images) || images.length === 0) return;

    const first = images[0];
    const cellWidth = (first.width || 280) + GRID_MARGIN;
    const cellHeight = (first.height || 280) + GRID_MARGIN;
    const cols = Math.min(images.length, MAX_COLS);

    images.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      img.x = col * cellWidth + GRID_MARGIN;
      img.y = row * cellHeight + GRID_MARGIN;

      const el = canvas.querySelector(`[data-id="${img.id}"]`);
      if (el) {
        el.style.left = img.x + 'px';
        el.style.top = img.y + 'px';
      }
      DB.put('images', img);
    });
  }

  // rotation + flip combined into one CSS transform. Flip is done purely
  // with scaleX/scaleY on the element — the original image file is never
  // touched or re-encoded, so there's no quality loss.
  function imageTransform(imgData) {
    const rot = imgData.rotation || 0;
    const flipX = imgData.flipH ? -1 : 1;
    const flipY = imgData.flipV ? -1 : 1;
    return `rotate(${rot}deg) scale(${flipX}, ${flipY})`;
  }

  function render(imgData) {
    const wrap = document.createElement('div');
    wrap.className = 'board-image';
    wrap.id = 'img-' + imgData.id;
    wrap.dataset.id = imgData.id;
    wrap.style.left = imgData.x + 'px';
    wrap.style.top = imgData.y + 'px';
    wrap.style.width = imgData.width + 'px';
    wrap.style.height = imgData.height ? imgData.height + 'px' : 'auto';
    wrap.style.zIndex = imgData.zIndex;
    wrap.style.transform = imageTransform(imgData);

    const img = document.createElement('img');
    if (imgData.blob) {
      img.src = URL.createObjectURL(imgData.blob);
    } else if (imgData.remoteUrl) {
      let crossed = true;
      img.crossOrigin = 'anonymous';
      img.src = imgData.remoteUrl;
      img.onerror = () => {
        if (!crossed) return;
        crossed = false;
        img.removeAttribute('crossorigin');
        img.src = imgData.remoteUrl;
      };
    }
    img.draggable = false;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.style.borderRadius = 'inherit';
    img.onload = () => {
      if (!imgData.height) {
        imgData.height = img.naturalHeight * (imgData.width / img.naturalWidth);
        wrap.style.height = imgData.height + 'px';
      }
    };
    wrap.appendChild(img);

    if (imgData.zIndex > STATE.highestZIndex) STATE.highestZIndex = imgData.zIndex;

    attachInteractions(wrap, imgData);
    canvas.appendChild(wrap);
    els.set(imgData.id, wrap);
  }

  function clearCanvasDom() {
    els.forEach(el => el.remove());
    els.clear();
  }

  function refreshSelectionClasses() {
    els.forEach((el, id) => el.classList.toggle('selected', STATE.selectedIds.has(id)));
    els.forEach((el, id) => {
      el.querySelectorAll('.image-handle, .rotate-stem').forEach(h => h.remove());
      if (STATE.selectedIds.has(id) && STATE.selectedIds.size === 1) {
        addHandles(el, STATE.images.find(i => i.id === id));
      }
    });
  }

  function addHandles(el, imgData) {
    const stem = document.createElement('div');
    stem.className = 'rotate-stem';
    el.appendChild(stem);

    const rotate = document.createElement('div');
    rotate.className = 'image-handle handle-rotate';
    el.appendChild(rotate);

    const resize = document.createElement('div');
    resize.className = 'image-handle handle-resize';
    el.appendChild(resize);

    attachRotateHandle(rotate, el, imgData);
    attachResizeHandle(resize, el, imgData);
  }

  function clearSelection() {
    STATE.selectedIds.clear();
    refreshSelectionClasses();
  }

  function select(id, additive) {
    if (!additive) STATE.selectedIds.clear();
    STATE.selectedIds.add(id);
    refreshSelectionClasses();
    bringToFront(id);
  }

  function selectWithinBounds(minX, minY, maxX, maxY) {
    STATE.selectedIds.clear();
    STATE.images.forEach(img => {
      const cx = img.x + img.width / 2;
      const cy = img.y + (img.height || img.width) / 2;
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        STATE.selectedIds.add(img.id);
      }
    });
    refreshSelectionClasses();
  }

  function bringToFront(id) {
    const img = STATE.images.find(i => i.id === id);
    if (!img) return;
    STATE.highestZIndex++;
    img.zIndex = STATE.highestZIndex;
    const el = els.get(id);
    if (el) el.style.zIndex = img.zIndex;
    DB.put('images', img);
  }

  function sendToBack(id) {
    const minZ = Math.min(...STATE.images.map(i => i.zIndex), 0);
    const img = STATE.images.find(i => i.id === id);
    if (!img) return;
    img.zIndex = minZ - 1;
    const el = els.get(id);
    if (el) el.style.zIndex = img.zIndex;
    DB.put('images', img);
  }

  // ---- dragging (single or group) ----
  function attachInteractions(el, imgData) {
    let dragging = false;
    let pointerId = null;
    let startX, startY;
    let originals = new Map(); // id -> {x,y}

    el.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('image-handle')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.stopPropagation();

      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      if (!STATE.selectedIds.has(imgData.id)) {
        select(imgData.id, additive);
      } else if (!additive && STATE.selectedIds.size <= 1) {
        select(imgData.id, false);
      }

      dragging = true;
      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      startX = e.clientX;
      startY = e.clientY;
      originals.clear();
      STATE.selectedIds.forEach(id => {
        const im = STATE.images.find(i => i.id === id);
        if (im) originals.set(id, { x: im.x, y: im.y });
      });
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const scale = CANVAS.getTransform().scale;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      originals.forEach((pos, id) => {
        const im = STATE.images.find(i => i.id === id);
        const elm = els.get(id);
        if (!im || !elm) return;
        im.x = pos.x + dx;
        im.y = pos.y + dy;
        elm.style.left = im.x + 'px';
        elm.style.top = im.y + 'px';
      });
    });

    function endDrag(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      try { el.releasePointerCapture(pointerId); } catch (_) {}
      originals.forEach((_, id) => {
        const im = STATE.images.find(i => i.id === id);
        if (im) DB.put('images', im);
      });
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  function attachResizeHandle(handle, el, imgData) {
    let resizing = false;
    let pointerId = null;
    let startX, startW, startH;

    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      resizing = true;
      pointerId = e.pointerId;
      handle.setPointerCapture(pointerId);
      startX = e.clientX;
      startW = imgData.width; startH = imgData.height || imgData.width;
    });

    handle.addEventListener('pointermove', (e) => {
      if (!resizing || e.pointerId !== pointerId) return;
      const scale = CANVAS.getTransform().scale;
      const dx = (e.clientX - startX) / scale;
      const ratio = startH / startW;
      const newW = Math.max(40, startW + dx);
      const newH = newW * ratio;
      imgData.width = newW;
      imgData.height = newH;
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
    });

    function endResize(e) {
      if (!resizing || e.pointerId !== pointerId) return;
      resizing = false;
      try { handle.releasePointerCapture(pointerId); } catch (_) {}
      DB.put('images', imgData);
    }
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
  }

  function attachRotateHandle(handle, el, imgData) {
    let rotating = false;
    let pointerId = null;
    let center;

    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      rotating = true;
      pointerId = e.pointerId;
      handle.setPointerCapture(pointerId);
      const rect = el.getBoundingClientRect();
      center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

    handle.addEventListener('pointermove', (e) => {
      if (!rotating || e.pointerId !== pointerId) return;
      const angle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI) + 90;
      imgData.rotation = Math.round(angle);
      el.style.transform = imageTransform(imgData);
    });

    function endRotate(e) {
      if (!rotating || e.pointerId !== pointerId) return;
      rotating = false;
      try { handle.releasePointerCapture(pointerId); } catch (_) {}
      DB.put('images', imgData);
    }
    handle.addEventListener('pointerup', endRotate);
    handle.addEventListener('pointercancel', endRotate);
  }

  // ---- delete (soft) / restore ----
  async function deleteSelected() {
    if (STATE.selectedIds.size === 0) return;
    const ids = [...STATE.selectedIds];
    for (const id of ids) {
      const img = STATE.images.find(i => i.id === id);
      if (!img) continue;
      img.deleted = true;
      img.deletedAt = Date.now();
      img.deletedFrom = img.boardId;
      await DB.put('images', img);
      const el = els.get(id);
      if (el) el.remove();
      els.delete(id);
    }
    STATE.images = STATE.images.filter(i => !ids.includes(i.id));
    STATE.selectedIds.clear();
    TRASH.refresh();
  }

  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Delete' || e.code === 'Backspace') &&
        document.activeElement.tagName !== 'INPUT' &&
        !document.activeElement.isContentEditable &&
        STATE.selectedIds.size > 0) {
      e.preventDefault();
      deleteSelected();
    }
  });

  document.getElementById('btn-delete').addEventListener('click', deleteSelected);
  document.getElementById('btn-front').addEventListener('click', () => {
    STATE.selectedIds.forEach(bringToFront);
  });
  document.getElementById('btn-back').addEventListener('click', () => {
    STATE.selectedIds.forEach(sendToBack);
  });

  // ---- mirror (flip) selected images ----
  function flipSelected(axis) {
    if (STATE.selectedIds.size === 0) return;
    STATE.selectedIds.forEach(id => {
      const img = STATE.images.find(i => i.id === id);
      const el = els.get(id);
      if (!img || !el) return;
      if (axis === 'h') img.flipH = !img.flipH;
      else img.flipV = !img.flipV;
      el.style.transform = imageTransform(img);
      DB.put('images', img);
    });
  }
  const btnFlipH = document.getElementById('btn-flip-h');
  const btnFlipV = document.getElementById('btn-flip-v');
  if (btnFlipH) btnFlipH.addEventListener('click', () => flipSelected('h'));
  if (btnFlipV) btnFlipV.addEventListener('click', () => flipSelected('v'));

  // ---- align + uniform size for the selection ----
  // Sizes every selected image to the same WIDTH (the first-selected
  // image's current width), each keeping its own original aspect ratio —
  // sizing only ever changes the on-screen width/height (CSS), never
  // touches the stored file, so there is no quality loss. Then lines them
  // up left-to-right with a fixed gap, at the row's current top.
  const GAP = 24;
  function alignAndUniformSize() {
    const ids = [...STATE.selectedIds];
    if (ids.length < 2) { alert('Selecione 2 ou mais imagens (Shift+clique ou arraste um retângulo) para alinhar e uniformizar.'); return; }

    const imgs = ids.map(id => STATE.images.find(i => i.id === id)).filter(Boolean);
    const targetWidth = imgs[0].width;
    const top = Math.min(...imgs.map(i => i.y));
    let cursorX = Math.min(...imgs.map(i => i.x));

    imgs.forEach(img => {
      const aspect = (img.height || img.width) / img.width;
      img.width = targetWidth;
      img.height = targetWidth * aspect;
      img.x = cursorX;
      img.y = top;
      cursorX += targetWidth + GAP;

      const el = els.get(img.id);
      if (el) {
        el.style.width = img.width + 'px';
        el.style.height = img.height + 'px';
        el.style.left = img.x + 'px';
        el.style.top = img.y + 'px';
      }
      DB.put('images', img);
    });
  }
  const btnAlign = document.getElementById('btn-align-uniform');
  if (btnAlign) btnAlign.addEventListener('click', alignAndUniformSize);

  // ---- shared "add one image to the open board" core ----
  // every entry point (upload, paste, URL, HTML parse, .txt list) funnels
  // through this, so they all get the same placement/z-index/persist logic.
  async function addImageBlob(blob, atWorldPos) {
    if (!STATE.currentBoardId) return { ok: false, reason: 'no-board' };
    STATE.highestZIndex++;
    const bmp = await createImageBitmap(blob).catch(() => null);
    const aspect = bmp ? bmp.height / bmp.width : 1;
    const width = 280;
    const center = atWorldPos || CANVAS.viewportCenterWorld();
    const imgData = {
      id: uid('img'),
      boardId: STATE.currentBoardId,
      blob,
      x: center.x + (Math.random() * 360 - 180),
      y: center.y + (Math.random() * 360 - 180),
      width,
      height: width * aspect,
      rotation: 0,
      zIndex: STATE.highestZIndex,
      deleted: false,
    };
    STATE.images.push(imgData);
    await DB.put('images', imgData);
    render(imgData);
    return { ok: true, imgData };
  }

  // a remote image we couldn't (or didn't try to) fetch as bytes — still
  // shown via <img src>, but won't survive a browser cache clear / export
  // backup the way a stored blob does. Used only as a fallback.
  async function addImageRemote(url) {
    if (!STATE.currentBoardId) return { ok: false, reason: 'no-board' };
    STATE.highestZIndex++;
    const center = CANVAS.viewportCenterWorld();
    const imgData = {
      id: uid('img'),
      boardId: STATE.currentBoardId,
      remoteUrl: url,
      x: center.x + (Math.random() * 360 - 180),
      y: center.y + (Math.random() * 360 - 180),
      width: 280,
      height: 280,
      rotation: 0,
      zIndex: STATE.highestZIndex,
      deleted: false,
    };
    STATE.images.push(imgData);
    await DB.put('images', imgData);
    render(imgData);
    return { ok: true };
  }

  const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp)(\?.*)?$/i;
  const PINIMG_RE = /pinimg\.com/i;

  const importModal = document.getElementById('import-modal');
  const importInputText = document.getElementById('import-input-text');
  const importStatus = document.getElementById('import-status');

  function showImportModal() {
    if (!importModal) return;
    importModal.classList.remove('hidden');
    importModal.setAttribute('aria-hidden', 'false');
    if (importInputText) {
      importInputText.value = '';
      importInputText.focus();
    }
    if (importStatus) {
      importStatus.className = 'import-status hidden';
      importStatus.textContent = '';
    }
  }

  function hideImportModal() {
    if (!importModal) return;
    importModal.classList.add('hidden');
    importModal.setAttribute('aria-hidden', 'true');
  }

  function showImportStatus(message, type = 'info') {
    if (!importStatus) return;
    importStatus.textContent = message;
    importStatus.className = 'import-status ' + type;
    importStatus.classList.remove('hidden');
  }

  async function processImport() {
    if (!importInputText) return;
    const input = importInputText.value.trim();
    if (!input) {
      showImportStatus('Cole um link, URLs ou HTML do Pinterest antes de processar.', 'error');
      return;
    }

    const lines = input
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      showImportStatus('Nada foi enviado no campo de importação.', 'error');
      return;
    }

    const htmlLike = input.includes('<html') || input.includes('<img') || /<\/?[a-z][\s\S]*>/i.test(input);
    if (htmlLike) {
      const urls = extractPinterestUrls(input);
      if (!urls.length) {
        showImportStatus('Nenhuma imagem do Pinterest foi encontrada no HTML informado.', 'error');
        return;
      }
      showImportStatus(`Encontradas ${urls.length} imagens. Baixando...`, 'info');
      const result = await addManyFromURLs(urls, (done, total) => {
        if (importStatus) showImportStatus(`Baixando ${done}/${total}...`, 'info');
      });
      showImportStatus(`${result.added} de ${result.total} imagens importadas.`, 'success');
      setTimeout(hideImportModal, 1800);
      return;
    }

    const directUrls = lines.filter(line => /^https?:\/\//i.test(line));
    if (directUrls.length > 0) {
      const urls = directUrls.filter(l => isImageUrl(l) || /pinimg\.com/i.test(l));
      if (!urls.length) {
        showImportStatus('Nenhuma URL válida de imagem foi detectada.', 'error');
        return;
      }
      showImportStatus(`Encontradas ${urls.length} URLs. Baixando...`, 'info');
      const result = await addManyFromURLs(urls, (done, total) => {
        if (importStatus) showImportStatus(`Baixando ${done}/${total}...`, 'info');
      });
      showImportStatus(`${result.added} de ${result.total} imagens importadas.`, 'success');
      setTimeout(hideImportModal, 1800);
      return;
    }

    if (/^https?:\/\/(www\.)?pinterest\.com/i.test(input)) {
      try {
        const res = await fetch(input, { mode: 'cors' });
        if (!res.ok) throw new Error('blocked');
        const html = await res.text();
        const urls = extractPinterestUrls(html);
        if (urls.length > 0) {
          const result = await addManyFromURLs(urls, (done, total) => {
            if (importStatus) showImportStatus(`Baixando ${done}/${total}...`, 'info');
          });
          showImportStatus(`${result.added} de ${result.total} imagens importadas.`, 'success');
          setTimeout(hideImportModal, 1800);
          return;
        }
      } catch (err) {
        showImportStatus(
          'O Pinterest bloqueou o fetch direto do board. Abra a página, role até o fim, copie o HTML com F12 e cole aqui.',
          'info'
        );
        return;
      }
    }

    showImportStatus('Formato não reconhecido. Cole URLs de imagens, HTML do Pinterest ou o link do board.', 'error');
  }

  function isImageUrl(url) {
    return IMAGE_EXT_RE.test(url) || PINIMG_RE.test(url);
  }

  // try to actually download the bytes (works for most CDNs, including
  // Pinterest's pinimg.com — that's the whole point of the pinimg.com
  // rewrite in extractPinterestUrls). If the fetch is blocked (CORS,
  // network, or it just isn't a direct image link), fall back to a
  // remote-reference image instead of failing outright.
  async function addImageFromURL(url) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('http ' + res.status);
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('not an image');
      return await addImageBlob(blob);
    } catch (err) {
      return await addImageRemote(url);
    }
  }

  // parse pasted Pinterest page HTML (or an uploaded .html file's contents)
  // and pull out the pin image URLs, upgraded to their highest-res variant
  // when the URL pattern allows it, skipping obvious avatar/icon sizes.
  function extractPinterestUrls(htmlText) {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const found = new Set();
    doc.querySelectorAll('img').forEach(img => {
      const candidates = [];
      if (img.src) candidates.push(img.src);
      if (img.srcset) {
        img.srcset.split(',').forEach(part => {
          const u = part.trim().split(/\s+/)[0];
          if (u) candidates.push(u);
        });
      }
      candidates.forEach(u => {
        if (!/pinimg\.com/i.test(u)) return;
        if (/\/(30x30|60x60|75x75|140x140|170x|236x)\//.test(u)) return; // avatars/icons/tiny thumbs
        found.add(u.replace(/\/\d+x\d*\//, '/originals/'));
      });
    });
    return [...found];
  }

  async function addManyFromURLs(urls, onProgress) {
    let done = 0, remote = 0, skipped = [];
    for (const url of urls) {
      const result = await addImageFromURL(url).catch(() => ({ ok: false }));
      if (result.ok) done++;
      if (onProgress) onProgress(++remote, urls.length);
    }
    return { added: done, total: urls.length, skipped };
  }

  // ---- upload from disk ----
  fileInput.addEventListener('change', async (e) => {
    if (!STATE.currentBoardId) { alert('Selecione ou crie um board primeiro.'); return; }
    const files = [...e.target.files].filter(f => f.type.startsWith('image/'));
    const newImages = [];

    for (const file of files) {
      const result = await addImageBlob(file);
      if (result && result.imgData) newImages.push(result.imgData);
    }

    if (newImages.length > 1) {
      organizeImagesInGrid(newImages);
    }

    e.target.value = '';
  });

  // ---- paste: Ctrl+V — image data straight from clipboard, or a
  // plain-text image URL, or (if it looks like markup) Pinterest HTML ----
  document.addEventListener('paste', async (e) => {
    const typing = document.activeElement.tagName === 'INPUT' ||
                   document.activeElement.tagName === 'TEXTAREA' ||
                   document.activeElement.isContentEditable;
    if (typing) return; // let normal paste happen in text fields (renaming etc.)
    if (!STATE.currentBoardId) return;

    const items = e.clipboardData ? [...e.clipboardData.items] : [];
    const imageItem = items.find(it => it.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) await addImageBlob(blob);
      return;
    }

    const text = e.clipboardData ? e.clipboardData.getData('text/plain').trim() : '';
    if (!text) return;

    if (/^https?:\/\/\S+$/i.test(text) && isImageUrl(text)) {
      e.preventDefault();
      await addImageFromURL(text);
      return;
    }
    if (/<img[\s>]/i.test(text) || /pinimg\.com/i.test(text)) {
      e.preventDefault();
      const urls = extractPinterestUrls(text);
      if (urls.length === 0) { alert('Não encontrei imagens de pin nesse HTML colado.'); return; }
      const { added, total } = await addManyFromURLs(urls);
      alert(`${added} de ${total} imagens do Pinterest adicionadas ao board.`);
    }
  });

  // ---- "Colar link" toolbar button: one direct image URL via prompt ----
  const addUrlBtn = document.getElementById('btn-add-url');
  if (addUrlBtn) {
    addUrlBtn.addEventListener('click', async () => {
      if (!STATE.currentBoardId) { alert('Selecione ou crie um board primeiro.'); return; }
      const url = prompt('Cole o link direto de uma imagem (termina em .jpg, .png, .webp...), ou cole o HTML da página de um board do Pinterest para importar várias de uma vez:');
      if (!url) return;
      const trimmed = url.trim();
      if (/<img[\s>]/i.test(trimmed) || /pinimg\.com/i.test(trimmed)) {
        const urls = extractPinterestUrls(trimmed);
        if (urls.length === 0) { alert('Não encontrei imagens de pin nesse texto.'); return; }
        const { added, total } = await addManyFromURLs(urls);
        alert(`${added} de ${total} imagens adicionadas.`);
        return;
      }
      const result = await addImageFromURL(trimmed);
      if (result.ok === false) alert('Não consegui adicionar essa imagem.');
    });
  }

  // ---- "Importar lista de links (.txt)" ----
  // one URL per line. Direct image links are fetched automatically.
  // Pinterest pin/board *page* links can't be fetched from the browser
  // (Pinterest blocks cross-site requests to its HTML pages) — the
  // fallback for those is to open them in new tabs so the user can save
  // the image manually (right-click → salvar imagem), instead of just
  // failing silently.
  const btnImportPinterest = document.getElementById('btn-import-pinterest');
  if (btnImportPinterest) {
    btnImportPinterest.addEventListener('click', () => {
      if (!STATE.currentBoardId) {
        alert('Selecione ou crie um board primeiro.');
        return;
      }
      showImportModal();
    });
  }

  const btnImportProcess = document.getElementById('btn-import-process');
  if (btnImportProcess) {
    btnImportProcess.addEventListener('click', processImport);
  }

  const btnImportCancel = document.getElementById('btn-import-cancel');
  if (btnImportCancel) {
    btnImportCancel.addEventListener('click', hideImportModal);
  }

  if (importModal) {
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) hideImportModal();
    });
  }

  async function loadBoard(boardId) {
    clearCanvasDom();
    STATE.selectedIds.clear();
    const all = await DB.getByIndex('images', 'boardId', boardId);
    STATE.images = all.filter(i => !i.deleted);
    STATE.images.forEach(render);
  }

  return {
    render,
    clearCanvasDom,
    clearSelection,
    select,
    selectWithinBounds,
    loadBoard,
    deleteSelected,
    addImageBlob,
    addImageRemote,
    addImageFromURL,
    organizeImagesInGrid
  };
})();


// --- HANDOFF: Exportação do Board ---
window.exportBoard = async function() {
    if (!STATE || !STATE.currentBoardId) { alert('Selecione um board primeiro.'); return; }
    const activeImages = (STATE.images || []).filter(img => img.boardId === STATE.currentBoardId && !img.deleted);
    if (activeImages.length === 0) { alert('Nenhuma imagem neste board.'); return; }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    activeImages.forEach(img => {
        minX = Math.min(minX, img.x); minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + (img.width || 100));
        maxY = Math.max(maxY, img.y + (img.height || 100));
    });

    const worldWidth = maxX - minX;
    const worldHeight = maxY - minY;
    const scale = Math.min(1, 4000 / Math.max(worldWidth, worldHeight));
    
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(worldWidth * scale);
    canvas.height = Math.round(worldHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let failedUrls = 0;
    for (const img of activeImages.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))) {
        try {
            const imageEl = await new Promise((resolve, reject) => {
                const el = new Image();
                el.crossOrigin = 'anonymous';
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('CORS ou falha de carregamento'));
                if (img.blob) {
                    el.src = URL.createObjectURL(img.blob);
                } else if (img.remoteUrl) {
                    el.src = img.remoteUrl;
                } else {
                    reject(new Error('Sem blob ou remoteUrl'));
                }
            });
            const cx = (img.x - minX) * scale;
            const cy = (img.y - minY) * scale;
            const w = (img.width || 100) * scale;
            const h = (img.height || 100) * scale;
            const scaleX = img.flipH ? -1 : 1;
            const scaleY = img.flipV ? -1 : 1;
            ctx.save();
            ctx.translate(cx + w/2, cy + h/2);
            ctx.rotate((img.rotation || 0) * Math.PI / 180);
            ctx.scale(scaleX, scaleY);
            ctx.drawImage(imageEl, -w/2, -h/2, w, h);
            ctx.restore();
        } catch (err) {
            console.warn('Falha ao exportar imagem:', img.id, err);
            failedUrls++;
        }
    }

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'board-export.png';
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');

    if (failedUrls > 0) {
        alert(`Exportação concluída, mas ${failedUrls} imagem(ns) com link externo falharam (provável bloqueio CORS).`);
    }
};