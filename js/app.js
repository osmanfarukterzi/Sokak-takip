// Meydan — Beşiktaş Meydanı müzisyen takip sistemi. Ana uygulama.
import { html, render, useState, useEffect, useMemo } from './ortak.js';
import { Ikon, Logo, basHarfler } from './ortak.js';
import {
  oturumDinle, googleIleGiris, cikisYap, dinle, oku, yaz, cevrimiciOl, cevrimiciBirak, ADMIN_EPOSTA, ONIZLEME
} from './firebase.js';
import {
  istanbulSimdi, haftaKaydir, haftaBasligi, haftaFarki, epostaAnahtari, SAHIPLER, GUN_KISA, SAAT_KISA,
  sonrakiSlot
} from './rotasyon.js';
import {
  haftayiHazirla, cikisYapildi, talepGonder, geribildirimGonder, kalanAlimHakki, VARSAYILAN_AYARLAR
} from './islemler.js';
import { havaGetir } from './hava.js';
import {
  haftaModeli, HaftaTakvimi, GunGorunumu, SimdiKarti, SlotPenceresi, HaftaTablosu, HavaRozeti, SlotHaklari
} from './takvim.js';
import { TakasPaneli, Sohbet } from './takas.js';
import { AdminPenceresi } from './admin.js';

function varsayilanKurallar(ayarlar) {
  const a = { ...VARSAYILAN_AYARLAR, ...(ayarlar || {}) };
  const k = [`Bir kişi haftada en fazla ${a.maxAlim} boş slot alabilir.`];
  if (a.gundeTekSlot) k.push('Aynı gün en fazla bir slot çıkılır.');
  if (a.oncelikSaat) {
    k.push(`Slotu az olanlar (haftada ${a.oncelikEsik}'ten az asıl slotu olanlar) önceliklidir: boşalan slotu ilk ${a.oncelikSaat} saat sadece onlar alabilir, almazlarsa herkese açılır.`);
  }
  k.push('Yer değiştirmeden önce ilgili kişiye sorulur; takas karşı taraf onaylayınca geçerli olur.');
  k.push('Meydana varınca "Çıktım" butonuna basılır.');
  return k;
}

// ---------------------------------------------------------------- Kök

function Uygulama() {
  if (ONIZLEME) {
    return html`<${Ana} ben=${{ uid: 'onizleme', eposta: '', ad: 'Osman Faruk', sahip: 'Sirayet', admin: true }} />`;
  }
  return html`<${GercekUygulama} />`;
}

function GercekUygulama() {
  const [kullanici, setKullanici] = useState(undefined);
  const [uyelik, setUyelik] = useState(undefined);

  useEffect(() => oturumDinle((u) => { setKullanici(u || null); if (!u) setUyelik(undefined); }), []);

  useEffect(() => {
    if (!kullanici) return undefined;
    const eposta = (kullanici.email || '').toLowerCase();
    const anahtar = epostaAnahtari(eposta);
    let iptal = false;
    // Admin ilk girişte kendi kaydını oluşturur.
    if (eposta === ADMIN_EPOSTA) {
      oku(`uyeler/${anahtar}`).then((k) => {
        if (!k && !iptal) {
          yaz(`uyeler/${anahtar}`, { eposta, sahip: 'Sirayet', ad: kullanici.displayName || 'Osman Faruk', admin: true }).catch(() => {});
        }
      }).catch(() => {});
    }
    const birak = dinle(`uyeler/${anahtar}`, (v) => setUyelik(v || null));
    return () => { iptal = true; birak(); };
  }, [kullanici && kullanici.uid]);

  if (kullanici === undefined || (kullanici && uyelik === undefined)) return html`<${Yukleniyor} />`;
  if (!kullanici) return html`<${GirisEkrani} />`;
  if (!uyelik) return html`<${ErisimYok} kullanici=${kullanici} />`;
  const ben = { uid: kullanici.uid, eposta: kullanici.email, ad: uyelik.ad || kullanici.displayName || uyelik.sahip, sahip: uyelik.sahip, admin: !!uyelik.admin, foto: kullanici.photoURL };
  return html`<${Ana} ben=${ben} />`;
}

function Yukleniyor() {
  return html`<div class="tam-ekran"><${Logo} boyut=${56} /><p class="soluk">Yükleniyor…</p></div>`;
}

function GirisEkrani() {
  const [hata, setHata] = useState('');
  return html`<div class="tam-ekran giris">
    <${Logo} boyut=${72} />
    <h1>Meydan</h1>
    <p class="soluk">Beşiktaş Meydanı müzisyen takip sistemi</p>
    <button class="btn google" onClick=${() => googleIleGiris().catch((e) => setHata(e.message))}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Google ile giriş yap
    </button>
    ${hata && html`<p class="uyari-yazi">${hata}</p>`}
    <p class="soluk kucuk">Sadece meydan listesindeki hesaplar girebilir.</p>
  </div>`;
}

function ErisimYok({ kullanici }) {
  const [talep, setTalep] = useState(undefined);
  const [sahip, setSahip] = useState('');
  const [ad, setAd] = useState(kullanici.displayName || '');
  const [mesgul, setMesgul] = useState(false);
  useEffect(() => dinle(`talepler/${kullanici.uid}`, (v) => setTalep(v || null)), []);

  return html`<div class="tam-ekran giris">
    <${Logo} boyut=${56} />
    <h1>Erişimin henüz yok</h1>
    <p class="soluk"><strong>${kullanici.email}</strong> hesabı meydan listesinde değil.</p>
    ${talep === undefined ? '' : talep
      ? html`<div class="kart dar"><p>Talebin gönderildi: <strong>${talep.istenen}</strong>.</p><p class="soluk">Admin onaylayınca bu sayfa kendiliğinden açılacak.</p></div>`
      : html`<div class="kart dar form">
          <p>Kim olduğunu seç, admin onaylasın.</p>
          <label class="alan">Slot sahibi
            <select value=${sahip} onChange=${(e) => setSahip(e.target.value)}>
              <option value="">Seç…</option>
              ${SAHIPLER.map((s) => html`<option value=${s}>${s}</option>`)}
            </select></label>
          <label class="alan">Adın<input value=${ad} onInput=${(e) => setAd(e.target.value)} /></label>
          <button class="btn birincil" disabled=${!sahip || mesgul}
            onClick=${async () => { setMesgul(true); try { await talepGonder(kullanici, sahip, ad); } finally { setMesgul(false); } }}>Katılım talebi gönder</button>
        </div>`}
    <button class="btn" onClick=${cikisYap}>Başka hesapla gir</button>
  </div>`;
}

// ---------------------------------------------------------------- Ana ekran

function useDinle(yol, secenek) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    if (!yol) { setV(undefined); return undefined; }
    setV(undefined);
    return dinle(yol, setV, secenek);
  }, [yol]);
  return v;
}

function Ana({ ben }) {
  const [simdi, setSimdi] = useState(Date.now());
  const buHaftaId = istanbulSimdi(simdi).haftaId;
  const [secHafta, setSecHafta] = useState(buHaftaId);
  const [sekme, setSekme] = useState('takvim');
  const [gun, setGun] = useState(istanbulSimdi().gun);
  const [pencere, setPencere] = useState(null);
  const [bildirimler, setBildirimler] = useState([]);
  const [hava, setHava] = useState(null);

  useEffect(() => { const t = setInterval(() => setSimdi(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    cevrimiciOl(ben.uid, { ad: ben.ad, sahip: ben.sahip }).catch(() => {});
    return () => { cevrimiciBirak(ben.uid).catch(() => {}); };
  }, []);
  useEffect(() => {
    const getir = () => havaGetir().then(setHava).catch(() => {});
    getir();
    const t = setInterval(getir, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { haftayiHazirla(buHaftaId).catch(() => {}); }, [buHaftaId]);
  useEffect(() => {
    if (haftaFarki(secHafta) >= haftaFarki(buHaftaId)) haftayiHazirla(secHafta).catch(() => {});
  }, [secHafta]);

  const uyeler = useDinle('uyeler');
  const ayarlar = useDinle('ayarlar');
  const buHaftaVeri = useDinle(`haftalar/${buHaftaId}`);
  const secVeriAyri = useDinle(secHafta !== buHaftaId ? `haftalar/${secHafta}` : null);
  const sonrakiHaftaId = sonrakiSlot(simdi).haftaId;
  const sonrakiVeriAyri = useDinle(sonrakiHaftaId !== buHaftaId && sonrakiHaftaId !== secHafta ? `haftalar/${sonrakiHaftaId}` : null);
  const takaslar = useDinle('takaslar', { son: 60 });
  const sohbet = useDinle('sohbet', { son: 150 });
  const cevrimici = useDinle('cevrimici');
  const kayit = useDinle(ben.admin ? 'kayit' : null, { son: 100 });
  const talepler = useDinle(ben.admin ? 'talepler' : null);
  const geribildirim = useDinle(ben.admin ? 'geribildirim' : null);

  const secVeri = secHafta === buHaftaId ? buHaftaVeri : secVeriAyri;
  const haftaVeri = { [buHaftaId]: buHaftaVeri, [secHafta]: secVeri };
  if (sonrakiHaftaId !== buHaftaId) haftaVeri[sonrakiHaftaId] = sonrakiHaftaId === secHafta ? secVeri : sonrakiVeriAyri;

  const buModel = haftaModeli({ haftaId: buHaftaId, veri: buHaftaVeri, simdi, ben, hava });
  const secModel = secHafta === buHaftaId ? buModel : haftaModeli({ haftaId: secHafta, veri: secVeri, simdi, ben, hava });
  const sonrakiModel = sonrakiHaftaId === buHaftaId ? buModel
    : haftaModeli({ haftaId: sonrakiHaftaId, veri: haftaVeri[sonrakiHaftaId], simdi, ben, hava });

  const bildir = (metin, hata = false) => {
    const id = Math.random();
    setBildirimler((b) => [...b, { id, metin, hata }]);
    setTimeout(() => setBildirimler((b) => b.filter((x) => x.id !== id)), hata ? 6000 : 3500);
  };

  const slotAc = (haftaId, anahtar) => { setSecHafta(haftaId); setPencere({ tip: 'slot', haftaId, anahtar }); };

  const bosSlotlar = [];
  const ekle = (haftaId, model) => model.forEach((g) => g.slotlar.forEach((s) => {
    if (s.bos && !s.gecmis) bosSlotlar.push({ haftaId, anahtar: s.anahtar, onceki: s.onceki });
  }));
  ekle(buHaftaId, buModel);
  if (secHafta !== buHaftaId && haftaFarki(secHafta) > haftaFarki(buHaftaId)) ekle(secHafta, secModel);

  const gelenTeklif = Object.values(takaslar || {}).filter((t) => t.durum === 'bekliyor' && t.alan === ben.sahip).length;
  const talepSayisi = Object.keys(talepler || {}).length;
  const kurallar = ((ayarlar && ayarlar.kuralMetni) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const kuralListesi = kurallar.length ? kurallar : varsayilanKurallar(ayarlar);

  const cikis = async (anahtar) => {
    try { await cikisYapildi(ben, buHaftaId, anahtar); bildir('Kolay gelsin! Çıkışın kaydedildi.'); } catch (e) { bildir(e.message, true); }
  };

  const haftaFarkMetni = (() => {
    const f = haftaFarki(secHafta) - haftaFarki(buHaftaId);
    if (f === 0) return 'Bu hafta';
    if (f === 1) return 'Gelecek hafta';
    if (f === -1) return 'Geçen hafta';
    return f > 0 ? `${f} hafta sonra` : `${-f} hafta önce`;
  })();

  return html`<div class=${'uygulama sekme-' + sekme}>
    <header class="ust">
      <div class="ust-ic">
        <div class="marka">
          <${Logo} boyut=${40} />
          <div><span class="marka-ad">Meydan</span><span class="marka-alt">Beşiktaş Meydanı · Müzisyen takip</span></div>
        </div>
        <div class="hafta-secici">
          <button class="ikon-btn" aria-label="Önceki hafta" onClick=${() => setSecHafta(haftaKaydir(secHafta, -1))}><${Ikon} ad="sol" /></button>
          <button class="hafta-orta" onClick=${() => setSecHafta(buHaftaId)} title="Bu haftaya dön">
            <span class="kucuk-baslik">${haftaFarkMetni}</span>
            <strong>${haftaBasligi(secHafta)}</strong>
          </button>
          <button class="ikon-btn" aria-label="Sonraki hafta" onClick=${() => setSecHafta(haftaKaydir(secHafta, 1))}><${Ikon} ad="sag" /></button>
        </div>
        <div class="ust-sag">
          <${HavaRozeti} hava=${hava} />
          ${ben.admin && html`<button class="btn admin-btn" onClick=${() => setPencere({ tip: 'admin' })}>
            <${Ikon} ad="tac" boyut=${16} /> Admin${talepSayisi ? html` <span class="sayi-rozet">${talepSayisi}</span>` : ''}</button>`}
          <div class="kisi-cip">
            ${ben.foto ? html`<img src=${ben.foto} alt="" referrerpolicy="no-referrer" />` : html`<span class="avatar">${basHarfler(ben.ad)}</span>`}
            <span class="kisi-yazi"><strong>${ben.sahip}</strong><span class="soluk">${ben.ad}${ben.admin ? ' · Admin' : ''}</span></span>
            <button class="ikon-btn" aria-label="Çıkış yap" title="Çıkış yap" onClick=${cikisYap}><${Ikon} ad="cikis" /></button>
          </div>
        </div>
      </div>
    </header>

    <main class="govde">
      <div class="ana-sutun">
        <div class="bolum b-takvim">
          <${SimdiKarti} simdi=${simdi} buHaftaModeli=${buModel} sonrakiModel=${sonrakiModel.flatMap((g) => g.slotlar)} ben=${ben}
            ac=${(k) => slotAc(buHaftaId, k)} cikisYap=${cikis} />
        </div>
        <section class="bolum b-takvim takvim-bolum" aria-label="Haftalık takvim">
          <div class="kart-baslik acik">
            <h2>Haftalık takvim</h2>
            <div class="aciklamalar">
              <span><${Ikon} ad="kilit" boyut=${14} /> Sabit</span>
              <span><span class="sen-etiket">SEN</span> Senin slotun</span>
              <span><span class="kesikli"></span> Boş, alınabilir</span>
              <span class="yagmur"><${Ikon} ad="damla" boyut=${14} /> Yağmur ihtimali (%30+)</span>
            </div>
          </div>
          <div class="masaustu-takvim"><${HaftaTakvimi} model=${secModel} ac=${(k) => slotAc(secHafta, k)} /></div>
          <div class="telefon-takvim"><${GunGorunumu} model=${secModel} ac=${(k) => slotAc(secHafta, k)} gun=${gun} gunSec=${setGun} /></div>
        </section>
        <div class="bolum b-ben"><${HaftaTablosu} model=${secModel} /></div>
        <div class="bolum b-ben"><${SlotHaklari} haftaId=${secHafta} veri=${secVeri} ayarlar=${ayarlar} /></div>
      </div>

      <aside class="yan-sutun">
        <div class="bolum b-takas">
          <${TakasPaneli} takaslar=${takaslar} ben=${ben} bosSlotlar=${bosSlotlar} haftaVeri=${haftaVeri} ayarlar=${ayarlar} bildir=${bildir} simdi=${simdi} />
        </div>
        <div class="bolum b-sohbet">
          <${Sohbet} mesajlar=${sohbet} ben=${ben} cevrimici=${cevrimici} takaslar=${takaslar} haftaVeri=${haftaVeri}
            ayarlar=${ayarlar} bildir=${bildir} simdi=${simdi} slotAc=${slotAc} />
        </div>
        <div class="bolum b-ben">
          <${BenPaneli} ben=${ben} model=${secModel} buModel=${buModel} buHaftaVeri=${buHaftaVeri} ayarlar=${ayarlar}
            kurallar=${kuralListesi} bildir=${bildir} ac=${(k) => slotAc(secHafta, k)} />
        </div>
      </aside>
    </main>

    <nav class="alt-menu" aria-label="Ana menü">
      ${[['takvim', 'takvim', 'Takvim', 0], ['takas', 'takas', 'Takas', gelenTeklif + bosSlotlar.length], ['sohbet', 'sohbet', 'Sohbet', 0], ['ben', 'kisi', 'Ben', 0]].map(([k, ikon, ad, n]) => html`
        <button class=${'menu-ogesi' + (sekme === k ? ' secili' : '')} aria-current=${sekme === k ? 'page' : undefined} onClick=${() => { setSekme(k); window.scrollTo(0, 0); }}>
          <${Ikon} ad=${ikon} boyut=${22} />${ad}${n > 0 ? html`<span class="sayi-rozet">${n}</span>` : ''}
        </button>`)}
    </nav>

    ${pencere && pencere.tip === 'slot' && html`<${SlotPenceresi} haftaId=${pencere.haftaId} anahtar=${pencere.anahtar}
      veri=${pencere.haftaId === buHaftaId ? buHaftaVeri : secVeri}
      model=${pencere.haftaId === buHaftaId ? buModel : secModel}
      ben=${ben} ayarlar=${ayarlar} simdi=${simdi} hava=${hava} kapat=${() => setPencere(null)} bildir=${bildir} />`}
    ${pencere && pencere.tip === 'admin' && html`<${AdminPenceresi} kapat=${() => setPencere(null)} ben=${ben} uyeler=${uyeler}
      talepler=${talepler} ayarlar=${ayarlar} geribildirim=${geribildirim} kayit=${kayit} haftaId=${secHafta} bildir=${bildir} simdi=${simdi} />`}

    <div class="bildirimler" aria-live="polite">
      ${bildirimler.map((b) => html`<div class=${'bildirim' + (b.hata ? ' hata' : '')} key=${b.id}>${b.metin}</div>`)}
    </div>
  </div>`;
}

function BenPaneli({ ben, model, buModel, buHaftaVeri, ayarlar, kurallar, bildir, ac }) {
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const gonder = async () => {
    if (!metin.trim() || gonderiliyor) return;
    setGonderiliyor(true);
    try {
      await geribildirimGonder(ben, metin);
      setMetin('');
      bildir('Teşekkürler, admin\'e iletildi.');
    } catch (err) {
      bildir('Gönderilemedi.', true);
    } finally {
      setGonderiliyor(false);
    }
  };
  const slotlarim = model.flatMap((g) => g.slotlar).filter((s) => s.benim);
  const kalan = kalanAlimHakki(ben, (buHaftaVeri && buHaftaVeri.alimlar) || {}, ayarlar);
  return html`<section class="kart" aria-label="Benim sayfam">
    <div class="kart-baslik"><h2>${ben.sahip} · bu haftan</h2><span class="soluk kucuk">${kalan} alım hakkı</span></div>
    <div class="slotlarim">
      ${slotlarim.length === 0 && html`<p class="bos-durum">Bu hafta slotun yok.</p>`}
      ${slotlarim.map((s) => html`<button class=${'slotum' + (s.gecmis ? ' gecmis' : '') + (s.simdi ? ' simdi' : '')} onClick=${() => ac(s.anahtar)}>
        <strong>${GUN_KISA[s.gun]} ${SAAT_KISA[s.saat]}</strong>
        <span class="soluk kucuk">${s.cikti ? 'Çıktın' : s.gecmis ? 'Geçti' : s.simdi ? 'Şimdi' : s.turEtiket}</span>
      </button>`)}
    </div>
    <h3>Kurallar</h3>
    <ul class="kural-listesi">${kurallar.map((k) => html`<li>${k}</li>`)}</ul>
    <h3>Hata ya da öneri bildir</h3>
    <form class="form" onSubmit=${(e) => { e.preventDefault(); gonder(); }}>
      <label class="gizli" for="geri-bildirim">Mesajın</label>
      <textarea id="geri-bildirim" rows="2" maxlength="2000" placeholder="Bir şey yanlış mı görünüyor? Yaz, admin görsün." value=${metin}
        onInput=${(e) => setMetin(e.target.value)}
        onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); gonder(); } }}></textarea>
      <button class="btn" disabled=${!metin.trim() || gonderiliyor}>Gönder</button>
      <span class="soluk kucuk">Enter ile gönder · Shift+Enter yeni satır</span>
    </form>
  </section>`;
}

render(html`<${Uygulama} />`, document.getElementById('uygulama'));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
