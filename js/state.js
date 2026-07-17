/* ==========================================================================
   state.js — single source of truth in memory, mirrored to IndexedDB.
   ========================================================================== */

const STATE = {
  nodes: [],           // all folders + boards (not deleted)
  currentBoardId: null,
  images: [],           // images belonging to the open board (not deleted)
  selectedIds: new Set(),
  highestZIndex: 10,
};

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getNode(id) {
  return STATE.nodes.find(n => n.id === id);
}

function childrenOf(parentId) {
  return STATE.nodes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'folder' ? -1 : 1)));
}

// collect a folder id + every descendant folder id (used for cascade delete)
function descendantFolderIds(folderId) {
  const out = [folderId];
  childrenOf(folderId).filter(n => n.type === 'folder').forEach(f => {
    out.push(...descendantFolderIds(f.id));
  });
  return out;
}

function boardsUnder(folderId) {
  const folderIds = descendantFolderIds(folderId);
  return STATE.nodes.filter(n => n.type === 'board' && folderIds.includes(n.parentId));
}
