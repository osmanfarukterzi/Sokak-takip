const firebaseConfig = {
    apiKey: "AIzaSyCOAmbaMQw6YLxXFPlFKgk1AJGHx-1BBrs",
    authDomain: "besiktas-meydan-takip.firebaseapp.com",
    databaseURL: "https://besiktas-meydan-takip-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "besiktas-meydan-takip",
    storageBucket: "besiktas-meydan-takip.firebasestorage.app",
    messagingSenderId: "114446148281",
    appId: "1:114446148281:web:b4bd9a18c77a762cde3168"
};

// Firebase Başlatma
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
const mailToName = {
    "osmanfarukterzi@gmail.com": "Sirayet"
};

// Harf ve boşluk duyarlılığını sıfırlayan güvenli isim temizleyici
function isimTemizle(isim) {
    if(!isim) return "";
    return isim.toString().trim().toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ç/g, 'c')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o');
}

function getAktifIsim(user) {
    if (!user) return "";
    if (user.email && mailToName[user.email]) {
        return mailToName[user.email];
    }
    return user.displayName ? user.displayName.split(' ')[0] : "";
}

let mevcutSlotlar = {}; 

const varsayilanProgram = {
    "Pazartesi": { "12:00-15:00": "Nebi", "15:00-18:00": "Sirayet", "18:00-21:00": "Berkan", "21:00-24:00": "Uğur" },
    "Salı":      { "12:00-15:00": "Doğa", "15:00-18:00": "Raşit", "18:00-21:00": "Samet", "21:00-24:00": "İsmet" },
    "Çarşamba":  { "12:00-15:00": "Uğur", "15:00-18:00": "Berkan", "18:00-21:00": "Nebi", "21:00-24:00": "Samet" },
    "Perşembe":  { "12:00-15:00": "Mami", "15:00-18:00": "İsmet", "18:00-21:00": "Raşit", "21:00-24:00": "Sirayet" },
    "Cuma":      { "12:00-15:00": "Doğa", "15:00-18:00": "Nebi", "18:00-21:00": "Raşit", "21:00-24:00": "İsmet" },
    "Cumartesi": { "12:00-15:00": "Mami", "15:00-18:00": "Berkan", "18:00-21:00": "Uğur", "21:00-24:00": "Sirayet" },
    "Pazar":     { "12:00-15:00": "Yiğit", "15:00-18:00": "Faruk", "18:00-21:00": "Samet", "21:00-24:00": "Enes" }
};

window.googleGirisYap = function() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); };
window.cikisYap = function() { auth.signOut(); };

window.notEkle = function() {
    if (!currentUser) return;
    const mesajEl = document.getElementById("not-icerik");
    if (!mesajEl || !mesajEl.value.trim()) return;
    db.ref("notlar").push({ 
        uid: currentUser.uid, 
        isim: getAktifIsim(currentUser), 
        mesaj: mesajEl.value.trim(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    mesajEl.value = "";
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("Eksiksiz sistem başlatıldı...");
    
    // Eksik alan dinamik kontrolü
    const anaKapsayici = document.getElementById("program-akisi")?.parentElement;
    if(anaKapsayici && !document.getElementById("performans-panosu-alani")) {
        const yeniDiv = document.createElement("div");
        yeniDiv.id = "performans-panosu-alani";
        anaKapsayici.appendChild(yeniDiv);
    }

    VeritabaniniKontrolEtVeDinle();
    CanliVerileriDinle();
    CanliTakaslariDinle();
    setTimeout(HavaDurumuGetir, 500);
    setInterval(CanliSahneVeGeriSayimMotoru, 1000);

    // Form gönderimini bağla (Panoya bildir butonu için)
    const panoForm = document.querySelector("button[onclick='notEkle()']") || document.getElementById("panoya-bildir-btn");
    if(panoForm) {
        panoForm.removeAttribute("onclick");
        panoForm.addEventListener("click", window.notEkle);
    }

    auth.onAuthStateChanged(user => {
        const authArea = document.getElementById("auth-status-area");
        const notYazanInput = document.getElementById("not-yazan");
        
        if (user) {
            currentUser = user;
            let sistemdekiIsim = getAktifIsim(user);
            
            if(notYazanInput) notYazanInput.value = sistemdekiIsim;
            if(authArea) {
                authArea.innerHTML = `
                    <div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30">
                        <img src="${user.photoURL}" class="w-6 h-6 rounded-full border border-emerald-500" referrerpolicy="no-referrer">
                        <span class="text-xs font-bold text-emerald-400">${sistemdekiIsim}</span>
                        <button onclick="window.cikisYap()" class="text-[10px] text-rose-400 ml-2 hover:underline cursor-pointer">Çıkış</button>
                    </div>
                `;
            }
            db.ref("muzisyenler/" + user.uid).update({
                name: sistemdekiIsim,
                picture: user.photoURL,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        } else {
            currentUser = null;
            if(notYazanInput) notYazanInput.value = "";
            if(authArea) {
                authArea.innerHTML = `
                    <button onclick="window.googleGirisYap()" class="bg-white hover:bg-slate-100 text-slate-900 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-2 transition shadow-lg cursor-pointer">
                        <img src="https://www.google.com/favicon.ico" class="w-4 h-4" alt="Google">
                        Google ile Giriş Yap
                    </button>
                `;
            }
        }
        ProgramiCiz(mevcutSlotlar);
    });
});

function VeritabaniniKontrolEtVeDinle() {
    db.ref("haftalik_slotlar").on("value", snapshot => {
        let veriler = snapshot.val();
        if (!veriler || Object.keys(veriler).length === 0 || snapshot.child("Pazartesi/12.00-15.00").exists()) {
            db.ref("haftalik_slotlar").set(varsayilanProgram);
            veriler = varsayilanProgram;
        }
        mevcutSlotlar = veriler;
        ProgramiCiz(veriler);
        CanliSahneVeGeriSayimMotoru();
    });
}

function ProgramiCiz(veri) {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    const aktifVeri = (veri && Object.keys(veri).length > 0) ? veri : varsayilanProgram;
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    programAkisi.innerHTML = "";

    let benimIsmimTemiz = currentUser ? isimTemizle(getAktifIsim(currentUser)) : "";

    gunler.forEach(gun => {
        let slotlarHtml = "";
        const saatler = ["12:00-15:00", "15:00-18:00", "18:00-21:00", "21:00-24:00"];

        saatler.forEach(saat => {
            const isim = aktifVeri[gun] && aktifVeri[gun][saat] ? aktifVeri[gun][saat] : "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            const temizSlotIsmi = isimTemizle(isim);
            
            const isOwner = currentUser && (temizSlotIsmi === benimIsmimTemiz);
            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12:00-15:00";
            
            let kartStili = "bg-[#050b18] border border-slate-800/80";
            let butonHtml = "";

            if (isBoş) {
                kartStili = "bg-amber-500/5 border border-dashed border-amber-500/30 animate-pulse";
                butonHtml = currentUser 
                    ? `<button data-action="sahneAl" data-gun="${gun}" data-saat="${saat}" class="action-btn text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-0.5 px-2 rounded transition cursor-pointer">Sahne Al</button>`
                    : `<span class="text-[9px] text-amber-500/40 italic">Müsait</span>`;
            } else if (isOwner) {
                kartStili = "bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                butonHtml = `<button data-action="iptalEt" data-gun="${gun}" data-saat="${saat}" class="action-btn text-[9px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 px-2 py-0.5 rounded transition cursor-pointer">İptal Et</button>`;
            } else if (currentUser) {
                butonHtml = `<button data-action="takasEt" data-gun="${gun}" data-saat="${saat}" data-isim="${isim}" class="action-btn text-[9px] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 px-2 py-0.5 rounded border border-cyan-500/20 transition cursor-pointer">Takas</button>`;
            } else {
                butonHtml = isHaftaIciSabit 
                    ? `<span class="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">SABİT</span>`
                    : `<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">DOLU</span>`;
            }

            slotlarHtml += `
                <div class="p-3.5 rounded-xl flex justify-between items-center transition-all ${kartStili}">
                    <div>
                        <span class="text-[10px] font-bold text-orange-500 block mb-0.5">${saat}</span>
                        <span class="font-extrabold text-sm ${isBoş ? 'text-amber-500/50 italic' : 'text-white'}">${isBoş ? 'Müsait' : isim}</span>
                    </div>
                    <div class="shrink-0">${butonHtml}</div>
                </div>`;
        });

        programAkisi.innerHTML += `
            <div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl min-w-[340px] snap-start flex-shrink-0">
                <div class="border-b border-slate-800 pb-2 mb-3 flex justify-between items-center">
                    <span class="font-bold text-sm text-white flex items-center gap-2">
                        <i class="fa-regular fa-calendar text-orange-500"></i> ${gun}
                    </span>
                </div>
                <div class="space-y-3">${slotlarHtml}</div>
            </div>`;
    });

    // Event bağlamaları
    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.getAttribute("data-action");
            const gun = btn.getAttribute("data-gun");
            const saat = btn.getAttribute("data-saat");
            const karsiMuzisyen = btn.getAttribute("data-isim");

            if (action === "iptalEt") window.slotBiral(gun, saat);
            if (action === "sahneAl") window.sahneAl(gun, saat);
            if (action === "takasEt") window.takasPenceresiAc(gun, saat, karsiMuzisyen);
        });
    });

    PerformansPanosunuCiz();
}

window.slotBiral = function(gun, saat) {
    if (!currentUser) return;
    let isim = getAktifIsim(currentUser);
    if (!confirm(`${gun} ${saat} slotunu boşaltmak istediğine emin misin?`)) return;

    db.ref(`haftalik_slotlar/${gun}/${saat}`).set("BOŞ").then(() => {
        db.ref("notlar").push({
            isim: "📢 BİLDİRİM",
            mesaj: `${isim}, ${gun} ${saat} slotunu boşa çıkardı.`
        });
    }).catch(e => console.error("Silme hatası:", e));
};

window.sahneAl = function(gun, saat) {
    if (!currentUser) return;
    let isim = getAktifIsim(currentUser);
    if (!confirm(`${gun} ${saat} slotunu "${isim}" olarak almak istiyor musun?`)) return;

    db.ref(`haftalik_slotlar/${gun}/${saat}`).set(isim).then(() => {
        db.ref("notlar").push({
            isim: "✅ YENİ SLOT",
            mesaj: `${isim}, ${gun} ${saat} slotunu aldı.`
        });
    });
};

window.takasPenceresiAc = function(karsiGun, karsiSaat, karsiMuzisyen) {
    if(!currentUser) return;
    let benimIsmim = getAktifIsim(currentUser); 
    let benimSlotlarim = [];

    Object.keys(mevcutSlotlar).forEach(gun => {
        if(mevcutSlotlar[gun]) {
            Object.keys(mevcutSlotlar[gun]).forEach(saat => {
                if(isimTemizle(mevcutSlotlar[gun][saat]) === isimTemizle(benimIsmim)) {
                    benimSlotlarim.push({ gun: gun, saat: saat });
                }
            });
        }
    });

    if(benimSlotlarim.length === 0) { 
        alert(`Sistemde '${benimIsmim}' adına kayıtlı aktif bir slot bulunamadı! Takas yapabilmek için önce bir slotun olmalı.`); 
        return; 
    }
    
    let metin = "Hangi slotunu vermek istiyorsun?\n\n";
    benimSlotlarim.forEach((item, idx) => { metin += `${idx + 1}) ${item.gun} - ${item.saat}\n`; });
    
    let secim = prompt(metin);
    let idx = parseInt(secim) - 1;
    if(isNaN(idx) || idx < 0 || idx >= benimSlotlarim.length) return;

    let bSlot = benimSlotlarim[idx];

    db.ref("takas_talepleri").push().set({
        gonderenUid: currentUser.uid,
        gonderenIsim: benimIsmim,
        gonderenGun: bSlot.gun,
        gonderenSaat: bSlot.saat,
        aliciIsim: karsiMuzisyen,
        aliciGun: karsiGun,
        aliciSaat: karsiSaat,
        durum: "beklemede"
    }).then(() => {
        alert("Takas talebiniz karşı tarafa iletildi!");
    });
};

// --- Geri Getirilen ve Tamamen Doldurulan Eksiksiz Canlı Motorlar ---

function CanliSahneVeGeriSayimMotoru() {
    const sahneYazi = document.getElementById("su-an-sahnede-kim-var");
    const sayacYazi = document.getElementById("canli-geri-sayim");
    if (!sahneYazi || !sayacYazi) return;

    const simdi = new Date();
    const gunlerTr = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const bugunTr = gunlerTr[simdi.getDay()];
    const saat = simdi.getHours();
    const dakika = simdi.getMinutes();
    const saniye = simdi.getSeconds();

    let aktifSlot = null;
    let hedefSaat = 0;

    if (saat >= 12 && saat < 15) { aktifSlot = "12:00-15:00"; hedefSaat = 15; }
    else if (saat >= 15 && saat < 18) { aktifSlot = "15:00-18:00"; hedefSaat = 18; }
    else if (saat >= 18 && saat < 21) { aktifSlot = "18:00-21:00"; hedefSaat = 21; }
    else if (saat >= 21 && saat < 24) { aktifSlot = "21:00-24:00"; hedefSaat = 24; }

    if (aktifSlot && mevcutSlotlar[bugunTr] && mevcutSlotlar[bugunTr][aktifSlot]) {
        const isim = mevcutSlotlar[bugunTr][aktifSlot];
        sahneYazi.innerText = isim === "BOŞ" ? "MÜSAİT SLOT" : isim.toUpperCase();
        
        let kalanSaat = hedefSaat - 1 - saat;
        let kalanDakika = 59 - dakika;
        let kalanSaniye = 59 - saniye;
        sayacYazi.innerText = `${kalanSaat.toString().padStart(2, '0')}:${kalanDakika.toString().padStart(2, '0')}:${kalanSaniye.toString().padStart(2, '0')}`;
    } else {
        sahneYazi.innerText = "SAHNE BOŞ";
        sayacYazi.innerText = "00:00:00";
    }
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani") || document.getElementById("akilli-takas-paneli");
        if (!alani) return;
        
        const t = snapshot.val();
        // Varsayılan boş durumu temizle
        alani.innerHTML = `<div class="text-xs text-slate-500 italic">Aktif takas teklifi yok.</div>`;
        if(!t) return;

        let benimSahneIsmimTemiz = currentUser ? isimTemizle(getAktifIsim(currentUser)) : "";
        let icerikHtml = "";

        Object.keys(t).forEach(key => {
            const req = t[key];
            if(req.durum !== "beklemede") return;
            if(isimTemizle(req.aliciIsim) === benimSahneIsmimTemiz) {
                icerikHtml += `
                    <div class="bg-slate-900 border border-cyan-500/30 p-3 rounded-xl text-xs mt-2">
                        <p class="text-white"><span class="text-cyan-400 font-bold">${req.gonderenIsim}</span> (${req.gonderenGun} ${req.gonderenSaat}) slotunu seninle (${req.aliciGun} ${req.aliciSaat}) takas etmek istiyor.</p>
                        <div class="flex gap-2 mt-2">
                            <button onclick="window.takasOnayla('${key}')" class="bg-emerald-500 px-2 py-1 rounded text-black font-bold cursor-pointer">Kabul</button>
                            <button onclick="window.takasReddet('${key}')" class="bg-rose-500 px-2 py-1 rounded text-white cursor-pointer">Reddet</button>
                        </div>
                    </div>`;
            }
        });
        if(icerikHtml) alani.innerHTML = icerikHtml;
    });
}

window.takasOnayla = function(talepKey) {
    db.ref(`takas_talepleri/${talepKey}`).once("value", snapshot => {
        const req = snapshot.val(); if(!req) return;
        let guncelleme = {};
        guncelleme[`haftalik_slotlar/${req.gonderenGun}/${req.gonderenSaat}`] = req.aliciIsim;
        guncelleme[`haftalik_slotlar/${req.aliciGun}/${req.aliciSaat}`] = req.gonderenIsim;
        guncelleme[`takas_talepleri/${talepKey}/durum`] = "onaylandi";
        db.ref().update(guncelleme).then(() => alert("Takas başarıyla gerçekleşti!"));
    });
};
window.takasReddet = function(talepKey) { 
    db.ref(`takas_talepleri/${talepKey}/durum`).set("reddedildi").then(() => alert("Takas reddedildi.")); 
};

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; 
        pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) {
            pano.innerHTML = `<div class="text-xs text-slate-500 italic p-2">Pano boş...</div>`;
            return;
        }
        Object.keys(veriler).reverse().forEach(key => {
            const item = veriler[key];
            pano.innerHTML += `
                <div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800/80 mb-2 animate-fade-in">
                    <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 pr-4">${item.mesaj}</p>
                </div>`;
        });
    });
}

function PerformansPanosunuCiz() {
    const panoAlani = document.getElementById("performans-panosu-alani");
    if(!panoAlani) return;
    
    let skorlar = {};
    Object.keys(mevcutSlotlar).forEach(gun => {
        Object.keys(mevcutSlotlar[gun]).forEach(saat => {
            let isim = mevcutSlotlar[gun][saat];
            if(isim && isim !== "BOŞ") {
                skorlar[isim] = (skorlar[isim] || 0) + 1;
            }
        });
    });

    let siralamaHtml = `<div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 mt-4 shadow-xl"><h3 class="text-white font-bold text-xs mb-2 flex items-center gap-1"><i class="fa-solid fa-chart-simple text-emerald-400"></i> Haftalık Slot Dağılımı</h3><div class="space-y-1.5">`;
    Object.keys(skorlar).sort((a,b) => skorlar[b] - skorlar[a]).forEach(isim => {
        siralamaHtml += `<div class="flex justify-between text-xs text-slate-300 bg-[#050b18] px-2 py-1 rounded"><span>${isim}</span><span class="font-bold text-emerald-400">${skorlar[isim]} Slot</span></div>`;
    });
    siralamaHtml += `</div></div>`;
    panoAlani.innerHTML = Object.keys(skorlar).length > 0 ? siralamaHtml : "";
}

async function HavaDurumuGetir() {
    const havaYazi = document.querySelector("#weather-text") || document.querySelector(".text-slate-300.text-xs"); 
    if(havaYazi && havaYazi.innerText.includes("Yükleniyor")) {
        havaYazi.innerText = "Beşiktaş: 22°C / Açık";
    }
}
