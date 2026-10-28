// Beşiktaş hava durumu (Open-Meteo, anahtar gerektirmez).
import { slotZamani } from './rotasyon.js';

const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=41.0422&longitude=29.0067'
  + '&current=temperature_2m,weather_code,precipitation'
  + '&hourly=temperature_2m,precipitation_probability,weather_code'
  + '&timezone=GMT&forecast_days=10';

export function kodAciklama(kod) {
  if (kod === 0) return 'Açık';
  if (kod <= 2) return 'Az bulutlu';
  if (kod === 3) return 'Kapalı';
  if (kod <= 48) return 'Sisli';
  if (kod <= 57) return 'Çiseleme';
  if (kod <= 67) return 'Yağmurlu';
  if (kod <= 77) return 'Karlı';
  if (kod <= 82) return 'Sağanak';
  if (kod <= 86) return 'Kar yağışlı';
  return 'Fırtına';
}

export const yagisliMi = (kod) => kod >= 51;

let onbellek = null;
let onbellekZamani = 0;

export async function havaGetir() {
  if (onbellek && Date.now() - onbellekZamani < 20 * 60 * 1000) return onbellek;
  const r = await fetch(URL_);
  if (!r.ok) throw new Error('hava alınamadı');
  const j = await r.json();
  const saatlik = {};
  j.hourly.time.forEach((t, i) => {
    saatlik[Date.parse(t + 'Z')] = {
      sicaklik: j.hourly.temperature_2m[i],
      yagis: j.hourly.precipitation_probability[i],
      kod: j.hourly.weather_code[i]
    };
  });
  onbellek = {
    simdi: { sicaklik: Math.round(j.current.temperature_2m), kod: j.current.weather_code },
    saatlik
  };
  onbellekZamani = Date.now();
  return onbellek;
}

/** Slot süresince en yüksek yağış ihtimali (%), veri yoksa null. */
export function slotYagis(hava, haftaId, gun, saat) {
  if (!hava) return null;
  const { bas } = slotZamani(haftaId, gun, saat);
  let enYuksek = null;
  for (let i = 0; i < 3; i++) {
    const s = hava.saatlik[bas + i * 3600000];
    if (s && s.yagis != null) enYuksek = Math.max(enYuksek ?? 0, s.yagis);
  }
  return enYuksek;
}
