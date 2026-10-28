// Akıllı takas paneli ve sohbet.
import { html, useState, useEffect, useRef } from './ortak.js';
import { Ikon, zamanOnce } from './ortak.js';
import { GUN_KISA, SAAT_KISA, slotCoz, haftaBasligi, saatYaz } from './rotasyon.js';
import {
  takasiYanitla, takasiIptalEt, slotuAl, slotAdi, kalanAlimHakki, mesajGonder, alimEngeli, haftaSlotlari
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
      const engel = alimEngeli({ ben, haftaId: b.haftaId, anahtar: b.anahtar, slotlar: haftaSlotlari(b.haftaId, veri), alimlar: (veri && veri.alimlar) || {}, ayarlar });
      return html`<div class="bos-kart">
        <div class="takas-ust">
          <strong>${slotAdi(b.anahtar)} boş</strong>
          <span class="soluk kucuk">${b.onceki ? `${b.onceki} bıraktı` : ''}</span>
        </div>
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
        return html`<div class=${'mesaj' + (benim ? ' benim' : '')} key=${id}>
          <span class="mesaj-kim">${benim ? 'Sen' : m.sahip}${!benim && m.ad && m.ad !== m.sahip ? html` <span class="soluk">· ${m.ad}</span>` : ''} <span class="soluk">${saatYaz(m.zaman || simdi)}</span></span>
          <div class="balon">
            ${m.tip === 'bos' && html`<span>${m.metin || `${m.sahip} bu slota çıkamıyor.`}</span>${bosKarti(m)}`}
            ${m.tip === 'takas' && t && html`<span>${m.metin || 'Takas teklifi'}</span>
              <div class="sohbet-slot"><div><span class="soluk kucuk">Takas teklifi → ${t.alan}</span>
              <strong>${kisaSlot(t.verilen)} ↔ ${kisaSlot(t.istenen)}</strong></div>
              <span class=${'durum-yazi ' + t.durum}>${{ bekliyor: 'Bekliyor', kabul: 'Kabul', red: 'Red', iptal: 'İptal' }[t.durum]}</span></div>`}
            ${m.tip === 'mesaj' && m.metin}
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
