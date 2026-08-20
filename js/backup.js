/* ==========================================================================
   backup.js — export everything (folders, boards, images, trash) to a
   single .json file the user keeps somewhere safe, and re-import it later.

   Import always MERGES by id (DB.put upserts) — it never deletes anything
   that already exists locally. Re-importing the same backup twice is safe
   (idempotent): ids match, records just get overwritten with the same data.

   Images are stored as base64 inside the JSON so the whole backup is one
   portable file with no external references, at the cost of being ~33%
   bigger than the raw bytes. For a personal moodboard that trade-off is
   worth the simplicity — no zip library, no dependencies, works fully
   offline.
   ========================================================================== */

const BACKUP = (() => {
  let exportTimer = null;
  let lastSerialized = '';
  let pendingSerialized = '';
  let lastExportOk = false;

  function setSaveStatus(text, failed) {
    const status = document.getElementById('save-status');
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('save-status-error', !!failed);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data: URL
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function exportBackup() {
    const json = await serializeBackup();
    const payload = JSON.parse(json);
    const { nodes, images, palette } = payload;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `moodboard-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return { nodeCount: nodes.length, imageCount: images.length, paletteCount: palette.length };
  }

  async function serializeBackup() {
    const nodes = await DB.getAll('nodes');
    const rawImages = await DB.getAll('images');
    const palette = await DB.getAll('palette');

    const images = [];
    for (const img of rawImages) {
      const entry = { ...img };
      if (img.blob) {
        entry.blobBase64 = await blobToBase64(img.blob);
        delete entry.blob;
      }
      images.push(entry);
    }

    const payload = {
      format: 'moodboard-studio-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes,
      images,
      palette,
    };

    return JSON.stringify(payload);
  }

  async function pushExport() {
    const json = pendingSerialized || await serializeBackup();
    pendingSerialized = '';
    if (json === lastSerialized && lastExportOk) return true;
    try {
      const response = await fetch('/export-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      lastSerialized = json;
      lastExportOk = true;
      const now = new Date().toLocaleTimeString('pt-BR', { hour12: false });
      setSaveStatus(`salvo ${now}`, false);
      if (typeof DIAGNOSTICS !== 'undefined' && DIAGNOSTICS.setExportState) DIAGNOSTICS.setExportState(true);
      return true;
    } catch (error) {
      lastExportOk = false;
      setSaveStatus('export falhou', true);
      if (typeof DIAGNOSTICS !== 'undefined' && DIAGNOSTICS.setExportState) DIAGNOSTICS.setExportState(false);
      console.warn('Exportação contínua falhou:', error);
      return false;
    }
  }

  function scheduleExport() {
    lastExportOk = false;
    serializeBackup().then(json => { pendingSerialized = json; }).catch(error => {
      console.warn('Não foi possível preparar exportação:', error);
    });
    clearTimeout(exportTimer);
    exportTimer = setTimeout(() => { pushExport(); }, 1500);
  }

  function sendPendingExport() {
    if (lastExportOk && !pendingSerialized) return;
    if (navigator.sendBeacon) {
      const payload = pendingSerialized || lastSerialized;
      if (payload) navigator.sendBeacon('/export-backup', new Blob([payload], { type: 'application/json' }));
    }
  }

  async function importBackup(file) {
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw new Error('Arquivo não é um backup válido (JSON inválido).');
    }
    if (payload.format !== 'moodboard-studio-backup' || !Array.isArray(payload.nodes) || !Array.isArray(payload.images)) {
      throw new Error('Arquivo não parece ser um backup do Moodboard Studio.');
    }

    for (const node of payload.nodes) {
      await DB.put('nodes', node);
    }

    for (const entry of payload.images) {
      const record = { ...entry };
      if (record.blobBase64) {
        record.blob = await dataUrlToBlob(record.blobBase64);
        delete record.blobBase64;
      }
      await DB.put('images', record);
    }

    // older backups (before the color palette existed) won't have this key —
    // that's fine, just nothing to restore
    for (const color of (payload.palette || [])) {
      await DB.put('palette', color);
    }

    return { nodeCount: payload.nodes.length, imageCount: payload.images.length, paletteCount: (payload.palette || []).length };
  }

  // Best-effort: ask the browser not to evict this site's storage under
  // pressure. Silent — browsers may ignore it depending on engagement
  // heuristics, and that's fine, it's just an extra layer of safety.
  async function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try { await navigator.storage.persist(); } catch (_) {}
    }
  }

  window.scheduleExportHook = scheduleExport;
  window.addEventListener('pagehide', sendPendingExport);

  return { exportBackup, importBackup, requestPersistence, serializeBackup, pushExport, scheduleExport };
})();
