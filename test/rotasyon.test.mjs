import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haftaProgrami, haftaKaydir, haftaFarki, istanbulSimdi, suankiSlot, sonrakiSlot, slotZamani, haftaBasligi
} from '../js/rotasyon.js';

const ilk = '2026-10-26';

test('başlangıç haftası sitedeki takvimle aynı', () => {
  const p = haftaProgrami(ilk);
  assert.equal(p['0-0'], 'Nebi');
  assert.deepEqual([p['0-1'], p['0-2'], p['0-3']], ['Berkhan', 'Uğur', 'Sirayet']);
  assert.deepEqual([p['3-1'], p['3-2'], p['3-3']], ['Raşit', 'Sirayet', 'İsmet']);
  assert.deepEqual([p['4-0'], p['5-0'], p['6-0']], ['Mami', 'Yiğit', 'Doğa']);
  assert.deepEqual([p['4-1'], p['4-2'], p['4-3']], ['Raşit', 'İsmet', 'Berkhan']);
  assert.deepEqual([p['6-1'], p['6-2'], p['6-3']], ['Samet', 'Enes', 'Nebi']);
  assert.equal(Object.keys(p).length, 28);
});

test('bir sonraki hafta: anlatılan kayma kuralları', () => {
  const p = haftaProgrami(haftaKaydir(ilk, 1));
  // Sabitler değişmez
  assert.deepEqual([p['0-0'], p['1-0'], p['2-0'], p['3-0']], ['Nebi', 'Doğa', 'Uğur', 'Mami']);
  // Pazartesi: 21–24'teki Sirayet 15–18'e, Berkhan 18–21'e, Uğur 21–24'e
  assert.deepEqual([p['0-1'], p['0-2'], p['0-3']], ['Sirayet', 'Berkhan', 'Uğur']);
  // Hafta sonu öğlen: Mami Cmt'ye, Yiğit Pazar'a, Doğa Cuma'ya
  assert.deepEqual([p['4-0'], p['5-0'], p['6-0']], ['Doğa', 'Mami', 'Yiğit']);
  // Zincir: Raşit Cuma 18–21'e, Pazar 21–24'teki Nebi Cuma 15–18'e
  assert.equal(p['4-1'], 'Nebi');
  assert.equal(p['4-2'], 'Raşit');
});

test('Raşit 9 haftada zinciri dolaşıp 10. haftada başa döner', () => {
  assert.equal(haftaProgrami(haftaKaydir(ilk, 8))['6-3'], 'Raşit'); // 9. hafta: Pazar 21–24
  assert.equal(haftaProgrami(haftaKaydir(ilk, 9))['4-1'], 'Raşit'); // 10. hafta: Cuma 15–18
});

test('hafta içi akşamlar 3 haftada, hafta sonu öğlen 3 haftada döner', () => {
  const a = haftaProgrami(ilk);
  const b = haftaProgrami(haftaKaydir(ilk, 3));
  for (const k of ['0-1', '1-2', '2-3', '3-1', '4-0', '5-0', '6-0']) assert.equal(a[k], b[k]);
});

test('her hafta her sahip kadar slot korunur', () => {
  for (let k = -5; k < 20; k++) {
    const p = haftaProgrami(haftaKaydir(ilk, k));
    const say = {};
    Object.values(p).forEach((ad) => { say[ad] = (say[ad] || 0) + 1; });
    assert.equal(Object.values(say).reduce((a, b) => a + b, 0), 28);
  }
});

test('zaman: İstanbul haftası ve şu anki slot', () => {
  // 28 Ekim 2026 Çarşamba 20:16 İstanbul = 17:16 UTC
  const ms = Date.UTC(2026, 9, 28, 17, 16);
  const s = istanbulSimdi(ms);
  assert.equal(s.haftaId, ilk);
  assert.equal(s.gun, 2);
  assert.deepEqual(suankiSlot(ms), { haftaId: ilk, gun: 2, saat: 2 });
  assert.deepEqual(sonrakiSlot(ms), { haftaId: ilk, gun: 2, saat: 3 });
  // Pazar 23:30 → sonraki slot gelecek haftanın Pazartesi 12:00
  const pazar = Date.UTC(2026, 10, 1, 20, 30);
  assert.deepEqual(sonrakiSlot(pazar), { haftaId: '2026-11-02', gun: 0, saat: 0 });
  // Pazartesi 00:30 İstanbul hâlâ yeni haftadır
  assert.equal(istanbulSimdi(Date.UTC(2026, 10, 1, 21, 30)).haftaId, '2026-11-02');
  // Slot zamanı: Çarşamba 18:00 İstanbul = 15:00 UTC
  assert.equal(slotZamani(ilk, 2, 2).bas, Date.UTC(2026, 9, 28, 15, 0));
});

test('hafta başlığı ve fark', () => {
  assert.equal(haftaBasligi(ilk), '26 Eki – 1 Kas');
  assert.equal(haftaFarki('2026-11-09'), 2);
  assert.equal(haftaKaydir('2026-12-28', 1), '2027-01-04');
});
