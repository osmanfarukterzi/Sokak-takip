// Meydan — dönüş motoru ve zaman yardımcıları.
// Bu dosya saf JavaScript'tir (tarayıcı veya Node), Firebase'e bağlı değildir.

export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Prş', 'Cum', 'Cmt', 'Paz'];
export const SAATLER = ['12:00–15:00', '15:00–18:00', '18:00–21:00', '21:00–24:00'];
export const SAAT_KISA = ['12–15', '15–18', '18–21', '21–24'];
export const BASLANGIC_SAATI = [12, 15, 18, 21];
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// İstanbul yaz/kış saati uygulamıyor: her zaman UTC+3.
const IST_OFSET = 3 * 3600 * 1000;
const GUN_MS = 24 * 3600 * 1000;

/**
 * Başlangıç haftası: 26 Ekim 2026 Pazartesi. Bu haftanın asıl kadrosu aşağıda.
 * Her yeni haftada 4 grup kendi içinde birer adım kayar:
 *  1) Hafta içi öğlen (Pzt–Prş 12–15): SABİT, hiç değişmez.
 *  2) Hafta içi akşam (her gün 15–18, 18–21, 21–24): o günün içinde döner,
 *     21–24'teki kişi 15–18'e çıkar, diğerleri birer aşağı iner.
 *  3) Hafta sonu öğlen (Cuma, Cmt, Pazar 12–15): Cuma → Cmt → Pazar → Cuma.
 *  4) Hafta sonu akşam (Cuma/Cmt/Pazar × 3 = 9 slot): tek sıra halinde ilerler,
 *     Pazar 21–24'teki kişi Cuma 15–18'e döner (9 haftalık döngü).
 */
export const BASLANGIC_HAFTA = '2026-10-26';

export const ANA_KADRO = {
  haftaIciOgle: ['Nebi', 'Doğa', 'Uğur', 'Mami'], // Pzt, Sal, Çar, Prş 12–15
  haftaIciAksam: [
    ['Berkhan', 'Uğur', 'Sirayet'], // Pazartesi 15, 18, 21
    ['Samet', 'İsmet', 'Raşit'], // Salı
    ['Nebi', 'Samet', 'Berkhan'], // Çarşamba
    ['Raşit', 'Sirayet', 'İsmet'] // Perşembe
  ],
  haftaSonuOgle: ['Mami', 'Yiğit', 'Doğa'], // Cuma, Cmt, Pazar 12–15
  haftaSonuAksam: ['Raşit', 'İsmet', 'Berkhan', 'Uğur', 'Sirayet', 'Farnefes', 'Samet', 'Enes', 'Nebi']
};

export const SAHIPLER = ['Sirayet', 'Nebi', 'Berkhan', 'Uğur', 'Samet', 'İsmet', 'Raşit', 'Doğa', 'Mami', 'Yiğit', 'Farnefes', 'Enes'];

const mod = (a, n) => ((a % n) + n) % n;
const kaydir = (dizi, k) => dizi.map((_, i) => dizi[mod(i - k, dizi.length)]);

export const slotAnahtari = (gun, saat) => `${gun}-${saat}`;
export const slotCoz = (anahtar) => {
  const [g, s] = anahtar.split('-').map(Number);
  return { gun: g, saat: s };
};

/** Haftanın Pazartesi gününün UTC gece yarısı (ms) karşılığı. */
function haftaMs(haftaId) {
  const [y, m, d] = haftaId.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function idYap(ms) {
  const t = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** Başlangıç haftasından bu yana kaç hafta geçti (önceki haftalar için negatif). */
export function haftaFarki(haftaId, baslangic = BASLANGIC_HAFTA) {
  return Math.round((haftaMs(haftaId) - haftaMs(baslangic)) / (7 * GUN_MS));
}

export function haftaKaydir(haftaId, k) {
  return idYap(haftaMs(haftaId) + k * 7 * GUN_MS);
}

/** Verilen haftanın asıl (takassız) programı: { "gun-saat": "Sahip" } */
export function haftaProgrami(haftaId, kadro = ANA_KADRO) {
  const k = haftaFarki(haftaId);
  const p = {};
  for (let g = 0; g < 4; g++) {
    p[slotAnahtari(g, 0)] = kadro.haftaIciOgle[g];
    kaydir(kadro.haftaIciAksam[g], k).forEach((ad, i) => {
      p[slotAnahtari(g, i + 1)] = ad;
    });
  }
  kaydir(kadro.haftaSonuOgle, k).forEach((ad, i) => {
    p[slotAnahtari(4 + i, 0)] = ad;
  });
  kaydir(kadro.haftaSonuAksam, k).forEach((ad, i) => {
    p[slotAnahtari(4 + Math.floor(i / 3), 1 + (i % 3))] = ad;
  });
  return p;
}

/** Slot türü: 'sabit' | 'haftaSonuOgle' | 'dongu' */
export function slotTuru(gun, saat) {
  if (saat === 0) return gun < 4 ? 'sabit' : 'haftaSonuOgle';
  return 'dongu';
}

export const TUR_ETIKET = { sabit: 'Sabit', haftaSonuOgle: 'Hafta sonu öğlen', dongu: 'Döngü' };

// ---- Zaman ----

/** İstanbul saatine göre "şimdi"nin parçaları. */
export function istanbulSimdi(simdiMs = Date.now()) {
  const t = new Date(simdiMs + IST_OFSET);
  const gun = mod(t.getUTCDay() - 1, 7); // 0 = Pazartesi
  const haftaId = idYap(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - gun * GUN_MS);
  return { haftaId, gun, saat: t.getUTCHours(), dakika: t.getUTCMinutes(), ms: simdiMs };
}

/** Slotun başlangıç ve bitiş anları (gerçek zaman damgası, ms). */
export function slotZamani(haftaId, gun, saat) {
  const bas = haftaMs(haftaId) + gun * GUN_MS + (BASLANGIC_SAATI[saat] * 3600 * 1000) - IST_OFSET;
  return { bas, bit: bas + 3 * 3600 * 1000 };
}

/** Şu an süren slot (yoksa null). */
export function suankiSlot(simdiMs = Date.now()) {
  const s = istanbulSimdi(simdiMs);
  if (s.saat < 12) return null;
  return { haftaId: s.haftaId, gun: s.gun, saat: Math.floor((s.saat - 12) / 3) };
}

/** Bundan sonraki ilk slot (şu an süren hariç). */
export function sonrakiSlot(simdiMs = Date.now()) {
  const s = istanbulSimdi(simdiMs);
  let haftaId = s.haftaId;
  let gun = s.gun;
  let saat = s.saat < 12 ? 0 : Math.floor((s.saat - 12) / 3) + 1;
  if (saat > 3) {
    saat = 0;
    gun += 1;
    if (gun > 6) {
      gun = 0;
      haftaId = haftaKaydir(haftaId, 1);
    }
  }
  return { haftaId, gun, saat };
}

export function slotGecmisMi(haftaId, gun, saat, simdiMs = Date.now()) {
  return slotZamani(haftaId, gun, saat).bit <= simdiMs;
}

export function gunTarihi(haftaId, gun) {
  const t = new Date(haftaMs(haftaId) + gun * GUN_MS);
  return `${t.getUTCDate()} ${AYLAR[t.getUTCMonth()]}`;
}

export function haftaBasligi(haftaId) {
  return `${gunTarihi(haftaId, 0)} – ${gunTarihi(haftaId, 6)}`;
}

export function sureYaz(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

export function saatYaz(ms) {
  const t = new Date(ms + IST_OFSET);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}

/** Firebase anahtarlarında '.' kullanılamaz. */
export const epostaAnahtari = (e) => e.trim().toLowerCase().replaceAll('.', ',');
