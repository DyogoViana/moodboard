/* ==========================================================================
   theme.js — dark/light mode, persisted in localStorage.
   ========================================================================== */

const THEME = (() => {
  const KEY = 'moodboard.theme';

  function apply(mode) {
    document.body.classList.toggle('theme-dark', mode === 'dark');
    document.body.classList.toggle('theme-light', mode === 'light');
    const label = document.getElementById('theme-label');
    const icon = document.querySelector('.theme-icon');
    if (label) label.textContent = mode === 'dark' ? 'Modo claro' : 'Modo escuro';
    if (icon) icon.textContent = mode === 'dark' ? '◐' : '◑';
    localStorage.setItem(KEY, mode);
  }

  function current() {
    return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  }

  function init() {
    const saved = localStorage.getItem(KEY) ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    apply(saved);
  }

  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark');
  }

  return { init, toggle, current };
})();
