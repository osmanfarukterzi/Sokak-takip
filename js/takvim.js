// Takvim, "şu an meydanda" kartı, slot penceresi ve haftalık tablo.
import { html, useState } from './ortak.js';
import { Ikon, Pencere } from './ortak.js';
import {
  GUNLER, GUN_KISA, SAATLER, SAAT_KISA, slotAnahtari, slotCoz, slotTuru, TUR_ETIKET, slotZamani,
  gunTarihi, sureYaz, saatYaz, suankiSlot, sonrakiSlot, haftaProgrami, istanbulSimdi, SAHIPLER
} from './rotasyon.js';
import { slotYagis, kodAciklama } from './hava.js';
import {
  haftaSlotlari, alimEngeli, cikisEngeli, slotAdi, slotuBirak, slotuAl, takasTeklifEt, cikisYapildi,
  kalanAlimHakki, adminSlotAta, oncelikDurumu, asilSlotSayilari, VARSAYILAN_AYARLAR
} from './islemler.js';

/** Bir haftanın ekranda gösterilecek slot listesi. */
export function haftaModeli({ haftaId, veri, simdi, ben, hava }) {
  const slotlar = haftaSlotlari(haftaId, veri);
  const cikislar = (veri && veri.cikislar) || {};
  const su = suankiSlot(simdi);
  const bugun = istanbulSimdi(simdi);
  return GUNLER.map((ad, gun) => ({
    gun,
    ad,
    kisa: GUN_KISA[gun],
    tarih: gunTarihi(haftaId, gun),
    bugun: bugun.haftaId === haftaId && bugun.gun === gun,
    haftaSonu: gun >= 4,
    slotlar: SAATLER.map((saatAd, saat) => {
      const anahtar = slotAnahtari(gun, saat);
      const s = slotlar[anahtar] || { sahip: '' };
      const z = slotZamani(haftaId, gun, saat);
      const tur = slotTuru(gun, saat);
      return {
        anahtar, gun, saat, saatAd, saatKisa: SAAT_KISA[saat],
        sahip: s.sahip,
        bos: s.sahip === '',
        onceki: s.onceki,
        takasli: !!s.takas,
        gecmis: z.bit <= simdi,
        simdi: !!su && su.haftaId === haftaId && su.gun === gun && su.saat === saat,
        benim: !!ben && s.sahip === ben.sahip,
        cikti: cikislar[anahtar] || null,
        tur, turEtiket: TUR_ETIKET[tur],
        kilitli: tur === 'sabit',
        yagis: slotYagis(hava, haftaId, gun, saat)
      };
    })
  }));
}

function slotSinifi(s) {
  return ['slot',
    s.bos && !s.gecmis ? 'bos' : '',
    s.simdi ? 'simdi' : '',
    s.gecmis ? 'gecmis' : '',
    s.benim && !s.gecmis ? 'benim' : ''].filter(Boolean).join(' ');
}

function SlotKutusu({ s, ac, kisa }) {
  const yagmur = s.yagis != null && s.yagis >= 30 && !s.gecmis;
  const yagmurSinif = s.yagis >= 50 ? 'yagmur' : 'yagmur hafif';
  return html`<button class=${slotSinifi(s)} onClick=${() => ac(s.anahtar)}
      aria-label=${`${GUNLER[s.gun]} ${s.saatAd}: ${s.bos ? 'boş slot' : s.sahip}`}>
    <span class="slot-ust">
      <span class="saat">${kisa ? s.saatKisa : s.saatAd}</span>
      <span class="slot-isaretler">
        ${yagmur && html`<span class=${yagmurSinif} title=${`Yağış ihtimali %${s.yagis}`}><${Ikon} ad="damla" boyut=${13} />%${s.yagis}</span>`}
        ${s.kilitli && html`<span class="soluk" title="Sabit slot"><${Ikon} ad="kilit" boyut=${13} /></span>`}
        ${s.simdi && html`<span class="canli-nokta" title="Şu an"></span>`}
      </span>
    </span>
    ${s.bos
      ? html`<span class="slot-ad bos-ad">${s.gecmis ? 'Boş kaldı' : 'Boş slot'}</span>
             <span class="slot-alt">${s.onceki ? `${s.onceki} bıraktı` : s.turEtiket}</span>`
      : html`<span class="slot-ad-satir">
               <span class="slot-ad">${s.sahip}</span>
               ${s.benim && !s.gecmis && html`<span class="sen-etiket">SEN</span>`}
             </span>
             <span class="slot-alt">
               ${s.cikti ? html`<span class="cikti"><${Ikon} ad="tik" boyut=${12} kalinlik=${3} /> Çıktı ${saatYaz(s.cikti.zaman)}</span>` : (s.takasli ? 'Takaslı' : s.turEtiket)}
             </span>`}
  </button>`;
}

export function HaftaTakvimi({ model, ac }) {
  return html`<div class="takvim-kaydir">
    <div class="takvim-izgara">
      ${model.map((g) => html`<div class=${'gun' + (g.bugun ? ' bugun' : '') + (g.haftaSonu ? ' hafta-sonu' : '')}>
        <div class="gun-baslik">
          <span class="gun-ad">${g.ad}</span>
          <span class="gun-tarih">${g.bugun ? 'Bugün' : g.tarih}</span>
        </div>
        ${g.slotlar.map((s) => html`<${SlotKutusu} s=${s} ac=${ac} kisa=${true} />`)}
      </div>`)}
    </div>
  </div>`;
}

/** Telefon için: gün seçici + seçili günün slotları. */
export function GunGorunumu({ model, ac, gun, gunSec }) {
  const g = model[gun] || model[0];
  return html`<div class="gun-gorunumu">
    <div class="gun-secici" role="tablist" aria-label="Gün seç">
      ${model.map((x) => html`<button role="tab" aria-selected=${x.gun === g.gun}
          class=${'gun-cip' + (x.gun === g.gun ? ' secili' : '') + (x.bugun ? ' bugun' : '')}
          onClick=${() => gunSec(x.gun)}>
        <span>${x.kisa}</span><strong>${x.tarih.split(' ')[0]}</strong>
      </button>`)}
    </div>
    <div class="gun-liste-baslik">
      <h3>${g.ad}${g.bugun ? ' · Bugün' : ''}</h3>
      <span class="soluk">${g.tarih}</span>
    </div>
    <div class="gun-liste">
      ${g.slotlar.map((s) => html`<${SlotKutusu} s=${s} ac=${ac} />`)}
    </div>
  </div>`;
}

export function SimdiKarti({ simdi, buHaftaModeli, sonrakiModel, ben, ac, cikisYap }) {
  const su = suankiSlot(simdi);
  const tum = buHaftaModeli.flatMap((g) => g.slotlar);
  const aktif = su ? tum.find((s) => s.gun === su.gun && s.saat === su.saat) : null;
  const sn = sonrakiSlot(simdi);
  const sonraki = sonrakiModel.find((s) => s.gun === sn.gun && s.saat === sn.saat);
  const snZaman = slotZamani(sn.haftaId, sn.gun, sn.saat);

  if (!aktif) {
    return html`<section class="kart simdi-kart" aria-label="Şu an meydanda">
      <div class="simdi-sol">
        <span class="durum-etiket soluk-etiket"><span class="nokta gri"></span>Meydan şu an boş</span>
        <span class="buyuk-ad">${sonraki ? (sonraki.bos ? 'Boş slot' : sonraki.sahip) : '—'}</span>
        <span class="soluk">İlk slot: ${GUNLER[sn.gun]} ${SAATLER[sn.saat]}</span>
      </div>
      <div class="simdi-sag">
        <div class="sayac-kutu">
          <span class="kucuk-baslik">Başlamasına kalan</span>
          <span class="sayac">${sureYaz(snZaman.bas - simdi)}</span>
        </div>
      </div>
    </section>`;
  }

  const z = slotZamani(su.haftaId, su.gun, su.saat);
  const yuzde = Math.min(100, Math.max(0, ((simdi - z.bas) / (z.bit - z.bas)) * 100));
  const benimAktif = aktif.benim && !aktif.cikti;
  return html`<section class="kart simdi-kart" aria-label="Şu an meydanda">
    <div class="simdi-sol">
      ${aktif.cikti
        ? html`<span class="durum-etiket"><span class="nokta yesil"></span>Şu an meydanda · canlı</span>`
        : html`<span class="durum-etiket uyari-etiket"><span class="nokta amber"></span>Slot sürüyor · henüz "Çıktım" denmedi</span>`}
      <div class="simdi-ad-satir">
        <button class="buyuk-ad bag" onClick=${() => ac(aktif.anahtar)}>${aktif.bos ? 'Boş slot' : aktif.sahip}</button>
        <span class="mono soluk">${GUNLER[aktif.gun]} · ${aktif.saatAd}</span>
      </div>
      ${aktif.cikti && html`<span class="soluk">${aktif.cikti.ad || aktif.cikti.sahip} ${saatYaz(aktif.cikti.zaman)}'te "Çıktım" dedi</span>`}
      <div class="ilerleme"><div style=${`width:${yuzde}%`}></div></div>
      ${benimAktif && html`<button class="btn birincil buyuk" onClick=${() => cikisYap(aktif.anahtar)}>
        <${Ikon} ad="muzik" /> Meydana çıktım
      </button>`}
    </div>
    <div class="simdi-sag">
      <div class="sayac-kutu">
        <span class="kucuk-baslik">Slot bitimine</span>
        <span class="sayac">${sureYaz(z.bit - simdi)}</span>
      </div>
      ${sonraki && html`<div class="sonraki-satir">
        <span class="soluk">Sıradaki</span>
        <span><strong>${sonraki.bos ? 'Boş slot' : sonraki.sahip}</strong> <span class="mono soluk">${saatYaz(snZaman.bas)}</span></span>
      </div>`}
    </div>
  </section>`;
}

/** Slota tıklayınca açılan pencere: duruma göre işlemler. */
export function SlotPenceresi({ haftaId, anahtar, veri, model, ben, ayarlar, simdi, kapat, bildir, hava }) {
  const s = model.flatMap((g) => g.slotlar).find((x) => x.anahtar === anahtar);
  const slotlar = haftaSlotlari(haftaId, veri);
  const alimlar = (veri && veri.alimlar) || {};
  const cikislar = (veri && veri.cikislar) || {};
  const [mod, setMod] = useState(null); // 'birak' | 'takas'
  const [not, setNot] = useState('');
  const [hedef, setHedef] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [adminSahip, setAdminSahip] = useState(s ? s.sahip : '');
  if (!s) return null;

  const yap = async (fn, basari) => {
    setMesgul(true);
    try {
      await fn();
      bildir(basari);
      kapat();
    } catch (e) {
      bildir(e.message || 'Bir hata oluştu.', true);
    } finally {
      setMesgul(false);
    }
  };

  const asil = haftaProgrami(haftaId)[anahtar];
  const alimEng = s.bos ? alimEngeli({ ben, haftaId, anahtar, slotlar, alimlar, ayarlar, simdi }) : null;
  const oncelik = s.bos ? oncelikDurumu({ haftaId, anahtar, slotlar, alimlar, ayarlar, simdi }) : null;
  const cikisEng = s.benim ? cikisEngeli(ben, haftaId, anahtar, slotlar, cikislar, ayarlar, simdi) : 'x';
  const benimSlotlarim = model.flatMap((g) => g.slotlar).filter((x) => x.benim && !x.gecmis && x.anahtar !== anahtar);
  const baskaSlotlar = model.flatMap((g) => g.slotlar).filter((x) => !x.benim && !x.bos && !x.gecmis);
  const yagmur = s.yagis;

  return html`<${Pencere} baslik=${`${GUNLER[s.gun]} · ${s.saatAd}`} kapat=${kapat}>
    <div class="slot-detay">
      <div class="detay-ad">${s.bos ? 'Boş slot' : s.sahip}${s.benim ? html` <span class="sen-etiket">SEN</span>` : ''}</div>
      <div class="detay-satirlar">
        <div><span class="soluk">Tarih</span><span>${gunTarihi(haftaId, s.gun)}</span></div>
        <div><span class="soluk">Tür</span><span>${s.turEtiket}</span></div>
        ${asil && asil !== s.sahip && html`<div><span class="soluk">Asıl sahibi</span><span>${asil}</span></div>`}
        ${s.cikti && html`<div><span class="soluk">Çıkış</span><span class="yesil-yazi">${s.cikti.ad || s.cikti.sahip} · ${saatYaz(s.cikti.zaman)}</span></div>`}
        ${yagmur != null && html`<div><span class="soluk">Yağış ihtimali</span><span>%${yagmur}</span></div>`}
      </div>

      ${!mod && html`<div class="islem-listesi">
        ${s.benim && !cikisEng && html`<button class="btn birincil" disabled=${mesgul}
          onClick=${() => yap(() => cikisYapildi(ben, haftaId, anahtar), 'Kolay gelsin! Çıkışın kaydedildi.')}>
          <${Ikon} ad="muzik" /> Meydana çıktım</button>`}
        ${s.bos && !s.gecmis && html`<button class="btn birincil" disabled=${mesgul || !!alimEng}
          onClick=${() => yap(() => slotuAl(ben, haftaId, anahtar, ayarlar), 'Slot senin oldu.')}>Slotu al</button>
          <p class=${alimEng ? 'uyari-yazi' : 'soluk'}>${alimEng || `${oncelik ? `Öncelik sende; ${saatYaz(oncelik.bitis)}'den sonra herkese açılacak. ` : ''}Bu hafta ${kalanAlimHakki(ben, alimlar, ayarlar)} alım hakkın kaldı.`}</p>`}
        ${s.benim && !s.gecmis && !s.cikti && html`
          <button class="btn" onClick=${() => setMod('takas')} disabled=${baskaSlotlar.length === 0}><${Ikon} ad="takas" /> Takas teklif et</button>
          <button class="btn tehlike" onClick=${() => setMod('birak')}>Bu slota çıkamıyorum</button>`}
        ${!s.benim && !s.bos && !s.gecmis && html`
          <button class="btn" onClick=${() => setMod('takas')} disabled=${benimSlotlarim.length === 0}><${Ikon} ad="takas" /> ${s.sahip} ile takas iste</button>
          ${benimSlotlarim.length === 0 && html`<p class="soluk">Bu hafta takasa verebileceğin bir slotun yok.</p>`}`}
        ${s.gecmis && html`<p class="soluk">Bu slotun saati geçti.</p>`}
      </div>`}

      ${mod === 'birak' && html`<div class="form">
        <p>Slot boşa düşecek, sohbette herkes görecek ve isteyen alabilecek.</p>
        <label class="alan">Not (isteğe bağlı)
          <textarea rows="2" maxlength="300" placeholder="Örn. işim çıktı, kim alırsa iyi olur" value=${not} onInput=${(e) => setNot(e.target.value)}></textarea>
        </label>
        <div class="satir">
          <button class="btn" onClick=${() => setMod(null)}>Vazgeç</button>
          <button class="btn tehlike-dolu" disabled=${mesgul}
            onClick=${() => yap(() => slotuBirak(ben, haftaId, anahtar, not), 'Slot boşa bırakıldı.')}>Slotu bırak</button>
        </div>
      </div>`}

      ${mod === 'takas' && html`<div class="form">
        <label class="alan">${s.benim ? 'Hangi slotla değişmek istiyorsun?' : 'Karşılığında hangi slotunu veriyorsun?'}
          <select value=${hedef} onChange=${(e) => setHedef(e.target.value)}>
            <option value="">Seç…</option>
            ${(s.benim ? baskaSlotlar : benimSlotlarim).map((x) => html`<option value=${x.anahtar}>
              ${GUN_KISA[x.gun]} ${x.saatKisa}${s.benim ? ` · ${x.sahip}` : ''}</option>`)}
          </select>
        </label>
        <label class="alan">Mesajın
          <textarea rows="2" maxlength="300" placeholder="Örn. Abi perşembe işim çıktı, değişir misin?" value=${not} onInput=${(e) => setNot(e.target.value)}></textarea>
        </label>
        <div class="satir">
          <button class="btn" onClick=${() => setMod(null)}>Vazgeç</button>
          <button class="btn birincil" disabled=${mesgul || !hedef}
            onClick=${() => yap(() => (s.benim
              ? takasTeklifEt(ben, haftaId, anahtar, hedef, not, ayarlar)
              : takasTeklifEt(ben, haftaId, hedef, anahtar, not, ayarlar)),'Teklif gönderildi. Karşı taraf onaylayınca takvim değişecek.')}>Teklif gönder</button>
        </div>
      </div>`}

      ${ben.admin && html`<details class="admin-kutu">
        <summary><${Ikon} ad="tac" boyut=${14} /> Admin: slotu elle ayarla</summary>
        <div class="satir">
          <select value=${adminSahip} onChange=${(e) => setAdminSahip(e.target.value)}>
            <option value="">BOŞ</option>
            ${SAHIPLER.map((x) => html`<option value=${x}>${x}</option>`)}
          </select>
          <button class="btn" disabled=${mesgul}
            onClick=${() => yap(() => adminSlotAta(ben, haftaId, anahtar, adminSahip), 'Slot güncellendi.')}>Kaydet</button>
        </div>
      </details>`}
    </div>
  </${Pencere}>`;
}

/** Kimin kaç asıl slotu var, bu hafta kaç aldı, kaç hakkı kaldı, kim öncelikli. */
export function SlotHaklari({ haftaId, veri, ayarlar }) {
  const a = { ...VARSAYILAN_AYARLAR, ...(ayarlar || {}) };
  const asil = asilSlotSayilari(haftaId);
  const alimlar = (veri && veri.alimlar) || {};
  const satirlar = SAHIPLER.map((ad) => {
    const aldi = Object.keys(alimlar[ad] || {}).length;
    return { ad, asil: asil[ad] || 0, aldi, kalan: Math.max(0, a.maxAlim - aldi), oncelikli: (asil[ad] || 0) < a.oncelikEsik };
  }).sort((x, y) => (y.oncelikli - x.oncelikli) || (x.asil - y.asil) || x.ad.localeCompare(y.ad, 'tr'));
  return html`<section class="kart" aria-label="Slot hakları">
    <div class="kart-baslik">
      <h2>Slot hakları</h2>
      <span class="soluk kucuk">Haftada ${a.oncelikEsik}'ten az asıl slotu olan öncelikli · herkes en fazla ${a.maxAlim} boş slot alır</span>
    </div>
    <div class="hak-izgara">
      ${satirlar.map((r) => html`<div class=${'hak-satir' + (r.oncelikli ? ' oncelikli' : '')}>
        <div class="hak-ust">
          <strong>${r.ad}</strong>
          ${r.oncelikli && html`<span class="oncelik-etiket">ÖNCELİKLİ</span>`}
        </div>
        <div class="hak-sayilar">
          <span><b>${r.asil}</b> asıl slot</span>
          <span><b>${r.aldi}</b> aldı</span>
          <span><b>${r.kalan}</b> hak kaldı</span>
        </div>
        <div class="soluk kucuk">Bu hafta en fazla ${r.asil + a.maxAlim} slot çıkabilir</div>
      </div>`)}
    </div>
  </section>`;
}

/** Bu hafta kim kaç slot planlı, kaçına çıktı. */
export function HaftaTablosu({ model }) {
  const say = {};
  SAHIPLER.forEach((ad) => { say[ad] = { plan: 0, cikti: 0 }; });
  model.flatMap((g) => g.slotlar).forEach((s) => {
    if (!s.sahip) return;
    say[s.sahip] = say[s.sahip] || { plan: 0, cikti: 0 };
    say[s.sahip].plan += 1;
    if (s.cikti) say[s.sahip].cikti += 1;
  });
  const sira = Object.entries(say).sort((a, b) => b[1].cikti - a[1].cikti || b[1].plan - a[1].plan || a[0].localeCompare(b[0], 'tr'));
  return html`<section class="kart" aria-label="Haftalık tablo">
    <div class="kart-baslik">
      <h2>Bu hafta kim ne kadar çıktı</h2>
      <span class="soluk kucuk">"Çıktım" denen slotlar sayılır · slot başı 3 saat</span>
    </div>
    <div class="tablo-izgara">
      ${sira.map(([ad, v]) => html`<div class="tablo-satir">
        <div class="tablo-ust"><strong>${ad}</strong><span class="mono soluk">${v.cikti}/${v.plan} slot · ${v.cikti * 3} sa</span></div>
        <div class="ilerleme ince"><div style=${`width:${v.plan ? (v.cikti / v.plan) * 100 : 0}%`}></div></div>
      </div>`)}
    </div>
  </section>`;
}

export function HavaRozeti({ hava }) {
  if (!hava) return null;
  const kod = hava.simdi.kod;
  return html`<div class="rozet" title="Beşiktaş hava durumu">
    <${Ikon} ad=${kod <= 1 ? 'gunes' : (kod >= 51 ? 'damla' : 'bulut')} boyut=${20} />
    <strong>${hava.simdi.sicaklik}°</strong>
    <span class="soluk">${kodAciklama(kod)}</span>
  </div>`;
}
