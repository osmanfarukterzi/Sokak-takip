# Meydan

Beşiktaş Meydanı sokak müzisyenleri için haftalık slot takvimi, takas, devir ve sohbet sistemi.
Canlı adres: https://sokak-takip.vercel.app

## Nasıl çalışır

- **Derleme adımı yok.** Düz HTML, CSS ve JavaScript modülleri; Preact (htm) ve Firebase tarayıcıya CDN'den yüklenir. Vercel dosyaları olduğu gibi yayınlar.
- **Veritabanı:** Firebase Realtime Database (`besiktas-meydan-takip`).
- **Giriş:** Google ile. Sadece `uyeler` listesindeki hesaplar girebilir; listede olmayanlar katılım talebi gönderir, admin onaylar.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `js/rotasyon.js` | Dönüş motoru: haftanın programını başlangıç haftasından hesaplar. Zaman yardımcıları. |
| `js/islemler.js` | Devir, alım (kurallarla), takas, "Çıktım", sohbet, admin işlemleri |
| `js/takvim.js` | Takvim, "şu an meydanda" kartı, slot penceresi, haftalık tablo |
| `js/takas.js` | Takas paneli ve sohbet |
| `js/admin.js` | Admin paneli |
| `js/app.js` | Giriş akışı ve ana ekran |
| `scripts/kurallar.mjs` | Firebase güvenlik kurallarını üretir → `database.rules.json` |

## Dönüş kuralları

Başlangıç haftası 26 Ekim 2026'dır (`ANA_KADRO`). Her hafta:

1. Hafta içi öğlen (Pzt–Prş 12–15) sabittir.
2. Hafta içi akşamları her gün kendi içinde döner (21–24 → 15–18, diğerleri bir aşağı).
3. Hafta sonu öğlenleri Cuma → Cumartesi → Pazar → Cuma döner.
4. Hafta sonu akşamlarının 9 slotu tek sıra halinde ilerler (9 haftalık döngü).

Takaslar ve devirler sadece o haftayı etkiler; asıl kadro değişmez.

## Komutlar

```sh
node --test test/*.test.mjs      # dönüş motoru testleri
node scripts/kurallar.mjs        # güvenlik kurallarını yeniden üret
```

`database.rules.json` değişince içeriği Firebase konsolu → Realtime Database → Kurallar sekmesine yapıştırılıp yayınlanmalıdır.

## Önizleme

Canlı site dışındaki adreslerde (Vercel deneme adresleri) sonuna `?onizleme` eklenince site girişsiz açılır ve veritabanına hiçbir şey yazmaz. Canlı adreste bu mod çalışmaz.
