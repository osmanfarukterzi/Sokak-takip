// Admin paneli: üyeler, katılım talepleri, kurallar, hafta sıfırlama, geri bildirimler.
import { html, useState } from './ortak.js';
import { Pencere, zamanOnce } from './ortak.js';
import { SAHIPLER, haftaBasligi } from './rotasyon.js';
import {
  uyeKaydet, uyeSil, talebiOnayla, talebiReddet, ayarlariKaydet, haftayiSifirla, VARSAYILAN_AYARLAR
} from './islemler.js';

export function AdminPenceresi({ kapat, ben, uyeler, talepler, ayarlar, geribildirim, kayit, haftaId, bildir, simdi }) {
  const [sekme, setSekme] = useState(Object.keys(talepler || {}).length ? 'talepler' : 'uyeler');
  const [mesgul, setMesgul] = useState(false);
  const yap = async (fn, msj) => {
    setMesgul(true);
    try { await fn(); bildir(msj); } catch (e) { bildir(e.message || 'Bir hata oluştu.', true); } finally { setMesgul(false); }
  };

  const sekmeler = [
    ['uyeler', 'Üyeler'],
    ['talepler', `Talepler${Object.keys(talepler || {}).length ? ` (${Object.keys(talepler).length})` : ''}`],
    ['kurallar', 'Kurallar'],
    ['kayit', 'Kayıt defteri'],
    ['geri', 'Geri bildirim']
  ];

  return html`<${Pencere} baslik="Admin paneli" kapat=${kapat} genis=${true}>
    <div class="sekmeler" role="tablist">
      ${sekmeler.map(([k, ad]) => html`<button role="tab" aria-selected=${sekme === k} class=${'sekme' + (sekme === k ? ' secili' : '')} onClick=${() => setSekme(k)}>${ad}</button>`)}
    </div>
    ${sekme === 'uyeler' && html`<${Uyeler} uyeler=${uyeler} yap=${yap} mesgul=${mesgul} />`}
    ${sekme === 'talepler' && html`<${Talepler} talepler=${talepler} yap=${yap} mesgul=${mesgul} simdi=${simdi} />`}
    ${sekme === 'kurallar' && html`<${Kurallar} ayarlar=${ayarlar} yap=${yap} mesgul=${mesgul} ben=${ben} haftaId=${haftaId} />`}
    ${sekme === 'kayit' && html`<div class="liste">
      ${Object.entries(kayit || {}).sort((a, b) => (b[1].zaman || 0) - (a[1].zaman || 0)).map(([id, k]) => html`<div class="liste-satir" key=${id}>
        <span>${k.metin}<span class="soluk kucuk"> · ${k.ad || k.sahip}</span></span><span class="soluk kucuk">${zamanOnce(k.zaman, simdi)}</span></div>`)}
      ${!kayit && html`<p class="bos-durum">Henüz kayıt yok.</p>`}
    </div>`}
    ${sekme === 'geri' && html`<div class="liste">
      ${Object.entries(geribildirim || {}).sort((a, b) => (b[1].zaman || 0) - (a[1].zaman || 0)).map(([id, g]) => html`<div class="liste-satir dikey" key=${id}>
        <span class="soluk kucuk">${g.sahip} · ${g.ad} · ${zamanOnce(g.zaman, simdi)}</span><span>${g.metin}</span></div>`)}
      ${!geribildirim && html`<p class="bos-durum">Henüz geri bildirim yok.</p>`}
    </div>`}
  </${Pencere}>`;
}

function Uyeler({ uyeler, yap, mesgul }) {
  const [eposta, setEposta] = useState('');
  const [sahip, setSahip] = useState(SAHIPLER[0]);
  const [ad, setAd] = useState('');
  const [toplu, setToplu] = useState('');
  const liste = Object.values(uyeler || {}).sort((a, b) => a.sahip.localeCompare(b.sahip, 'tr') || (a.ad || '').localeCompare(b.ad || '', 'tr'));

  const topluEkle = async () => {
    const satirlar = toplu.split('\n').map((s) => s.trim()).filter(Boolean);
    let n = 0;
    for (const s of satirlar) {
      const [e, sh, a] = s.split(',').map((x) => (x || '').trim());
      if (!e || !e.includes('@')) throw new Error(`Hatalı satır: ${s}`);
      if (!SAHIPLER.includes(sh)) throw new Error(`Bilinmeyen slot sahibi "${sh}" (satır: ${s})`);
      await uyeKaydet(e, sh, a || sh, false);
      n += 1;
    }
    setToplu('');
    return n;
  };

  return html`<div class="admin-bolum">
    <p class="soluk">Sadece bu listedeki Google hesapları siteye girebilir. Aynı slot sahibine birden fazla kişi bağlanabilir (Sirayet gibi).</p>
    <div class="liste">
      ${liste.map((u) => html`<div class="liste-satir" key=${u.eposta}>
        <span><strong>${u.sahip}</strong> · ${u.ad}${u.admin ? ' · Admin' : ''}<br /><span class="soluk kucuk">${u.eposta}</span></span>
        ${!u.admin && html`<button class="btn kucuk-btn tehlike" disabled=${mesgul}
          onClick=${() => { if (confirm(`${u.eposta} silinsin mi? Artık siteye giremeyecek.`)) yap(() => uyeSil(u.eposta), 'Üye silindi.'); }}>Sil</button>`}
      </div>`)}
      ${liste.length === 0 && html`<p class="bos-durum">Henüz üye yok.</p>`}
    </div>
    <h3>Üye ekle</h3>
    <div class="form izgara-form">
      <label class="alan">E-posta<input type="email" value=${eposta} onInput=${(e) => setEposta(e.target.value)} placeholder="ornek@gmail.com" /></label>
      <label class="alan">Slot sahibi<select value=${sahip} onChange=${(e) => setSahip(e.target.value)}>${SAHIPLER.map((s) => html`<option value=${s}>${s}</option>`)}</select></label>
      <label class="alan">Ad<input value=${ad} onInput=${(e) => setAd(e.target.value)} placeholder="Kişinin adı" /></label>
      <button class="btn birincil" disabled=${mesgul || !eposta.includes('@')}
        onClick=${() => yap(async () => { await uyeKaydet(eposta, sahip, ad || sahip); setEposta(''); setAd(''); }, 'Üye eklendi.')}>Ekle</button>
    </div>
    <h3>Toplu ekle</h3>
    <label class="alan">Her satıra: e-posta, slot sahibi, ad
      <textarea rows="6" value=${toplu} onInput=${(e) => setToplu(e.target.value)} placeholder="nebi@gmail.com, Nebi, Nebi"></textarea>
    </label>
    <button class="btn" disabled=${mesgul || !toplu.trim()} onClick=${() => yap(async () => { await topluEkle(); }, 'Üyeler eklendi.')}>Toplu ekle</button>
  </div>`;
}

function Talepler({ talepler, yap, mesgul, simdi }) {
  const [secim, setSecim] = useState({});
  const liste = Object.entries(talepler || {});
  if (!liste.length) return html`<p class="bos-durum">Bekleyen katılım talebi yok.</p>`;
  return html`<div class="liste">
    ${liste.map(([uid, t]) => html`<div class="liste-satir" key=${uid}>
      <span><strong>${t.ad || 'İsimsiz'}</strong> <span class="soluk kucuk">${zamanOnce(t.zaman, simdi)}</span><br />
        <span class="soluk kucuk">${t.eposta} · "${t.istenen}" olduğunu söylüyor</span></span>
      <span class="satir">
        <select aria-label="Slot sahibi" value=${secim[uid] || t.istenen} onChange=${(e) => setSecim({ ...secim, [uid]: e.target.value })}>
          ${SAHIPLER.map((s) => html`<option value=${s}>${s}</option>`)}
        </select>
        <button class="btn kucuk-btn" disabled=${mesgul} onClick=${() => yap(() => talebiReddet(uid), 'Talep reddedildi.')}>Reddet</button>
        <button class="btn birincil kucuk-btn" disabled=${mesgul} onClick=${() => yap(() => talebiOnayla(uid, t, secim[uid] || t.istenen), 'Üye onaylandı.')}>Onayla</button>
      </span>
    </div>`)}
  </div>`;
}

function Kurallar({ ayarlar, yap, mesgul, ben, haftaId }) {
  const a = { ...VARSAYILAN_AYARLAR, ...(ayarlar || {}) };
  const [maxAlim, setMaxAlim] = useState(a.maxAlim);
  const [gundeTek, setGundeTek] = useState(a.gundeTekSlot);
  const [erken, setErken] = useState(a.cikisErkenDk);
  const [kuralMetni, setKuralMetni] = useState(a.kuralMetni || '');
  return html`<div class="admin-bolum">
    <div class="form izgara-form">
      <label class="alan">Haftada en fazla alınabilecek boş slot
        <input type="number" min="0" max="10" value=${maxAlim} onInput=${(e) => setMaxAlim(Number(e.target.value))} /></label>
      <label class="alan">"Çıktım" en erken kaç dk önce
        <input type="number" min="0" max="180" value=${erken} onInput=${(e) => setErken(Number(e.target.value))} /></label>
      <label class="alan onay"><input type="checkbox" checked=${gundeTek} onChange=${(e) => setGundeTek(e.target.checked)} />
        Bir kişi aynı gün en fazla bir slot (3 saat)</label>
    </div>
    <label class="alan">Herkesin göreceği kurallar (her satır bir madde)
      <textarea rows="5" value=${kuralMetni} onInput=${(e) => setKuralMetni(e.target.value)}></textarea></label>
    <button class="btn birincil" disabled=${mesgul}
      onClick=${() => yap(() => ayarlariKaydet({ maxAlim, gundeTekSlot: gundeTek, cikisErkenDk: erken, kuralMetni }), 'Kurallar kaydedildi.')}>Kaydet</button>
    <h3>Seçili hafta (${haftaBasligi(haftaId)})</h3>
    <p class="soluk">Takvim karıştıysa haftayı asıl kadroya döndürür; o haftanın takasları, devirleri ve çıkışları silinir.</p>
    <button class="btn tehlike" disabled=${mesgul}
      onClick=${() => { if (confirm('Bu hafta asıl kadroya sıfırlansın mı? Geri alınamaz.')) yap(() => haftayiSifirla(ben, haftaId), 'Hafta sıfırlandı.'); }}>Haftayı sıfırla</button>
  </div>`;
}
