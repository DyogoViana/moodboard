/* ===============================================================
   icons.js — fonte única de verdade para ícones SVG stroke-based
   Estilo mínimo: Lucide/Untitled UI, stroke 1.75, round caps.
   =============================================================== */

const ICONS = (() => {
  const S = 'width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

  const M = {
    save: `<svg ${S}><path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 3v5h7V3"/><path d="M8 21v-7h8v7"/></svg>`,
    addImage: `<svg ${S}><rect x="3" y="5" width="14" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="m3 17 4-4 3 3 4-4 3 3"/><path d="M19 3v6"/><path d="M16 6h6"/></svg>`,
    link: `<svg ${S}><path d="M9 15 15 9"/><path d="m11 6 1.5-1.5a4 4 0 0 1 5.7 5.7L16.5 12"/><path d="m13 18-1.5 1.5a4 4 0 0 1-5.7-5.7L7.5 12"/></svg>`,
    list: `<svg ${S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>`,
    image: `<svg ${S}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 19 5-5 3 3 4-4 4 4"/></svg>`,
    front: `<svg ${S}><path d="m7 11 5-5 5 5"/><path d="m7 18 5-5 5 5"/></svg>`,
    back: `<svg ${S}><path d="m7 6 5 5 5-5"/><path d="m7 13 5 5 5-5"/></svg>`,
    flipH: `<svg ${S}><path d="M12 2v20"/><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/></svg>`,
    flipV: `<svg ${S}><path d="M2 12h20"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/></svg>`,
    align: `<svg ${S}><rect x="3" y="8" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="8" rx="1"/><rect x="17" y="8" width="4" height="8" rx="1"/></svg>`,
    trash: `<svg ${S}><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="m6 7 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    move: `<svg ${S}><path d="M12 2v20"/><path d="M2 12h20"/><path d="m9 5 3-3 3 3"/><path d="m9 19 3 3 3-3"/><path d="m5 9-3 3 3 3"/><path d="m19 9 3 3-3 3"/></svg>`,
    zoom: `<svg ${S}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    zoomIn: `<svg ${S}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>`,
    zoomOut: `<svg ${S}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6"/></svg>`,
    reset: `<svg ${S}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`,
    more: `<svg ${S}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>`,
    chevLeft: `<svg ${S}><path d="m14 6-6 6 6 6"/></svg>`,
    chevRight: `<svg ${S}><path d="m10 6 6 6-6 6"/></svg>`,
    download: `<svg ${S}><path d="M12 3v10"/><path d="m8 9 4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
    upload: `<svg ${S}><path d="M12 17V7"/><path d="m8 11 4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`,
    moon: `<svg ${S}><path d="M20 13A8 8 0 1 1 11 4a6.5 6.5 0 0 0 9 9Z"/></svg>`,
    sun: `<svg ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/></svg>`,
    tag: `<svg ${S}><path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="8" cy="8" r="1.5"/></svg>`,
    folderPlus: `<svg ${S}><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>`,
    boardPlus: `<svg ${S}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`,
    copy: `<svg ${S}><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    pencil: `<svg ${S}><path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5Z"/></svg>`,
    x: `<svg ${S}><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>`,
    droplet: `<svg ${S}><path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3Z"/></svg>`
  };

  return M;
})();

window.ICONS = ICONS;
