document.addEventListener("DOMContentLoaded", () => {
    ProgramiCiz();
    PanoyuYukle();
    MuzisyenleriListele();
    setTimeout(HavaDurumuGetir, 500);
    
    // Google Giriş Kütüphanesini Başlat
    if(typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "1036841261320-v8v2r1p8661p86kcbmbcbmbcbmbcbmbc.apps.googleusercontent.com", // Geçici genel test ID'si
            callback: handleCredentialResponse
        });
    }
});

// Google Giriş Butonuna Basılınca Çalışacak Fonksiyon
function googleGirisYap() {
    if(typeof google !== 'undefined') {
        google.accounts.id.prompt();
    } else {
        alert("Google servisi yükleniyor, lütfen 2 saniye sonra tekrar deneyin.");
    }
}

// Giriş Başarılı Olunca Tetiklenen Fonksiyon
function handleCredentialResponse(response) {
    // Google'dan gelen şifreli veriyi çözüyoruz
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const user = JSON.parse(jsonPayload);
    
    // Kullanıcıyı tarayıcı listesine ekle
    let uyeler = JSON.parse(localStorage.getItem("sokak_uyeler")) || [];
    if (!uyeler.some(u => u.email === user.email)) {
        uyeler.push({
            name: user.name,
            email: user.email,
            picture: user.picture
        });
        localStorage.setItem("sokak_uyeler", JSON.stringify(uyeler));
    }
    
    // Giriş butonunu profil fotoğrafı yap
    const btnContainer = document.getElementById("google-btn-container");
    if(btnContainer) {
        btnContainer.innerHTML = `
            <div class="flex items-center gap-2 bg-slate-950 py-1.5 px-3 rounded-xl border border-emerald-500/30">
                <img src="${user.picture}" class="w-6 h-6 rounded-full border border-emerald-500">
                <span class="text-xs font-bold text-emerald-400">${user.given_name} İçeride</span>
            </div>
        `;
    }
    
    MuzisyenleriListele();
}

function MuzisyenleriListele() {
    const listeAlani = document.getElementById("muzisyen-listesi-alan");
    const sayac = document.getElementById("aktif-uye-sayisi");
    if(!listeAlani) return;
    
    let uyeler = JSON.parse(localStorage.getItem("sokak_uyeler")) || [];
    
    if(uyeler.length === 0) {
        listeAlani.innerHTML = `<p class="text-slate-600 italic text-center py-2">Henüz kimse giriş yapmadı.</p>`;
        if(sayac) sayac.innerText = "0 Aktif";
        return;
    }
    
    if(sayac) sayac.innerText = `${uyeler.length} Aktif`;
    listeAlani.innerHTML = "";
    
    uyeler.forEach(u => {
        listeAlani.innerHTML += `
            <div class="flex items-center gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                <img src="${u.picture || 'https://www.google.com/favicon.ico'}" class="w-6 h-6 rounded-full">
                <div>
                    <p class="font-bold text-slate-200">${u.name}</p>
                </div>
            </div>
        `;
    });
}

// HAVA DURUMU, TAKVİM VE PANO KODLARI AYNEN KORUNDU
async function HavaDurumuGetir() {
    const dereceEl = document.getElementById("havadurumu-derece");
    const ozetEl = document.getElementById("havadurumu-ozet");
    if (!dereceEl || !ozetEl) return;
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (response.ok) {
            const data = await response.json();
            if (data && data.current_weather) {
                const sicaklik = Math.round(data.current_weather.temperature);
                dereceEl.innerText = `Beşiktaş: ${sicaklik}°C`;
                ozetEl.innerText = data.current_weather.weathercode >= 1 && data.current_weather.weathercode <= 3 ? "Parçalı Bulutlu" : "Hava Açık";
            }
        }
    } catch (e) { console.log("Hava durumu yedekte."); }
}

function ProgramiCiz() {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const gercekVeri = {
        "Pazartesi": { "12.00-15.00": "Nebi", "15.00-18.00": "Sirayet", "18.00-21.00": "Berkan", "21.00-24.00": "Uğur" },
        "Salı":      { "12.00-15.00": "Doğa", "15.00-18.00": "Raşit", "18.00-21.00": "Samet", "21.00-24.00": "İsmet" },
        "Çarşamba":  { "12.00-15.00": "Uğur", "15.00-18.00": "Berkan", "18.00-21.00": "Nebi", "21.00-24.00": "Samet" },
        "Perşembe":  { "12.00-15.00": "Mami", "15.00-18.00": "İsmet", "18.00-21.00": "Raşit", "21.00-24.00": "Sirayet" },
        "Cuma":      { "12.00-15.00": "Doğa", "15.00-18.00": "Nebi", "18.00-21.00": "Raşit", "21.00-24.00": "İsmet" },
        "Cumartesi": { "12.00-15.00": "Mami", "15.00-18.00": "Berkan", "18.00-21.00": "Uğur", "21.00-24.00": "Sirayet" },
        "Pazar":     { "12.00-15.00": "Yiğit", "15.00-18.00": "Faruk", "18.00-21.00": "Samet", "21.00-24.00": "Enes" }
    };
    programAkisi.innerHTML = "";
    gunler.forEach(gun => {
        let slotlarHtml = "";
        const saatler = ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"];
        saatler.forEach(saat => {
            const isim = gercekVeri[gun][saat];
            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12.00-15.00";
            const isHaftaSonuYanalDongu = ["Cuma", "Cumartesi", "Pazar"].includes(gun) && saat === "12.00-15.00";
            let kartStili = "", etiketHtml = "", saatRengi = "text-emerald-400";
            if (isHaftaIciSabit) {
                kartStili = "bg-slate-950 border-orange-500/40 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.1)]";
                etiketHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">🔒 SABİT SLOT</span>`;
                saatRengi = "text-orange-400";
            } else if (isHaftaSonuYanalDongu) {
                kartStili = "bg-slate-950 border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.1)]";
                etiketHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">🔄 GÜN DÖNGÜSÜ</span>`;
                saatRengi = "text-cyan-400";
            } else {
                kartStili = "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/25 transition-all";
                etiketHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">⏳ SAAT DÖNGÜSÜ</span>`;
                saatRengi = "text-emerald-400";
            }
            slotlarHtml += `<div class="p-3 rounded-xl border ${kartStili} flex justify-between items-center gap-3 min-w-[245px]"><div><span class="text-xs font-mono ${saatRengi} block font-bold mb-0.5">${saat}</span><span class="font-bold text-sm text-slate-100">${isim}</span></div><div>${etiketHtml}</div></div>`;
        });
        programAkisi.innerHTML += `<div class="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-lg min-w-[295px] snap-start flex-shrink-0"><div class="border-b border-slate-800 pb-2.5 mb-3 flex justify-between items-center"><span class="font-bold text-base text-slate-100 flex items-center gap-1.5"><i class="fa-regular fa-calendar text-orange-500 text-sm"></i> ${gun}</span><span class="text-[10px] text-slate-500">Takvim</span></div><div class="space-y-2.5">${slotlarHtml}</div></div>`;
    });
}

function PanoyuYukle() {
    const pano = document.getElementById("musaidlik-notlari");
    if (!pano) return;
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    if (notlar.length === 0) {
        pano.innerHTML = `<p class="text-slate-600 text-center italic py-2">Henüz bildirim yok.</p>`;
        return;
    }
    pano.innerHTML = "";
    notlar.forEach((item, index) => {
        pano.innerHTML += `<div class="bg-slate-950 p-2.5 rounded-lg border border-orange-950/40 text-xs relative group"><span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span><p class="text-slate-300 pr-4">${item.mesaj}</p><button onclick="notSil(${index})" class="absolute top-1 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition text-[10px]">Sil</button></div>`;
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
    ProgramiCiz(); PanoyuYukle();
}

function notSil(index) {
    const notlar = JSON.parse(localStorage.getItem("sokak_notlar")) || [];
    notlar.splice(index, 1);
    localStorage.setItem("sokak_notlar", JSON.stringify(notlar));
    PanoyuYukle();
}
