// SENİN GERÇEK FIREBASE BAĞLANTI AYARLARIN
const firebaseConfig = {
    apiKey: "AIzaSyCOAmbaMQw6YLxXFPlFKgk1AJGHx-1BBrs",
    authDomain: "besiktas-meydan-takip.firebaseapp.com",
    databaseURL: "https://besiktas-meydan-takip-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "besiktas-meydan-takip",
    storageBucket: "besiktas-meydan-takip.firebasestorage.app",
    messagingSenderId: "114446148281",
    appId: "1:114446148281:web:b4bd9a18c77a762cde3168"
};

// Sistem Başlatma
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    TarihiOtomatikGuncelle(); // Başlığı otomatik hesaplayan yeni motor
    ProgramiCiz();
    CanliVerileriDinle();
    setTimeout(HavaDurumuGetir, 500);

    // Oturum durumunu dinle
    auth.onAuthStateChanged(user => {
        const authArea = document.getElementById("auth-status-area");
        const notYazanInput = document.getElementById("not-yazan");
        
        if (user) {
            currentUser = user;
            if(notYazanInput) notYazanInput.value = user.displayName;
            if(authArea) {
                authArea.innerHTML = `
                    <div class="flex items-center gap-2 bg-slate-950 py-1.5 px-3 rounded-xl border border-emerald-500/30">
                        <img src="${user.photoURL}" class="w-6 h-6 rounded-full border border-emerald-500" referrerpolicy="no-referrer">
                        <span class="text-xs font-bold text-emerald-400">${user.displayName.split(' ')[0]} Sahnede</span>
                        <button onclick="cikisYap()" class="text-[10px] text-rose-400 ml-2 hover:underline cursor-pointer">Çıkış</button>
                    </div>
                `;
            }
            db.ref("muzisyenler/" + user.uid).set({
                name: user.displayName,
                picture: user.photoURL,
                email: user.email
            });
        } else {
            currentUser = null;
            if(notYazanInput) notYazanInput.value = "";
            if(authArea) {
                authArea.innerHTML = `
                    <button onclick="googleGirisYap()" class="bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer">
                        <img src="https://www.google.com/favicon.ico" class="w-4 h-4" alt="Google">
                        Google ile Giriş Yap
                    </button>
                `;
            }
        }
    });
});

// OTOMATİK TARİH ARALIĞI HESAPLAMA MOTORU
function TarihiOtomatikGuncelle() {
    const baslikEl = document.getElementById("dinamik-tarih-basligi");
    if (!baslikEl) return;

    const simdi = new Date();
    const gunMesafe = simdi.getDay() === 0 ? 6 : simdi.getDay() - 1; // Pazartesiye olan uzaklık
    
    // Haftanın Pazartesi gününü bul
    const pazartesi = new Date(simdi);
    pazartesi.setDate(simdi.getDate() - gunMesafe);
    
    // Haftanın Pazar gününü bul
    const pazar = new Date(pazartesi);
    pazar.setDate(pazartesi.getDate() + 6);

    const aylar = [
        "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", 
        "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
    ];

    const pztGun = pazartesi.getDate();
    const pztAy = aylar[pazartesi.getMonth()];
    
    const pzrGun = pazar.getDate();
    const pzrAy = aylar[pazar.getMonth()];

    // Başlığı dinamik olarak yazdır (Örn: 29 HAZİRAN - 5 TEMMUZ)
    baslikEl.innerText = `${pztGun} ${pztAy} - ${pzrGun} ${pzrAy} SLOT TAKVİMİ`;
}

// Google Pop-up Giriş Fonksiyonu
function googleGirisYap() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        alert("Giriş izni hatası! Hata: " + error.message);
    });
}

function cikisYap() {
    auth.signOut();
}

// BULUTTAN ANLIK VERİ AKIŞI (CHAT VE ÜYELER)
function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return;
        pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) {
            pano.innerHTML = `<p class="text-slate-600 text-center italic py-2">Henüz bildirim yok.</p>`;
            return;
        }
        Object.keys(veriler).reverse().forEach(key => {
            const item = veriler[key];
            const isMyNote = currentUser && currentUser.uid === item.uid;
            pano.innerHTML += `
                <div class="bg-slate-950 p-2.5 rounded-lg border border-orange-950/40 text-xs relative group">
                    <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 pr-4">${item.mesaj}</p>
                    ${isMyNote ? `<button onclick="notSil('${key}')" class="absolute top-1 right-2 text-rose-500 text-[10px] hover:underline cursor-pointer">Sil</button>` : ""}
                </div>
            `;
        });
    });

    db.ref("muzisyenler").on("value", snapshot => {
        const listeAlani = document.getElementById("muzisyen-listesi-alan");
        const sayac = document.getElementById("aktif-uye-sayisi");
        if (!listeAlani) return;
        listeAlani.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) {
            listeAlani.innerHTML = `<p class="text-slate-600 italic text-center py-2">Henüz kimse yok.</p>`;
            if (sayac) sayac.innerText = "0 Aktif";
            return;
        }
        const keys = Object.keys(veriler);
        if (sayac) sayac.innerText = `${keys.length} Aktif`;
        keys.forEach(key => {
            const u = veriler[key];
            listeAlani.innerHTML += `
                <div class="flex items-center gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                    <img src="${u.picture}" class="w-6 h-6 rounded-full" referrerpolicy="no-referrer">
                    <span class="font-bold text-slate-200">${u.name}</span>
                </div>
            `;
        });
    });
}

function notEkle() {
    if (!currentUser) {
        alert("Pano'ya yazabilmek için önce yukarıdan Google ile Giriş Yapmalısın!");
        return;
    }
    const mesajEl = document.getElementById("not-icerik");
    if (!mesajEl.value.trim()) return;
    
    db.ref("notlar").push({
        uid: currentUser.uid,
        isim: currentUser.displayName,
        mesaj: mesajEl.value.trim()
    });
    mesajEl.value = "";
}

function notSil(key) {
    db.ref("notlar").child(key).remove();
}

// PROGRAM ÇİZİMİ
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
                etikeHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">🔒 SABİT SLOT</span>`;
                saatRengi = "text-orange-400";
            } else if (isHaftaSonuYanalDongu) {
                kartStili = "bg-slate-950 border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.1)]";
                etikeHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">🔄 GÜN DÖNGÜSÜ</span>`;
                saatRengi = "text-cyan-400";
            } else {
                kartStili = "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-emerald-500/25 transition-all";
                etikeHtml = `<span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">⏳ SAAT DÖNGÜSÜ</span>`;
                saatRengi = "text-emerald-400";
            }

            slotlarHtml += `<div class="p-3 rounded-xl border ${kartStili} flex justify-between items-center gap-3 min-w-[245px]"><div><span class="text-xs font-mono ${saatRengi} block font-bold mb-0.5">${saat}</span><span class="font-bold text-sm text-slate-100">${isim}</span></div><div>${etikeHtml}</div></div>`;
        });

        programAkisi.innerHTML += `<div class="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-lg min-w-[295px] snap-start flex-shrink-0"><div class="border-b border-slate-800 pb-2.5 mb-3 flex justify-between items-center"><span class="font-bold text-base text-slate-100 flex items-center gap-1.5"><i class="fa-regular fa-calendar text-orange-500 text-sm"></i> ${gun}</span><span class="text-[10px] text-slate-500">Takvim</span></div><div class="space-y-2.5">${slotlarHtml}</div></div>`;
    });
}

async function HavaDurumuGetir() {
    const dereceEl = document.getElementById("havadurumu-derece");
    const ozetEl = document.getElementById("havadurumu-ozet");
    if (!dereceEl || !ozetEl) return;
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (response.ok) {
            const data = await response.json();
            if (data && data.current_weather) {
                dereceEl.innerText = `Beşiktaş: ${Math.round(data.current_weather.temperature)}°C`;
                ozetEl.innerText = data.current_weather.weathercode >= 1 && data.current_weather.weathercode <= 3 ? "Parçalı Bulutlu" : "Hava Açık";
            }
        }
    } catch (e) { console.log("Hava durumu yedekte."); }
}
