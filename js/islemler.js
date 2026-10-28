// Slot işlemleri: devir, alım, takas, çıkış, sohbet ve admin işlemleri.
// Kurallar burada kontrol edilir; Firebase güvenlik kuralları ayrıca sahiplik
// kontrolünü sunucu tarafında yapar.
import {
  haftaProgrami, slotAnahtari, slotCoz, slotGecmisMi, slotZamani, GUNLER, SAATLER, epostaAnahtari, SAHIPLER, saatYaz
} from './rotasyon.js';
import { oku, yaz, toplu, yeniAnahtar, SUNUCU_ZAMANI, sil } from './firebase.js';

export const VARSAYILAN_AYARLAR = {
  maxAlim: 2, // Bir kişi haftada en fazla kaç boş slot alabilir
  gundeTekSlot: false, // true olursa: bir kişi aynı gün en fazla bir slot
  cikisErkenDk: 30, // "Çıktım" slot başlamadan kaç dakika önce basılabilir
  oncelikEsik: 3, // Haftada bundan az asıl slotu olanlar öncelikli
  oncelikSaat: 2 // Boşalan slotu ilk kaç saat sadece öncelikliler alabilir
};

const ayar = (ayarlar) => ({ ...VARSAYILAN_AYARLAR, ...(ayarlar || {}) });

/** Haftanın asıl (takassız) programına göre kimin kaç slotu var. */
export function asilSlotSayilari(haftaId) {
  const say = {};
  SAHIPLER.forEach((s) => { say[s] = 0; });
  Object.values(haftaProgrami(haftaId)).forEach((s) => { say[s] = (say[s] || 0) + 1; });
  return say;
}

export function oncelikliMi(sahip, haftaId, ayarlar) {
  return (asilSlotSayilari(haftaId)[sahip] || 0) < ayar(ayarlar).oncelikEsik;
}

const alimSayisi = (alimlar, sahip) => Object.keys((alimlar || {})[sahip] || {}).length;

/**
 * Boş bir slotta öncelik süresi işliyor mu?
 * { bitis, adaylar } döner; öncelik yoksa ya da bittiyse null.
 * Öncelik, slotu bırakan kişi hariç, hâlâ alım hakkı olan öncelikli kişiler içindir.
 */
export function oncelikDurumu({ haftaId, anahtar, slotlar, alimlar, ayarlar, simdi = Date.now() }) {
  const a = ayar(ayarlar);
  const s = slotlar[anahtar];
  if (!s || s.sahip !== '' || !s.birakma || !a.oncelikSaat) return null;
  const { gun, saat } = slotCoz(anahtar);
  const bas = slotZamani(haftaId, gun, saat).bas;
  const bitis = Math.min(s.birakma + a.oncelikSaat * 3600000, bas - 3600000);
  if (simdi >= bitis) return null;
  const asil = asilSlotSayilari(haftaId);
  const adaylar = SAHIPLER.filter((x) => asil[x] < a.oncelikEsik && x !== s.onceki && alimSayisi(alimlar, x) < a.maxAlim);
  if (!adaylar.length) return null;
  return { bitis, adaylar };
}

export const slotAdi = (anahtar) => {
  const { gun, saat } = slotCoz(anahtar);
  return `${GUNLER[gun]} ${SAATLER[saat]}`;
};

/** Veritabanındaki hafta + hesaplanan program birleşimi: { anahtar: { sahip, ... } } */
export function haftaSlotlari(haftaId, haftaVerisi) {
  if (haftaVerisi && haftaVerisi.slotlar) return haftaVerisi.slotlar;
  const p = haftaProgrami(haftaId);
  const s = {};
  Object.keys(p).forEach((k) => { s[k] = { sahip: p[k] }; });
  return s;
}

/** Hafta veritabanında yoksa hesaplanan programla oluşturur. */
export async function haftayiHazirla(haftaId) {
  const var_ = await oku(`haftalar/${haftaId}/slotlar`);
  if (var_) return;
  const p = haftaProgrami(haftaId);
  const s = {};
  Object.keys(p).forEach((k) => { s[k] = { sahip: p[k] }; });
  try {
    await yaz(`haftalar/${haftaId}/slotlar`, s);
  } catch (e) {
    // Aynı anda başka biri oluşturduysa sorun değil.
  }
}

async function tazeHafta(haftaId) {
  await haftayiHazirla(haftaId);
  const h = (await oku(`haftalar/${haftaId}`)) || {};
  return { slotlar: h.slotlar || {}, alimlar: h.alimlar || {}, cikislar: h.cikislar || {} };
}

function gundekiSlotlar(slotlar, sahip, gun, haric = []) {
  return Object.keys(slotlar).filter((k) => slotCoz(k).gun === gun && slotlar[k].sahip === sahip && !haric.includes(k));
}

function kayitVeSohbet(ben, degisiklik, metin, sohbetEk) {
  const kayitId = yeniAnahtar('kayit');
  degisiklik[`kayit/${kayitId}`] = { uid: ben.uid, ad: ben.ad, sahip: ben.sahip, metin, zaman: SUNUCU_ZAMANI() };
  if (sohbetEk) {
    const id = yeniAnahtar('sohbet');
    degisiklik[`sohbet/${id}`] = { uid: ben.uid, ad: ben.ad, sahip: ben.sahip, zaman: SUNUCU_ZAMANI(), ...sohbetEk };
  }
}

// ---- Alım kuralları ----

/** Alım yapılabilir mi? Yapılamıyorsa nedenini döndürür. */
export function alimEngeli({ ben, haftaId, anahtar, slotlar, alimlar, ayarlar, simdi = Date.now() }) {
  const a = ayar(ayarlar);
  const { gun, saat } = slotCoz(anahtar);
  if (!slotlar[anahtar] || slotlar[anahtar].sahip !== '') return 'Bu slot artık boş değil.';
  if (slotGecmisMi(haftaId, gun, saat, simdi)) return 'Bu slotun saati geçti.';
  if (alimSayisi(alimlar, ben.sahip) >= a.maxAlim) return `Bu hafta en fazla ${a.maxAlim} boş slot alabilirsin; hakkın doldu.`;
  if (a.gundeTekSlot && gundekiSlotlar(slotlar, ben.sahip, gun).length > 0) {
    return `${GUNLER[gun]} günü zaten bir slotun var.`;
  }
  const o = oncelikDurumu({ haftaId, anahtar, slotlar, alimlar, ayarlar, simdi });
  if (o && !o.adaylar.includes(ben.sahip)) {
    return `Öncelik slotu az olanlarda (${o.adaylar.join(', ')}). Almazlarsa ${saatYaz(o.bitis)}'den sonra alabilirsin.`;
  }
  return null;
}

export function kalanAlimHakki(ben, alimlar, ayarlar) {
  return Math.max(0, ayar(ayarlar).maxAlim - alimSayisi(alimlar, ben.sahip));
}

// ---- İşlemler ----

export async function slotuBirak(ben, haftaId, anahtar, not = '') {
  const h = await tazeHafta(haftaId);
  const { gun, saat } = slotCoz(anahtar);
  if (h.slotlar[anahtar]?.sahip !== ben.sahip) throw new Error('Bu slot senin değil.');
  if (slotGecmisMi(haftaId, gun, saat)) throw new Error('Saati geçmiş bir slot bırakılamaz.');
  if (h.cikislar[anahtar]) throw new Error('Bu slota çıkış yapılmış, bırakılamaz.');
  const d = {};
  d[`haftalar/${haftaId}/slotlar/${anahtar}`] = { sahip: '', onceki: ben.sahip, birakma: SUNUCU_ZAMANI() };
  const metin = `${ben.sahip}, ${slotAdi(anahtar)} slotunu boşalttı.`;
  kayitVeSohbet(ben, d, metin, { tip: 'bos', hafta: haftaId, slot: anahtar, metin: not.trim().slice(0, 300) });
  await toplu(d);
}

export async function slotuAl(ben, haftaId, anahtar, ayarlar) {
  const h = await tazeHafta(haftaId);
  const engel = alimEngeli({ ben, haftaId, anahtar, slotlar: h.slotlar, alimlar: h.alimlar, ayarlar });
  if (engel) throw new Error(engel);
  const d = {};
  d[`haftalar/${haftaId}/slotlar/${anahtar}`] = { sahip: ben.sahip, onceki: h.slotlar[anahtar].onceki || '' };
  d[`haftalar/${haftaId}/alimlar/${ben.sahip}/${anahtar}`] = true;
  const metin = `${ben.sahip}, ${slotAdi(anahtar)} slotunu aldı.`;
  kayitVeSohbet(ben, d, metin, { tip: 'sistem', metin });
  await toplu(d);
}

export async function takasTeklifEt(ben, haftaId, verilen, istenen, mesaj, ayarlar) {
  const gunKurali = ayar(ayarlar).gundeTekSlot;
  const h = await tazeHafta(haftaId);
  const s = h.slotlar;
  const alan = s[istenen]?.sahip;
  if (s[verilen]?.sahip !== ben.sahip) throw new Error('Verdiğin slot senin değil.');
  if (!alan) throw new Error('İstediğin slot boş; takas yerine doğrudan alabilirsin.');
  if (alan === ben.sahip) throw new Error('Kendi slotunla takas yapamazsın.');
  for (const k of [verilen, istenen]) {
    const { gun, saat } = slotCoz(k);
    if (slotGecmisMi(haftaId, gun, saat)) throw new Error(`${slotAdi(k)} slotunun saati geçti.`);
  }
  const vg = slotCoz(verilen).gun;
  const ig = slotCoz(istenen).gun;
  if (gunKurali && gundekiSlotlar(s, ben.sahip, ig, [verilen]).length > 0) {
    throw new Error(`${GUNLER[ig]} günü zaten başka bir slotun var; aynı gün iki slot olmaz.`);
  }
  if (gunKurali && gundekiSlotlar(s, alan, vg, [istenen]).length > 0) {
    throw new Error(`${alan} kişisinin ${GUNLER[vg]} günü zaten bir slotu var.`);
  }
  const id = yeniAnahtar('takaslar');
  const d = {};
  d[`takaslar/${id}`] = {
    hafta: haftaId, gonderen: ben.sahip, gonderenAd: ben.ad, alan, verilen, istenen,
    mesaj: (mesaj || '').trim().slice(0, 300), durum: 'bekliyor', zaman: SUNUCU_ZAMANI()
  };
  kayitVeSohbet(ben, d, `${ben.sahip}, ${alan} kişisine takas teklif etti: ${slotAdi(verilen)} ↔ ${slotAdi(istenen)}.`, {
    tip: 'takas', takas: id, metin: (mesaj || '').trim().slice(0, 300)
  });
  await toplu(d);
}

export async function takasiYanitla(ben, id, kabul) {
  const t = await oku(`takaslar/${id}`);
  if (!t || t.durum !== 'bekliyor') throw new Error('Bu teklif artık geçerli değil.');
  if (t.alan !== ben.sahip) throw new Error('Bu teklif sana gelmemiş.');
  const d = {};
  if (!kabul) {
    d[`takaslar/${id}/durum`] = 'red';
    kayitVeSohbet(ben, d, `${ben.sahip}, ${t.gonderen} kişisinin takas teklifini reddetti.`, null);
    return toplu(d);
  }
  const h = await tazeHafta(t.hafta);
  if (h.slotlar[t.verilen]?.sahip !== t.gonderen || h.slotlar[t.istenen]?.sahip !== ben.sahip) {
    await yaz(`takaslar/${id}/durum`, 'red').catch(() => {});
    throw new Error('Slotlar bu arada değişmiş; teklif geçersiz oldu.');
  }
  for (const k of [t.verilen, t.istenen]) {
    const { gun, saat } = slotCoz(k);
    if (slotGecmisMi(t.hafta, gun, saat)) throw new Error('Slotlardan birinin saati geçti.');
  }
  d[`haftalar/${t.hafta}/slotlar/${t.verilen}`] = { sahip: ben.sahip, takas: id };
  d[`haftalar/${t.hafta}/slotlar/${t.istenen}`] = { sahip: t.gonderen, takas: id };
  d[`takaslar/${id}/durum`] = 'kabul';
  const metin = `${t.gonderen} ile ${ben.sahip} takas yaptı: ${slotAdi(t.verilen)} ↔ ${slotAdi(t.istenen)}.`;
  kayitVeSohbet(ben, d, metin, { tip: 'sistem', metin });
  await toplu(d);
}

export async function takasiIptalEt(ben, id) {
  const t = await oku(`takaslar/${id}`);
  if (!t || t.durum !== 'bekliyor' || t.gonderen !== ben.sahip) throw new Error('Bu teklif iptal edilemez.');
  await toplu({ [`takaslar/${id}/durum`]: 'iptal' });
}

/** "Çıktım": slot başlamadan en çok X dk önce ve bitmeden önce basılabilir. */
export function cikisEngeli(ben, haftaId, anahtar, slotlar, cikislar, ayarlar, simdi = Date.now()) {
  const a = { ...VARSAYILAN_AYARLAR, ...(ayarlar || {}) };
  const { gun, saat } = slotCoz(anahtar);
  const z = slotZamani(haftaId, gun, saat);
  if (slotlar[anahtar]?.sahip !== ben.sahip) return 'Bu slot senin değil.';
  if ((cikislar || {})[anahtar]) return 'Bu slot için zaten "Çıktım" denmiş.';
  if (simdi < z.bas - a.cikisErkenDk * 60000) return `"Çıktım" slot başlamadan en fazla ${a.cikisErkenDk} dk önce basılabilir.`;
  if (simdi >= z.bit) return 'Bu slotun saati bitti.';
  return null;
}

export async function cikisYapildi(ben, haftaId, anahtar) {
  const d = {};
  d[`haftalar/${haftaId}/cikislar/${anahtar}`] = { uid: ben.uid, ad: ben.ad, sahip: ben.sahip, zaman: SUNUCU_ZAMANI() };
  const metin = `${ben.sahip} meydana çıktı (${slotAdi(anahtar)}).`;
  kayitVeSohbet(ben, d, metin, { tip: 'sistem', metin });
  await toplu(d);
}

export async function mesajGonder(ben, metin) {
  const m = metin.trim().slice(0, 1000);
  if (!m) return;
  const id = yeniAnahtar('sohbet');
  await yaz(`sohbet/${id}`, { uid: ben.uid, ad: ben.ad, sahip: ben.sahip, tip: 'mesaj', metin: m, zaman: SUNUCU_ZAMANI() });
}

export async function geribildirimGonder(ben, metin) {
  const m = metin.trim().slice(0, 2000);
  if (!m) return;
  const id = yeniAnahtar('geribildirim');
  await yaz(`geribildirim/${id}`, { uid: ben.uid, ad: ben.ad, sahip: ben.sahip, metin: m, zaman: SUNUCU_ZAMANI() });
}

// ---- Katılım talebi (üye olmayanlar) ----

export async function talepGonder(kullanici, istenenSahip, ad) {
  await yaz(`talepler/${kullanici.uid}`, {
    eposta: kullanici.email, ad: (ad || kullanici.displayName || '').trim().slice(0, 60),
    istenen: istenenSahip, zaman: SUNUCU_ZAMANI()
  });
}

// ---- Admin ----

export async function uyeKaydet(eposta, sahip, ad, admin = false) {
  await yaz(`uyeler/${epostaAnahtari(eposta)}`, { eposta: eposta.trim().toLowerCase(), sahip, ad: ad.trim(), admin: !!admin });
}

export const uyeSil = (eposta) => sil(`uyeler/${epostaAnahtari(eposta)}`);

export async function talebiOnayla(uid, talep, sahip) {
  const d = {};
  d[`uyeler/${epostaAnahtari(talep.eposta)}`] = { eposta: talep.eposta.toLowerCase(), sahip, ad: talep.ad || '', admin: false };
  d[`talepler/${uid}`] = null;
  await toplu(d);
}

export const talebiReddet = (uid) => sil(`talepler/${uid}`);

export const ayarlariKaydet = (ayarlar) => yaz('ayarlar', ayarlar);

export async function adminSlotAta(ben, haftaId, anahtar, sahip) {
  await haftayiHazirla(haftaId);
  const d = {};
  d[`haftalar/${haftaId}/slotlar/${anahtar}`] = { sahip, admin: true };
  kayitVeSohbet(ben, d, `Admin, ${slotAdi(anahtar)} slotunu ${sahip || 'BOŞ'} olarak ayarladı.`, null);
  await toplu(d);
}

export async function haftayiSifirla(ben, haftaId) {
  const p = haftaProgrami(haftaId);
  const s = {};
  Object.keys(p).forEach((k) => { s[k] = { sahip: p[k] }; });
  const d = {};
  d[`haftalar/${haftaId}`] = { slotlar: s };
  kayitVeSohbet(ben, d, `Admin, ${haftaId} haftasını asıl kadroya sıfırladı.`, null);
  await toplu(d);
}

export { slotAnahtari };
