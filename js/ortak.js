// Ortak arayüz parçaları: Preact + htm, ikonlar, küçük bileşenler.
export {
  html, render, useState, useEffect, useMemo, useRef, useCallback
} from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';
import { html, useEffect } from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';

const yol = {
  kilit: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  sol: 'M15 18l-6-6 6-6',
  sag: 'M9 18l6-6-6-6',
  takas: 'M7 7h11l-3-3M17 17H6l3 3',
  takvim: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18',
  sohbet: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  kisi: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  gonder: 'M5 12h14M13 6l6 6-6 6',
  kapat: 'M6 6l12 12M18 6L6 18',
  damla: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  gunes: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  bulut: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z',
  tik: 'M5 12l5 5L20 7',
  tac: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  cikis: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  uyari: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  muzik: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  ekle: 'M12 5v14M5 12h14'
};

export function Ikon({ ad, boyut = 18, etiket, kalinlik = 2 }) {
  return html`<svg width=${boyut} height=${boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width=${kalinlik} stroke-linecap="round" stroke-linejoin="round"
    role=${etiket ? 'img' : undefined} aria-label=${etiket} aria-hidden=${etiket ? undefined : 'true'}>
    <path d=${yol[ad]} /></svg>`;
}

export function Logo({ boyut = 40 }) {
  return html`<svg width=${boyut} height=${boyut} viewBox="0 0 40 40" role="img" aria-label="Meydan">
    <rect width="40" height="40" rx="12" fill="var(--amber)" />
    <path d="M11 27V15l9 8 9-8v12" fill="none" stroke="#1A1206" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8 31.5c3.5-2.2 7.6-3.3 12-3.3s8.5 1.1 12 3.3" fill="none" stroke="#1A1206" stroke-width="2" stroke-linecap="round" opacity="0.55" />
  </svg>`;
}

export function Pencere({ baslik, kapat, children, genis }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') kapat(); };
    window.addEventListener('keydown', k);
    document.body.classList.add('kilitli');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('kilitli'); };
  }, []);
  return html`<div class="perde" onClick=${(e) => { if (e.target === e.currentTarget) kapat(); }}>
    <div class=${'pencere' + (genis ? ' genis' : '')} role="dialog" aria-modal="true" aria-label=${baslik}>
      <div class="pencere-ust">
        <h2>${baslik}</h2>
        <button class="ikon-btn" aria-label="Kapat" onClick=${kapat}><${Ikon} ad="kapat" /></button>
      </div>
      <div class="pencere-govde">${children}</div>
    </div>
  </div>`;
}

export const basHarfler = (ad) => (ad || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toLocaleUpperCase('tr')).join('');

export function zamanOnce(ms, simdi = Date.now()) {
  if (!ms) return '';
  const dk = Math.floor((simdi - ms) / 60000);
  if (dk < 1) return 'şimdi';
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.floor(sa / 24)} gün önce`;
}
