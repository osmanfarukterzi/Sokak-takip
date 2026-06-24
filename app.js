document.addEventListener("DOMContentLoaded", () => {
    HavaDurumuGetir();
    PanoyuYukle();
    SaatIskeletiniCiz();
});

async function HavaDurumuGetir() {
    const dereceEl = document.getElementById("havadurumu-derece");
    const ozetEl = document.getElementById("havadurumu-ozet");
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        const data = await response.json();
        if (data && data.current_weather) {
            const sicaklik = Math.round(data.current_weather.temperature);
            const durumKodu = data.current_weather.weathercode;
            let durumMetni = "Açık";
            if (durumKodu >= 1 && durumKodu <= 3) durumMetni = "Parçalı Bulutlu";
            else if (durumKodu >= 51 && durumKodu <= 67) durumMetni = "Yağmurlu";
            dereceEl.innerText = `Beşiktaş: ${sicaklik}°C`;
            ozetEl.innerText = durumMetni;
        }
    } catch (e) {
        dereceEl.innerText = "Beşiktaş";
        ozetEl.innerText = "Hava Açık";
    }
}

function SaatIskeletiniCiz() {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    
    // Şablon boş isimlerle duruyor, birazdan seninle burayı dolduracağız!
    const taslakVeri = {
        "Pazartesi": { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Salı":      { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Çarşamba":  { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Perşembe":  { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Cuma":      { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Cumartesi": { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." },
        "Pazar":     { "12.00-15.00": "Bekliyor...", "15.00-18.00": "Bekliyor...", "18.00-21.00": "Bekliyor...", "21.00-24.00": "Bekliyor..." }
    };

    programAkisi.innerHTML = "";

    gunler.forEach(gun => {
        let slotlarHtml = "";
        const saatler = ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"];

        saatler.forEach(saat => {
            const isim = taslakVeri[gun][saat];
            const isSabitSlot = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12.00-15.00";
            
            let kartStili = "";
            let etiketHtml = "";
            
            if (isSabitSlot) {
                // İSTEDİĞİN SABİT TURUNCU NEON KART
                kartStili = "bg-zinc-950 border-orange-500/40 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.08)]";
                etiketHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">🔒 SABİT SLOT</span>`;
            } else {
                // İSTEDİĞİN DÖNÜŞÜMLÜ YEŞİLİMSİ DETAYLI KART
                kartStili = "bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-emerald-500/20 transition-all";
                etiketHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Dönüşümlü</span>`;
            }

            slotlarHtml += `
                <div class="p-3 rounded-xl border ${kartStili} flex justify-between items-center gap-3 min-w-[245px]">
                    <div>
                        <span class="text-xs font-mono ${isSabitSlot ? 'text-orange-400' : 'text-emerald-400'} block font-bold mb-0.5">${saat}</span>
                        <span class="font-medium text-sm text-zinc-200">${isim}</span>
                    </div>
                    <div>
                        ${etiketHtml}
                    </div>
                </div>
            `;
        });

        // Gün başlıklarının kenar çizgilerini de turuncuya uyumlu yaptık
        programAkisi.innerHTML += `
            <div class="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 shadow-lg min-w-[295px] snap-start flex-shrink-0">
                <div class="border-b border-zinc-800 pb-2.5 mb-3 flex justify-between items-center">
                    <span class="font-bold text-base text-zinc-100 flex items-center gap-1.5">
                        <i class="fa-regular fa-calendar text-orange-500 text-sm"></i> ${gun}
                    </span>
                    <span class="text-[10px] text-zinc-500">Takvim</span>
                </div>
                <div class="space-y-2.5">
                    ${slotlarHtml}
                </div>
            </div>
        `;
    });
}

function PanoyuYukle() {
    const pano = document.getElementById("musaidlik-notlari");
    if (!pano) return;
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    if (notlar.length === 0) {
        pano.innerHTML = `<p class="text-zinc-600 text-center italic py-2">Henüz bildirim yok.</p>`;
        return;
    }
    pano.innerHTML = "";
    notlar.forEach((item, index) => {
        pano.innerHTML += `
            <div class="bg-zinc-950 p-2.5 rounded-lg border border-orange-950/40 text-xs relative group">
                <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                <p class="text-zinc-300 pr-4">${item.mesaj}</p>
                <button onclick="notSil(${index})" class="absolute top-1 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition text-[10px]">Sil</button>
            </div>
        `;
    });
}

function notEkle() {
    const isimEl = document.getElementById("not-yazan");
    const mesajEl = document.getElementById("not-icerik");
    if (!isimEl.value.trim() || !mesajEl.value.trim()) return;
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    notlar.unshift({ isim: isimEl.value.trim(), mesaj: mesajEl.value.trim() });
    localStorage.setItem("sokak_notlar", JSON.stringify(notlar));
    isimEl.value = ""; mesajEl.value = "";
    PanoyuYukle();
}

function notSil(index) {
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    notlar.splice(index, 1);
    localStorage.setItem("sokak_notlar", JSON.stringify(notlar));
    PanoyuYukle();
}
