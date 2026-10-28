// Akıllı takas paneli ve sohbet.
import { html, useState, useEffect, useRef } from './ortak.js';
import { Ikon, zamanOnce, basHarfler } from './ortak.js';
import { GUN_KISA, SAAT_KISA, slotCoz, haftaBasligi, saatYaz } from './rotasyon.js';
import {
  takasiYanitla, takasiIptalEt, slotuAl, slotAdi, kalanAlimHakki, mesajGonder, alimEngeli, haftaSlotlari, oncelikDurumu,
  mesajDuzenle, mesajSil
} from './islemler.js';

const kisaSlot = (k) => {
  const { gun, saat } = slotCoz(k);
  return `${GUN_KISA[gun]} ${SAAT_KISA[saat]}`;
};

function TakasKarti({ id, t, ben, bildir, simdi }) {
  const [mesgul, setMesgul] = useState(false);
  const gelen = t.alan === ben.sahip;
  const yap = async (fn, msj) => {
    setMesgul(true);
    try { await fn(); bildir(msj); } catch (e) { bildir(e.message, true); } finally { setMesgul(false); }
  };
  return html`<div class="takas-kart">
    <div class="takas-ust">
      <span class="kucuk-baslik"><${Ikon} ad="takas" boyut=${14} />
        ${gelen ? `${t.gonderen} sana teklif etti` : `${t.alan} kişisine teklifin`}</span>
      <span class="soluk kucuk">${zamanOnce(t.zaman, simdi)}</span>
    </div>
    <div class="takas-ikili">
      <div><span class="soluk kucuk">${gelen ? 'Sana gelecek' : 'Vereceğin'}</span><strong>${kisaSlot(t.verilen)}</strong></div>
      <div><span class="soluk kucuk">${gelen ? 'Vereceğin' : 'Alacağın'}</span><strong>${kisaSlot(t.istenen)}</strong></div>
    </div>
    ${t.mesaj && html`<p class="takas-mesaj">“${t.mesaj}”</p>`}
    <div class="soluk kucuk">${haftaBasligi(t.hafta)} haftası</div>
    ${gelen
      ? html`<div class="satir">
          <button class="btn" disabled=${mesgul} onClick=${() => yap(() => takasiYanitla(ben, id, false), 'Teklif reddedildi.')}>Reddet</button>
          <button class="btn birincil" disabled=${mesgul} onClick=${() => yap(() => takasiYanitla(ben, id, true), 'Takas yapıldı, takvim güncellendi.')}>Kabul et</button>
        </div>`
      : html`<div class="satir">
          <span class="soluk kucuk">${t.alan} kişisinin onayı bekleniyor</span>
          <button class="btn kucuk-btn" disabled=${mesgul} onClick=${() => yap(() => takasiIptalEt(ben, id), 'Teklif geri çekildi.')}>Geri çek</button>
        </div>`}
  </div>`;
}

export function TakasPaneli({ takaslar, ben, bosSlotlar, haftaVeri, ayarlar, bildir, simdi }) {
  const liste = Object.entries(takaslar || {}).sort((a, b) => (b[1].zaman || 0) - (a[1].zaman || 0));
  const bekleyen = liste.filter(([, t]) => t.durum === 'bekliyor' && (t.alan === ben.sahip || t.gonderen === ben.sahip));
  const sonuclar = liste.filter(([, t]) => t.durum !== 'bekliyor' && (t.alan === ben.sahip || t.gonderen === ben.sahip)).slice(0, 3);
  const [mesgul, setMesgul] = useState('');

  const al = async (b) => {
    setMesgul(b.haftaId + b.anahtar);
    try {
      await slotuAl(ben, b.haftaId, b.anahtar, ayarlar);
      bildir('Slot senin oldu.');
    } catch (e) {
      bildir(e.message, true);
    } finally {
      setMesgul('');
    }
  };

  return html`<section class="kart" aria-label="Takas ve devir">
    <div class="kart-baslik">
      <h2>Takas & devir</h2>
      ${bekleyen.length > 0 && html`<span class="sayi-rozet">${bekleyen.length}</span>`}
    </div>

    ${bosSlotlar.map((b) => {
      const veri = haftaVeri[b.haftaId];
      const ortak = { haftaId: b.haftaId, anahtar: b.anahtar, slotlar: haftaSlotlari(b.haftaId, veri), alimlar: (veri && veri.alimlar) || {}, ayarlar, simdi };
      const engel = alimEngeli({ ben, ...ortak });
      const o = oncelikDurumu(ortak);
      return html`<div class="bos-kart">
        <div class="takas-ust">
          <strong>${slotAdi(b.anahtar)} boş</strong>
          <span class="soluk kucuk">${b.onceki ? `${b.onceki} bıraktı` : ''}</span>
        </div>
        ${o && html`<div class="oncelik-bilgi"><span class="oncelik-etiket">ÖNCELİK</span>
          <span>${o.adaylar.join(', ')} · ${saatYaz(o.bitis)}'e kadar</span></div>`}
        <div class="satir">
          <span class=${engel ? 'uyari-yazi kucuk' : 'soluk kucuk'}>${engel || `${kalanAlimHakki(ben, (veri && veri.alimlar) || {}, ayarlar)} alım hakkın var`}</span>
          <button class="btn birincil" disabled=${!!engel || mesgul === b.haftaId + b.anahtar} onClick=${() => al(b)}>Slotu al</button>
        </div>
      </div>`;
    })}

    ${bekleyen.map(([id, t]) => html`<${TakasKarti} key=${id} id=${id} t=${t} ben=${ben} bildir=${bildir} simdi=${simdi} />`)}

    ${bosSlotlar.length === 0 && bekleyen.length === 0 && html`<p class="bos-durum">
      Bekleyen teklif ya da boş slot yok. Takas için takvimden bir slota dokun.</p>`}

    ${sonuclar.length > 0 && html`<div class="sonuclar">
      ${sonuclar.map(([id, t]) => html`<div class="sonuc-satir" key=${id}>
        <span>${t.gonderen} ↔ ${t.alan} · ${kisaSlot(t.verilen)} / ${kisaSlot(t.istenen)}</span>
        <span class=${'durum-yazi ' + t.durum}>${{ kabul: 'Kabul', red: 'Red', iptal: 'İptal' }[t.durum] || t.durum}</span>
      </div>`)}
    </div>`}
  </section>`;
}

export function Sohbet({ mesajlar, ben, cevrimici, takaslar, haftaVeri, ayarlar, bildir, simdi, slotAc }) {
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const liste = useRef(null);
  const sirali = Object.entries(mesajlar || {}).sort((a, b) => (a[1].zaman || 0) - (b[1].zaman || 0));
  const kisiSayisi = Object.keys(cevrimici || {}).length;
  const sonId = sirali.length ? sirali[sirali.length - 1][0] : '';

  useEffect(() => {
    if (liste.current) liste.current.scrollTop = liste.current.scrollHeight;
  }, [sonId]);

  const gonder = async (e) => {
    e.preventDefault();
    if (!metin.trim()) return;
    setGonderiliyor(true);
    try {
      await mesajGonder(ben, metin);
      setMetin('');
    } catch (err) {
      bildir('Mesaj gönderilemedi.', true);
    } finally {
      setGonderiliyor(false);
    }
  };

  const [duzen, setDuzen] = useState(null); // { id, metin }
  const kaydet = async () => {
    try {
      await mesajDuzenle(duzen.id, duzen.metin);
      setDuzen(null);
    } catch (e) {
      bildir(e.message || 'Mesaj düzenlenemedi.', true);
    }
  };
  const sil = async (id, benim) => {
    if (!confirm(benim ? 'Mesajın silinsin mi?' : 'Bu mesaj admin olarak silinsin mi?')) return;
    try { await mesajSil(id); } catch (e) { bildir('Mesaj silinemedi.', true); }
  };

  const bosKarti = (m) => {
    const veri = haftaVeri[m.hafta];
    const slotlar = veri ? haftaSlotlari(m.hafta, veri) : null;
    const simdiki = slotlar && slotlar[m.slot];
    const alan = simdiki && simdiki.sahip;
    return html`<div class="sohbet-slot">
      <div><span class="soluk kucuk">Boş slot</span><strong>${slotAdi(m.slot)}</strong></div>
      ${alan
        ? html`<span class="kucuk yesil-yazi">${alan} aldı</span>`
        : html`<button class="btn birincil kucuk-btn" onClick=${() => slotAc(m.hafta, m.slot)}>Ben alırım</button>`}
    </div>`;
  };

  return html`<section class="kart sohbet" aria-label="Meydan sohbeti">
    <div class="kart-baslik">
      <h2>Meydan sohbeti</h2>
      <span class="cevrimici" title=${Object.values(cevrimici || {}).map((c) => c.ad).join(', ')}>
        <span class="nokta yesil"></span>${kisiSayisi} kişi çevrimiçi</span>
    </div>
    <div class="mesajlar" ref=${liste}>
      ${sirali.length === 0 && html`<p class="bos-durum">Henüz mesaj yok. İlk mesajı sen yaz.</p>`}
      ${sirali.map(([id, m]) => {
        if (m.tip === 'sistem') {
          return html`<div class="sistem-mesaj" key=${id}>${m.metin}<span>${saatYaz(m.zaman || simdi)}</span></div>`;
        }
        const benim = m.uid === ben.uid;
        const t = m.tip === 'takas' ? (takaslar || {})[m.takas] : null;
        const ad = m.ad || m.sahip;
        return html`<div class=${'mesaj-satir' + (benim ? ' benim' : '')} key=${id}>
          ${!benim && (m.foto
            ? html`<img class="mesaj-foto" src=${m.foto} alt="" referrerpolicy="no-referrer" />`
            : html`<span class="mesaj-foto harf">${basHarfler(ad)}</span>`)}
          <div class=${'mesaj' + (benim ? ' benim' : '')}>
          <span class="mesaj-kim">${benim ? 'Sen' : html`<strong>${ad}</strong>${m.sahip && m.sahip !== ad ? html` <span class="sahip-cip">${m.sahip}</span>` : ''}`} <span class="soluk">${saatYaz(m.zaman || simdi)}</span></span>
          <div class="balon">
            ${m.tip === 'bos' && html`<span>${m.metin || `${m.sahip} bu slota çıkamıyor.`}</span>${bosKarti(m)}`}
            ${m.tip === 'takas' && t && html`<span>${m.metin || 'Takas teklifi'}</span>
              <div class="sohbet-slot"><div><span class="soluk kucuk">Takas teklifi → ${t.alan}</span>
              <strong>${kisaSlot(t.verilen)} ↔ ${kisaSlot(t.istenen)}</strong></div>
              <span class=${'durum-yazi ' + t.durum}>${{ bekliyor: 'Bekliyor', kabul: 'Kabul', red: 'Red', iptal: 'İptal' }[t.durum]}</span></div>`}
            ${m.tip === 'mesaj' && (duzen && duzen.id === id
              ? html`<form class="duzenle-form" onSubmit=${(e) => { e.preventDefault(); kaydet(); }}>
                  <label class="gizli" for=${'duzen-' + id}>Mesajı düzenle</label>
                  <textarea id=${'duzen-' + id} rows="2" maxlength="1000" value=${duzen.metin}
                    onInput=${(e) => setDuzen({ id, metin: e.target.value })}
                    onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kaydet(); } if (e.key === 'Escape') setDuzen(null); }}></textarea>
                  <span class="satir">
                    <button type="button" class="btn kucuk-btn" onClick=${() => setDuzen(null)}>Vazgeç</button>
                    <button class="btn birincil kucuk-btn" disabled=${!duzen.metin.trim()}>Kaydet</button>
                  </span>
                </form>`
              : html`<span>${m.metin}${m.duzenlendi ? html` <span class="duzenlendi">(düzenlendi)</span>` : ''}</span>`)}
          </div>
          ${m.tip === 'mesaj' && (benim || ben.admin) && !(duzen && duzen.id === id) && html`<span class="mesaj-islem">
            ${benim && html`<button class="metin-btn" onClick=${() => setDuzen({ id, metin: m.metin || '' })}>Düzenle</button>`}
            <button class="metin-btn tehlike-yazi" onClick=${() => sil(id, benim)}>Sil</button>
          </span>`}
          </div>
        </div>`;
      })}
    </div>
    <form class="mesaj-yaz" onSubmit=${gonder}>
      <label for="mesaj-girdi" class="gizli">Mesaj yaz</label>
      <input id="mesaj-girdi" autocomplete="off" maxlength="1000" placeholder="Mesaj yaz…" value=${metin} onInput=${(e) => setMetin(e.target.value)} />
      <button class="ikon-btn dolu" aria-label="Gönder" disabled=${gonderiliyor || !metin.trim()}><${Ikon} ad="gonder" kalinlik=${2.4} /></button>
    </form>
  </section>`;
}
