/* ==========================================================================
   canvas.js — infinite canvas: pan, zoom, rulers, marquee (rubber-band) select.

   Uses Pointer Events throughout (not mouse events) so a Wacom/graphics-tablet
   pen behaves the same as a mouse, including pointer capture during drags.

   Zoom anchoring: the canvas is positioned with `top:50%;left:50%` and
   transform: translate(panX,panY) scale(scale), transform-origin 0 0.
   So a canvas-space point (wx,wy) lands on screen at:
     screenX = rect.left + rect.width/2 + panX + wx*scale
   To keep the point under the cursor fixed while zooming, panX must be
   solved for *after* subtracting the current panX from the cursor offset —
   forgetting that (as an earlier version did) makes the zoom anchor drift
   towards wherever panX/panY happened to be zero, i.e. it looks like it
   always zooms toward the canvas' original center instead of the cursor.

   Tools, Photoshop-style:
     - Pan (H / toolbar): drag anywhere to move the canvas.
     - Zoom (Z / toolbar): click to zoom in, Alt+click to zoom out,
       drag to draw a box and zoom to fit it.
     - Space held, or middle-click drag: pan regardless of active tool.
   ========================================================================== */

const CANVAS = (() => {
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('canvas');
  const zoomReadout = document.getElementById('zoom-level');
  const marquee = document.getElementById('marquee');
  const panModeBtn = document.getElementById('btn-pan-mode');
  const zoomModeBtn = document.getElementById('btn-zoom-mode');

  let transform = { scale: 1, panX: 0, panY: 0 };
  let spaceDown = false;
  let panMode = false;
  let zoomMode = false;
  let isPanning = false;
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 };
  let marqueeStart = null;
  let marqueePurpose = null; // 'select' | 'zoom'
  let activePointerId = null;
  const CLICK_THRESHOLD = 5; // px of movement before a click becomes a drag

  function apply() {
    canvas.style.transform = `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.scale})`;
    zoomReadout.textContent = Math.round(transform.scale * 100) + '%';
    const size = 20 * transform.scale;
    const major = 100 * transform.scale;
    viewport.style.backgroundPosition =
      `${transform.panX}px ${transform.panY}px, ${transform.panX}px ${transform.panY}px, ${transform.panX}px ${transform.panY}px, ${transform.panX}px ${transform.panY}px`;
    viewport.style.backgroundSize = `${size}px ${size}px, ${size}px ${size}px, ${major}px ${major}px, ${major}px ${major}px`;
  }

  function reset() {
    // if something is selected, center on it instead of the empty stage origin
    if (typeof STATE !== 'undefined' && STATE.selectedIds && STATE.selectedIds.size > 0) {
      const selected = STATE.images.filter(img => STATE.selectedIds.has(img.id));
      if (selected.length > 0) {
        const minX = Math.min(...selected.map(i => i.x));
        const minY = Math.min(...selected.map(i => i.y));
        const maxX = Math.max(...selected.map(i => i.x + i.width));
        const maxY = Math.max(...selected.map(i => i.y + (i.height || i.width)));
        zoomToWorldRect(minX, minY, maxX, maxY);
        return;
      }
    }
    transform = { scale: 1, panX: 0, panY: 0 };
    apply();
  }

  function zoomBy(factor) {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  // anchor a zoom at a screen point, keeping the canvas point under it fixed
  function zoomAt(clientX, clientY, factor) {
    const rect = viewport.getBoundingClientRect();
    const offsetX = clientX - rect.left - rect.width / 2; // cursor pos relative to viewport center
    const offsetY = clientY - rect.top - rect.height / 2;

    const newScale = Math.max(0.1, Math.min(transform.scale * factor, 8));

    // canvas-space point currently under the cursor
    const worldX = (offsetX - transform.panX) / transform.scale;
    const worldY = (offsetY - transform.panY) / transform.scale;

    transform.panX = offsetX - worldX * newScale;
    transform.panY = offsetY - worldY * newScale;
    transform.scale = newScale;
    apply();
  }

  // zoom + pan so a world-space rectangle fills the viewport
  function zoomToWorldRect(minX, minY, maxX, maxY) {
    const w = Math.max(maxX - minX, 10);
    const h = Math.max(maxY - minY, 10);
    const rect = viewport.getBoundingClientRect();
    const padding = 0.9; // leave a little breathing room
    const newScale = Math.max(0.1, Math.min((rect.width / w) * padding, (rect.height / h) * padding, 8));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    transform.scale = newScale;
    transform.panX = -cx * newScale;
    transform.panY = -cy * newScale;
    apply();
  }

  function viewportCenterWorld() {
    return { x: -transform.panX / transform.scale, y: -transform.panY / transform.scale };
  }

  function clientToWorld(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    return { x: (cx - transform.panX) / transform.scale, y: (cy - transform.panY) / transform.scale };
  }

  function setPanMode(on) {
    panMode = on;
    if (on) setZoomMode(false, true);
    panModeBtn.classList.toggle('active', on);
    viewport.classList.toggle('space-down', on);
  }

  function setZoomMode(on, skipPanClear) {
    zoomMode = on;
    if (on && !skipPanClear) setPanMode(false);
    zoomModeBtn.classList.toggle('active', on);
    viewport.classList.toggle('zoom-mode', on);
  }

  // ---- keyboard: Space to pan, H = Pan tool, Z = Zoom tool (Photoshop-style) ----
  window.addEventListener('keydown', (e) => {
    const typing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
    if (typing) return;

    if (e.code === 'Space' && !spaceDown) {
      spaceDown = true;
      viewport.classList.add('space-down');
      e.preventDefault();
    }
    if (e.code === 'KeyH') setPanMode(!panMode);
    if (e.code === 'KeyZ') setZoomMode(!zoomMode);
    if (e.code === 'KeyV') { setPanMode(false); setZoomMode(false); }
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      if (zoomMode) viewport.classList.add('zoom-out-cursor');
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceDown = false;
      isPanning = false;
      if (!panMode) viewport.classList.remove('space-down');
      viewport.classList.remove('panning');
    }
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      viewport.classList.remove('zoom-out-cursor');
    }
  });

  panModeBtn.addEventListener('click', () => setPanMode(!panMode));
  zoomModeBtn.addEventListener('click', () => setZoomMode(!zoomMode));

  // a pen's barrel button otherwise triggers the OS context menu mid-drag
  viewport.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- pointer-driven pan / zoom-click / zoom-drag / marquee-select ----
  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.board-image') || e.target.closest('.image-handle')) return;

    const shouldPan = spaceDown || panMode || e.button === 1;
    if (shouldPan) {
      isPanning = true;
      activePointerId = e.pointerId;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('panning');
      panStart = { x: e.clientX, y: e.clientY, panX: transform.panX, panY: transform.panY };
      e.preventDefault();
      return;
    }

    if (e.button !== 0 && e.pointerType === 'mouse') return;

    activePointerId = e.pointerId;
    viewport.setPointerCapture(e.pointerId);

    if (zoomMode) {
      marqueePurpose = 'zoom';
      startMarquee(e, false);
      return;
    }

    IMAGES.clearSelection();
    marqueePurpose = 'select';
    startMarquee(e, true);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointerId) return;
    if (isPanning) {
      transform.panX = panStart.panX + (e.clientX - panStart.x);
      transform.panY = panStart.panY + (e.clientY - panStart.y);
      apply();
      return;
    }
    if (marqueeStart) updateMarquee(e);
  });

  function endPointerInteraction(e) {
    if (e.pointerId !== activePointerId) return;
    if (isPanning) {
      isPanning = false;
      viewport.classList.remove('panning');
    }
    if (marqueeStart) endMarquee(e);
    try { viewport.releasePointerCapture(e.pointerId); } catch (_) {}
    activePointerId = null;
  }
  viewport.addEventListener('pointerup', endPointerInteraction);
  viewport.addEventListener('pointercancel', endPointerInteraction);

  // Ctrl+wheel = zoom (this is what a trackpad pinch gesture sends on
  // Windows/Chrome, including the ThinkPad's precision touchpad). Plain
  // two-finger scroll pans, matching how every other canvas app behaves.
  viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0025);
      zoomAt(e.clientX, e.clientY, factor);
    } else {
      e.preventDefault();
      transform.panX -= e.deltaX;
      transform.panY -= e.deltaY;
      apply();
    }
  }, { passive: false });

  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomBy(1.2));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));
  document.getElementById('btn-reset-view').addEventListener('click', reset);

  // ---- marquee: reused both for select (default tool) and zoom-to-frame (Z tool) ----
  function startMarquee(e, showImmediately) {
    const rect = viewport.getBoundingClientRect();
    marqueeStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, clientX: e.clientX, clientY: e.clientY };
    if (showImmediately) {
      marquee.classList.remove('hidden');
      marquee.style.left = marqueeStart.x + 'px';
      marquee.style.top = marqueeStart.y + 'px';
      marquee.style.width = '0px';
      marquee.style.height = '0px';
    }
  }

  function updateMarquee(e) {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - marqueeStart.x, y - marqueeStart.y);

    if (marqueePurpose === 'zoom' && dist < CLICK_THRESHOLD) return; // still might be a click

    marquee.classList.remove('hidden');
    const left = Math.min(x, marqueeStart.x);
    const top = Math.min(y, marqueeStart.y);
    const w = Math.abs(x - marqueeStart.x);
    const h = Math.abs(y - marqueeStart.y);
    marquee.style.left = left + 'px';
    marquee.style.top = top + 'px';
    marquee.style.width = w + 'px';
    marquee.style.height = h + 'px';

    if (marqueePurpose === 'select') {
      const worldA = clientToWorld(marqueeStart.x + rect.left, marqueeStart.y + rect.top);
      const worldB = clientToWorld(x + rect.left, y + rect.top);
      const minX = Math.min(worldA.x, worldB.x), maxX = Math.max(worldA.x, worldB.x);
      const minY = Math.min(worldA.y, worldB.y), maxY = Math.max(worldA.y, worldB.y);
      IMAGES.selectWithinBounds(minX, minY, maxX, maxY);
    }
  }

  function endMarquee(e) {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - marqueeStart.x, y - marqueeStart.y);
    const wasVisible = !marquee.classList.contains('hidden');

    if (marqueePurpose === 'zoom') {
      if (dist < CLICK_THRESHOLD) {
        // plain click with the Zoom tool: step in (or out with Alt)
        zoomAt(e.clientX, e.clientY, e.altKey ? 1 / 1.6 : 1.6);
      } else {
        const worldA = clientToWorld(marqueeStart.x + rect.left, marqueeStart.y + rect.top);
        const worldB = clientToWorld(e.clientX, e.clientY);
        zoomToWorldRect(
          Math.min(worldA.x, worldB.x), Math.min(worldA.y, worldB.y),
          Math.max(worldA.x, worldB.x), Math.max(worldA.y, worldB.y)
        );
      }
    }

    marqueeStart = null;
    marqueePurpose = null;
    if (wasVisible) marquee.classList.add('hidden');
  }

  return { apply, reset, zoomBy, viewportCenterWorld, getTransform: () => transform };
})();