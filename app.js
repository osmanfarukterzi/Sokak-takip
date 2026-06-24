document.addEventListener("DOMContentLoaded", () => {
    console.log("Sokak Takip Canlı Sistemi Başlatıldı.");
    
    // 1. CANLI HAVA DURUMU MOTORU (Beşiktaş İçin Gerçek Zamanlı Çeker)
    HavaDurumuGetir();
    
    // 2. MÜSAİTLİK PANOSU BAŞLANGIÇ VERİLERİ (Tarayıcı hafızalı)
    PanoyuYukle();
});

// BEŞİKTAŞ CANLI HAVA DURUMU SİSİRBAZI
async function HavaDurumuGetir() {
    const dereceEl = document.getElementById("havadurumu-derece");
    const ozetEl = document.getElementById("havadurumu-ozet");
    
    try {
        // İstanbul Beşiktaş koordinatları ile ücretsiz hava durumu servisine bağlanıyoruz
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        const data = await response.json();
        
        if (data && data.current_weather) {
            const sicaklik = Math.round(data.current_weather.temperature);
            const durumKodu = data.current_weather.weathercode;
            
            // Hava durum koduna göre Türkçe açıklama
            let durumMetni = "Açık";
            if (durumKodu >= 1 && durumKodu <= 3) durumMetni = "Parçalı Bulutlu";
            else if (durumKodu >= 45 && durumKodu <= 48) durumMetni = "Sisli";
            else if (durumKodu >= 51 && durumKodu <= 67) durumMetni = "Yağmurlu";
            else if (durumKodu >= 71 && durumKodu <= 77) durumMetni = "Karlı";
            else if (durumKodu >= 80 && durumKodu <= 82) durumMetni = "Sağanak Yağış";
            
            dereceEl.innerText = `Beşiktaş: ${sicaklik}°C`;
            ozetEl.innerText = durumMetni;
        } else {
            dereceEl.innerText = "Beşiktaş";
            ozetEl.innerText = "Hava Açık";
        }
    } catch (error) {
        console.error("Hava durumu çekilemedi:", error);
        dereceEl.innerText = "Beşiktaş";
        ozetEl.innerText = "Hava Durumu Aktif";
    }
}

// MÜSAİTLİK PANOSU İŞLEMLERİ
function PanoyuYukle() {
    const pano = document.getElementById("musaidlik-notlari");
    if (!pano) return;
    
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    if (notlar.length === 0) {
        pano.innerHTML = `<p class="text-slate-500 text-center italic">Henüz bir bildirim yazılmamış.</p>`;
        return;
    }
    
    pano.innerHTML = "";
    notlar.forEach((item, index) => {
        pano.innerHTML += `
            <div class="bg-zinc-900 p-2.5 rounded-lg border border-purple-900/30 text-xs relative group">
                <span class="font-bold text-purple-400 block mb-0.5">${item.isim}:</span>
                <p class="text-slate-300 pr-4">${item.mesaj}</p>
                <button onclick="notSil(${index})" class="absolute top-1 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition text-[10px]">Sil</button>
            </div>
        `;
    });
}

function notEkle() {
    const isimEl = document.getElementById("not-yazan");
    const mesajEl = document.getElementById("not-icerik");
    
    if (!isimEl.value.trim() || !mesajEl.value.trim()) {
        alert("Lütfen isim ve mesaj alanını doldurun!");
        return;
    }
    
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    notlar.unshift({
        isim: isimEl.value.trim(),
        mesaj: mesajEl.value.trim()
    });
    
    localStorage.setItem("sokak_notlar", JSON.stringify(notlar));
    isimEl.value = "";
    mesajEl.value = "";
    PanoyuYukle();
}

function notSil(index) {
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    notlar.splice(index, 1);
    localStorage.setItem("sokak_notlar", JSON.stringify(notlar));
    PanoyuYukle();
}
