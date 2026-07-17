/* ==========================================================================
   diagnostics.js — self-check that runs automatically every time the app
   loads. Shows a small badge (top-right). Click it for the full list.

   v1.2: severity levels, stable codes (MB-xxx) so any AI or person can
   reference an exact issue without re-describing it, an export button
   (JSON) for pasting into a chat, and a version stamp so it's always
   clear which build is being looked at.

   This module only READS the page and reports. It deliberately has NO
   auto-fix button: a page running in the browser cannot write to the
   project's source files on disk. A "corrigir automaticamente" button
   here could only ever be cosmetic (fixes memory, not the file — the
   bug comes right back on reload) or, if wired to actually persist
   somehow, would reintroduce blind automated file editing, which is
   exactly the failure mode this project got burned by before. Fixing a
   reported code still means: read the real file, return the whole
   corrected file, apply it deliberately.
   ========================================================================== */

const DIAGNOSTICS = (() => {
  const DIAGNOSTICS_VERSION = '1.2';
  const APP_VERSION = 'v1.2'; // bump alongside VERSION.txt

  let results = []; // { code, level, message }

  function add(code, level, condition, message) {
    if (!condition) results.push({ code, level, message });
  }

  function run() {
    results = [];

    // ---- CRITICAL: core modules failed to load at all ----
    add('MB-001', 'critical', typeof DB !== 'undefined', 'Módulo DB não carregou — nada vai persistir.');
    add('MB-002', 'critical', typeof CANVAS !== 'undefined', 'Módulo CANVAS não carregou — o canvas infinito não vai funcionar.');
    add('MB-003', 'critical', typeof IMAGES !== 'undefined', 'Módulo IMAGES não carregou — adicionar/mover imagem não vai funcionar.');
    add('MB-004', 'critical', typeof window.exportBoard === 'function', 'Função de exportar board (window.exportBoard) ausente.');

    // ---- CRITICAL: color panel wiring (already quebrou uma vez por isso) ----
    add('MB-010', 'critical', !!document.getElementById('btn-eye-dropper'), 'Botão de conta-gotas (#btn-eye-dropper) não encontrado — painel Cores fica sem função.');
    add('MB-011', 'critical', !!document.getElementById('color-wheel-input'), 'Seletor de cor (#color-wheel-input) não encontrado — painel Cores fica sem função.');
    add('MB-012', 'warning', !!document.getElementById('palette-list'), 'Lista de paleta (#palette-list) não encontrada — cores não vão salvar visualmente, mesmo que o resto funcione.');

    // ---- WARNING: duplicated critical toolbar buttons ----
    ['btn-save', 'btn-delete', 'btn-reset-view', 'btn-front', 'btn-back',
     'btn-pan-mode', 'btn-zoom-mode', 'btn-flip-h', 'btn-flip-v', 'btn-align-uniform']
      .forEach((id, i) => {
        const found = document.querySelectorAll('#' + id).length;
        add(`MB-02${i}`, 'warning', found === 1, `Botão #${id} aparece ${found} vez(es) no HTML (esperado: 1).`);
      });

    // ---- WARNING: leftover markup from a previously-injected bad patch ----
    add('MB-030', 'warning',
      document.querySelectorAll('.button-primary, .button-secondary, .button-tertiary').length === 0,
      'Existem botões de uma versão antiga/injetada (classes button-primary/secondary/tertiary) ainda no HTML.');

    // ---- INFO: Windows-only text convention ----
    const visibleText = document.body.innerText + JSON.stringify([...document.querySelectorAll('[title]')].map(e => e.title));
    add('MB-040', 'info', !/Ctrl\/Cmd|Cmd\+/.test(visibleText), 'Ainda existe referência a "Cmd" em algum texto visível (deveria ser só "Ctrl", ambiente é Windows).');

    render();

    // ---- WARNING: multiple service workers fighting over cache (async) ----
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        add('MB-050', 'warning', regs.length <= 1,
          `${regs.length} service workers registrados ao mesmo tempo — favorece cache antigo grudado. DevTools → Application → Service Workers → Unregister todos, depois recarregar.`);
        render();
      }).catch(() => {});
    }
  }

  const LEVEL_ICON = { critical: '🔴', warning: '🟡', info: '🔵' };
  const LEVEL_ORDER = { critical: 0, warning: 1, info: 2 };

  function render() {
    let badge = document.getElementById('diagnostics-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'diagnostics-badge';
      badge.title = 'Clique para ver detalhes';
      document.body.appendChild(badge);
      badge.addEventListener('click', () => {
        const panel = document.getElementById('diagnostics-panel');
        if (panel) panel.classList.toggle('hidden');
      });
    }

    const criticals = results.filter(r => r.level === 'critical').length;
    const ok = results.length === 0;
    badge.className = ok ? 'diag-ok' : (criticals > 0 ? 'diag-fail' : 'diag-warn');
    badge.textContent = ok ? '✓ Diagnóstico OK' : `⚠ ${results.length} problema(s)`;

    let panel = document.getElementById('diagnostics-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'diagnostics-panel';
      panel.className = 'hidden';
      document.body.appendChild(panel);
    }

    const sorted = [...results].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    const stamp = `Moodboard ${APP_VERSION} · Diagnostics ${DIAGNOSTICS_VERSION} · DB v2 · Build ${new Date().toISOString().slice(0, 10)}`;

    const list = sorted.length
      ? '<ul>' + sorted.map(r => `<li>${LEVEL_ICON[r.level]} <strong>${r.code}</strong> — ${r.message.replace(/</g, '&lt;')}</li>`).join('') + '</ul>'
      : '<p>Tudo certo — nenhum problema estrutural detectado automaticamente.</p>';

    panel.innerHTML = `
      <div class="diag-stamp">${stamp}</div>
      ${list}
      <button id="diag-export-btn" class="btn-chip" style="margin-top:8px;">Exportar diagnóstico</button>
    `;

    const exportBtn = document.getElementById('diag-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportDiagnostics);
  }

  function exportDiagnostics() {
    const payload = {
      appVersion: APP_VERSION,
      diagnosticsVersion: DIAGNOSTICS_VERSION,
      dbVersion: 2,
      generatedAt: new Date().toISOString(),
      results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-moodboard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { run };
})();

window.addEventListener('load', () => setTimeout(DIAGNOSTICS.run, 400));
