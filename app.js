const firebaseConfig = {
    apiKey: "AIzaSyCOAmbaMQw6YLxXFPlFKgk1AJGHx-1BBrs",
    authDomain: "besiktas-meydan-takip.firebaseapp.com",
    databaseURL: "https://besiktas-meydan-takip-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "besiktas-meydan-takip",
    storageBucket: "besiktas-meydan-takip.firebasestorage.app",
    messagingSenderId: "114446148281",
    appId: "1:114446148281:web:b4bd9a18c77a762cde3168"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
const mailToName = {
    "osmanfarukterzi@gmail.com": "Sirayet"
};

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
    if (user.email && mailToName[user.email]) return mailToName[user.email];
    if (user.displayName && user.displayName.toLowerCase().includes("osman faruk")) return "Sirayet";
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

document.addEventListener("DOMContentLoaded", () => {
    const anaKapsayici = document.getElementById("program-akisi")?.parentElement;
    if(anaKapsayici && !document.getElementById("performans-panosu-alani")) {
        const yeniDiv = document.createElement("div");
        yeniDiv.id = "performans-panosu-alani";
        anaKapsayici.appendChild(yeniDiv);
    }

    if (!document.getElementById("ozel-takas-modal")) {
        const modalDiv = document.createElement("div");
        modalDiv.id = "ozel-takas-modal";
        modalDiv.className = "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center hidden p-4";
        modalDiv.innerHTML = `
            <div class="bg-[#0b1329] border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
                <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 class="text-white font-black flex items-center gap-2 text-sm">
                        <i class="fa-solid fa-right-left text-cyan-400"></i> SAHNE TAKAS PENCERESİ
                    </h3>
                    <button onclick="document.getElementById('ozel-takas-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-xs">✕</button>
                </div>
                <p id="takas-modal-aciklama" class="text-xs text-slate-300 leading-relaxed"></p>
                <div class="space-y-2" id="takas-edilebilir-slotlar"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    VeritabaniniKontrolEtVeDinle();
    CanliVerileriDinle();
    CanliTakaslariDinle();
    setTimeout(HavaDurumuGetir, 500);
    setInterval(CanliSahneVeGeriSayimMotoru, 1000);

    window.googleGirisYap = googleGirisYap;
    window.cikisYap = cikisYap;
    window.sahneAl = sahneAl;
    window.slotBiral = slotBiral;
    window.takasPenceresiAc = takasPenceresiAc;
    window.takasTalebiGonder = takasTalebiGonder;
    window.takasOnayla = takasOnayla;
    window.takasReddet = takasReddet;
    window.notEkle = notEkle;

    auth.onAuthStateChanged(user => {
        const authArea = document.getElementById("auth-status-area");
        const notYazanInput = document.getElementById("not-yazan");
        
        if (user) {
            currentUser = user;
            let aktifIsim = getAktifIsim(user);
            if(notYazanInput) notYazanInput.value = aktifIsim;
            if(authArea) {
                authArea.innerHTML = `
                    <div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30">
                        <img src="${user.photoURL}" class="w-6 h-6 rounded-full border border-emerald-500" referrerpolicy="no-referrer">
                        <span class="text-xs font-bold text-emerald-400">${aktifIsim}</span>
                        <button onclick="window.cikisYap()" class="text-[10px] text-rose-400 ml-2 hover:underline cursor-pointer">Çıkış</button>
                    </div>
                `;
            }
            db.ref("muzisyenler/" + user.uid).update({
                name: aktifIsim,
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
        // Eğer veritabanı tamamen boşsa veya eski noktalı sistem kaldıysa varsayılanı yükle
        if (!veriler || Object.keys(veriler).length === 0 || snapshot.child("Pazartesi/12.00-15.00").exists()) {
            db.ref("haftalik_slotlar").set(varsayilanProgram);
            veriler = varsayilanProgram;
        }
        mevcutSlotlar = veriler;
        ProgramiCiz(mevcutSlotlar);
        CanliSahneVeGeriSayimMotoru();
    });
}

function CanliSahneVeGeriSayimMotoru() {
    const sahneYazi = document.getElementById("su-an-sahnede-kim-var");
    const sayacYazi = document.getElementById("canli-geri-sayim");
    const sayacEtiket = document.getElementById("sayac-etiket");
    const canliIsik = document.getElementById("canli-isik");
    const tabela = document.getElementById("canli-sahne-tabelasi");

    if (!sahneYazi || !sayacYazi) return;

    const simdi = new Date();
    const gunlerIngilizce = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const bugunTr = gunlerIngilizce[simdi.getDay()];
    
    const saat = simdi.getHours();
    const dakika = simdi.getMinutes();
    const saniye = simdi.getSeconds();
    const toplamGecenSaniye = (saat * 3600) + (dakika * 60) + saniye;

    let aktifSlot = null;
    let bitisSaati = 0;

    if (saat >= 12 && saat < 15) { aktifSlot = "12:00-15:00"; bitisSaati = 15; }
    else if (saat >= 15 && saat < 18) { aktifSlot = "15:00-18:00"; bitisSaati = 18; }
    else if (saat >= 18 && saat < 21) { aktifSlot = "18:00-21:00"; bitisSaati = 21; }
    else if (saat >= 21 && saat < 24) { aktifSlot = "21:00-24:00"; bitisSaati = 24; }

    if (aktifSlot && mevcutSlotlar[bugunTr] && mevcutSlotlar[bugunTr][aktifSlot]) {
        const kiminSahnep = mevcutSlotlar[bugunTr][aktifSlot];
        
        if (kiminSahnep === "BOŞ" || kiminSahnep === "") {
            sahneYazi.innerText = "MEYDAN BOŞ / REZERVE EDİLEBİLİR";
            sahneYazi.className = "text-2xl font-black text-emerald-400 tracking-wide";
            if(canliIsik) canliIsik.className = "w-3 h-3 bg-emerald-500 rounded-full animate-ping shadow-[0_0_10px_#10b981] shrink-0";
            if(tabela) tabela.style.borderColor = "rgba(16, 185, 129, 0.3)";
        } else {
            sahneYazi.innerText = kiminSahnep.toUpperCase();
            sahneYazi.className = "text-2xl font-black text-white tracking-wide animate-pulse";
            if(canliIsik) canliIsik.className = "w-3 h-3 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_#ef4444] shrink-0";
            if(tabela) tabela.style.borderColor = "rgba(249, 115, 22, 0.3)";
        }

        const toplamBitisSaniye = bitisSaati * 3600;
        let kalanSaniye = toplamBitisSaniye - toplamGecenSaniye;

        const h = Math.floor(kalanSaniye / 3600).toString().padStart(2, '0');
        const m = Math.floor((kalanSaniye % 3600) / 60).toString().padStart(2, '0');
        const s = (kalanSaniye % 60).toString().padStart(2, '0');

        sayacYazi.innerText = `${h}:${m}:${s}`;
        if(sayacEtiket) sayacEtiket.innerText = "Slotun Bitmesine Kalan Süre";
    } else {
        sahneYazi.innerText = "MEYDANDA ŞU AN KİMSE YOK";
        sahneYazi.className = "text-2xl font-black text-slate-400 tracking-wide";
        if(canliIsik) canliIsik.className = "w-3 h-3 bg-slate-600 rounded-full shrink-0";
        if(tabela) tabela.style.borderColor = "rgba(51, 65, 85, 0.2)";

        let sonrakiHedef = 12 * 3600;
        let kalanSaniye = 0;
        if (saat >= 0 && saat < 12) {
            kalanSaniye = sonrakiHedef - toplamGecenSaniye;
        } else {
            kalanSaniye = (24 * 3600 - toplamGecenSaniye) + sonrakiHedef;
        }

        const h = Math.floor(kalanSaniye / 3600).toString().padStart(2, '0');
        const m = Math.floor((kalanSaniye % 3600) / 60).toString().padStart(2, '0');
        const s = (kalanSaniye % 60).toString().padStart(2, '0');

        sayacYazi.innerText = `${h}:${m}:${s}`;
        if(sayacEtiket) sayacEtiket.innerText = "İlk Slotun Başlamasına Kalan";
    }
}

function ProgramiCiz(veri) {
    const baslikEl = document.getElementById("dinamik-tarih-basligi");
    if (baslikEl) baslikEl.innerText = "29 HAZİRAN - 5 TEMMUZ SLOT TAKVİMİ";

    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    // KRİTİK DÜZELTME: Eğer veritabanından güncel nesne geldiyse, inatla yukardaki varsayilanProgram nesnesine dönme!
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
            
            // Ultra esnek isim doğrulama
            const isOwner = currentUser && !isBoş && (temizSlotIsmi.includes(benimIsmimTemiz) || benimIsmimTemiz.includes(temizSlotIsmi));
            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12:00-15:00";
            
            let kartStili = "bg-[#050b18] border border-slate-800/80";
            let etiketHtml = "";

            if (isHaftaIciSabit) {
                etiketHtml = `<span class="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1"><i class="fa-solid fa-lock text-[8px]"></i> SABİT SLOT</span>`;
            } else {
                etiketHtml = `<span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1"><i class="fa-solid fa-hourglass-half text-[8px]"></i> SAAT DÖNGÜSÜ</span>`;
            }

            if (isBoş) {
                kartStili = "bg-amber-500/5 border border-dashed border-amber-500/30 animate-pulse";
                etiketHtml = currentUser 
                    ? `<button onclick="window.sahneAl('${gun}', '${saat}')" class="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-0.5 px-2 rounded transition cursor-pointer">Sahne Al</button>`
                    : `<span class="text-[9px] text-amber-500/40 italic">Müsait</span>`;
            } else if (isOwner) {
                kartStili = "bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                etiketHtml = `<button onclick="window.slotBiral('${gun}', '${saat}')" class="text-[9px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 px-2 py-0.5 rounded transition cursor-pointer">İptal Et</button>`;
            } else if (currentUser) {
                etiketHtml = `<button onclick="window.takasPenceresiAc('${gun}', '${saat}', '${isim}')" class="text-[9px] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 px-2 py-0.5 rounded border border-cyan-500/20 transition cursor-pointer">Takas</button>`;
            }

            slotlarHtml += `
                <div class="p-3.5 rounded-xl flex justify-between items-center transition-all ${kartStili}">
                    <div>
                        <span class="text-[10px] font-bold text-orange-500 block mb-0.5">${saat}</span>
                        <span class="font-extrabold text-sm ${isBoş ? 'text-amber-500/50 italic' : 'text-white'}">${isBoş ? 'Müsait' : isim}</span>
                    </div>
                    <div class="shrink-0">${etiketHtml}</div>
                </div>`;
        });

        programAkisi.innerHTML += `
            <div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl min-w-[340px] snap-start flex-shrink-0">
                <div class="border-b border-slate-800 pb-2 mb-3 flex justify-between items-center">
                    <span class="font-bold text-sm text-white flex items-center gap-2">
                        <i class="fa-regular fa-calendar text-orange-500"></i> ${gun}
                    </span>
                    <span class="text-[10px] text-slate-500">Takvim</span>
                </div>
                <div class="space-y-3">${slotlarHtml}</div>
            </div>`;
    });
    PerformansPanosunuCiz();
}

function PerformansPanosunuCiz() {
    const pano = document.getElementById("performans-panosu-alani");
    if (!pano) return;
    
    let skorlar = {};
    Object.keys(mevcutSlotlar || {}).forEach(g => {
        if(mevcutSlotlar[g]) {
            Object.keys(mevcutSlotlar[g]).forEach(s => {
                let isim = mevcutSlotlar[g][s];
                if (isim !== "BOŞ" && isim !== "") skorlar[isim] = (skorlar[isim] || 0) + 3;
            });
        }
    });
    const s = Object.entries(skorlar).sort((a, b) => b[1] - a[1]);
    
    pano.innerHTML = `
        <div class="border-t border-slate-800 pt-6 mt-6">
            <h3 class="text-white font-black mb-4 flex items-center gap-2">
                <i class="fa-solid fa-trophy text-amber-500"></i> AYLIK PERFORMANS TABLOSU
            </h3>
            <div class="grid grid-cols-2 gap-3">
                ${s.map(([n, h]) => `
                    <div class="flex justify-between items-center bg-[#0b1329] p-3 rounded-lg border border-slate-800">
                        <span class="font-bold text-slate-300">${n}</span>
                        <span class="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black">${h} SAAT</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function slotBiral(gun, saat) {
    if (!currentUser) return;
    let isim = getAktifIsim(currentUser);
    
    if (!confirm(`${gun} ${saat} slotunu boşa çıkarmak istediğine emin misin?`)) return;

    db.ref(`haftalik_slotlar/${gun}/${saat}`).set("BOŞ").then(() => {
        db.ref("notlar").push({
            isim: "📢 BİLDİRİM",
            mesaj: `${isim}, ${gun} ${saat} slotunu boşa çıkardı.`
        });
        alert("Slot başarıyla boşaltıldı.");
    }).catch(err => alert("Hata: " + err.message));
}

function sahneAl(gun, saat) {
    if (!currentUser) return;
    let isim = getAktifIsim(currentUser);
    
    if (!confirm(`${gun} ${saat} slotunu üstünüze almak istiyor musunuz?`)) return;

    // DÜZELTME: Tırnak içindeki "isim" kaldırıldı, dinamik isim değişkeni atandı!
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set(isim).then(() => {
        db.ref("notlar").push({
            isim: "✅ YENİ SLOT",
            mesaj: `${isim}, ${gun} ${saat} slotunu aldı.`
        });
    });
}

function takasPenceresiAc(karsiGun, karsiSaat, karsiMuzisyen) {
    if(!currentUser) return;
    let benimIsmim = getAktifIsim(currentUser);
    let benimIsmimTemiz = isimTemizle(benimIsmim); 
    let benimSlotlarim = [];

    Object.keys(mevcutSlotlar).forEach(gun => {
        if(mevcutSlotlar[gun]) {
            Object.keys(mevcutSlotlar[gun]).forEach(saat => {
                let slotIsmi = mevcutSlotlar[gun][saat] ? isimTemizle(mevcutSlotlar[gun][saat]) : "";
                if(slotIsmi !== "" && slotIsmi !== "bos" && (slotIsmi.includes(benimIsmimTemiz) || benimIsmimTemiz.includes(slotIsmi))) {
                    benimSlotlarim.push({ gun: gun, saat: saat });
                }
            });
        }
    });

    if(benimSlotlarim.length === 0) { 
        alert(`Sistemde kendi adınıza ait aktif bir slot bulunamadı! Önce takvimden bir slot almalısınız.`); 
        return; 
    }
    
    const modal = document.getElementById("ozel-takas-modal");
    const modalAciklama = document.getElementById("takas-modal-aciklama");
    const slotlarAlani = document.getElementById("takas-edilebilir-slotlar");
    
    modalAciklama.innerHTML = `<span class="text-cyan-400 font-bold">${karsiMuzisyen}</span> isimli müzisyenin <span class="text-amber-400 font-bold">${karsiGun} (${karsiSaat})</span> slotunu almak için karşılığında vermek istediğiniz kendi slotunuzu aşağıdan seçin:`;
    slotlarAlani.innerHTML = "";

    benimSlotlarim.forEach(item => {
        slotlarAlani.innerHTML += `
            <button onclick="window.takasTalebiGonder('${item.gun}', '${item.saat}', '${karsiMuzisyen}', '${karsiGun}', '${karsiSaat}')" 
                class="w-full text-left bg-[#050b18] hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 p-3 rounded-xl text-xs text-white transition font-semibold flex justify-between items-center cursor-pointer">
                <span>${item.gun} — ${item.saat}</span>
                <i class="fa-solid fa-chevron-right text-slate-500 text-[10px]"></i>
            </button>
        `;
    });

    modal.classList.remove("hidden");
}

function takasTalebiGonder(bGun, bSaat, kMuzisyen, kGun, kSaat) {
    document.getElementById("ozel-takas-modal").classList.add("hidden");
    let benimIsmim = getAktifIsim(currentUser);

    db.ref("takas_talepleri").push().set({
        gonderenUid: currentUser.uid,
        gonderenIsim: benimIsmim,
        gonderenGun: bGun,
        gonderenSaat: bSaat,
        aliciIsim: kMuzisyen,
        aliciGun: kGun,
        aliciSaat: kSaat,
        durum: "beklemede"
    });
    alert("Takas talebi karşı tarafa başarıyla iletildi!");
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani");
        if (!alani) return; 
        alani.innerHTML = "";
        
        const t = snapshot.val();
        if(!t) { alani.innerHTML = `<p class="text-slate-500 italic text-center py-4">Aktif takas teklifi yok.</p>`; return; }
        
        let talepVarmi = false;
        let benimIsmimTemiz = currentUser ? isimTemizle(getAktifIsim(currentUser)) : "";

        Object.keys(t).forEach(key => {
            const req = t[key];
            if(req.durum !== "beklemede") return;
            talepVarmi = true;

            const targetNameTemiz = isimTemizle(req.aliciIsim);
            const isImTarget = (targetNameTemiz.includes(benimIsmimTemiz) || benimIsmimTemiz.includes(targetNameTemiz));

            if(isImTarget) {
                alani.innerHTML += `
                    <div class="bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 p-4 rounded-xl space-y-3 shadow-md">
                        <p class="text-xs text-slate-200 leading-relaxed">
                            <span class="text-cyan-400 font-extrabold">${req.gonderenIsim}</span>, kendi <span class="text-emerald-400 font-bold">${req.gonderenGun} ${req.gonderenSaat}</span> slotunu, senin <span class="text-amber-400 font-bold">${req.aliciGun} ${req.aliciSaat}</span> slotunla değiştirmek istiyor.
                        </p>
                        <div class="flex gap-2 pt-1">
                            <button onclick="window.takasOnayla('${key}')" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded transition text-[10px] cursor-pointer">Kabul Et</button>
                            <button onclick="window.takasReddet('${key}')" class="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 font-bold py-1.5 rounded transition text-[10px] cursor-pointer">Reddet</button>
                        </div>
                    </div>`;
            } else {
                alani.innerHTML += `
                    <div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800/80 text-slate-400 text-[11px] mb-2">
                        <i class="fa-solid fa-spinner animate-spin text-cyan-500 mr-1"></i> 
                        <span class="text-slate-300 font-bold">${req.gonderenIsim}</span> ➔ <span class="text-slate-300 font-bold">${req.aliciIsim}</span> takas teklifi değerlendiriliyor...
                    </div>`;
            }
        });

        if(!talepVarmi) { alani.innerHTML = `<p class="text-slate-500 italic text-center py-4">Aktif takas teklifi yok.</p>`; }
    });
}

function takasOnayla(talepKey) {
    db.ref(`takas_talepleri/${talepKey}`).once("value", snapshot => {
        const req = snapshot.val();
        if(!req) return;

        let guncelleme = {};
        guncelleme[`haftalik_slotlar/${req.gonderenGun}/${req.gonderenSaat}`] = req.aliciIsim;
        guncelleme[`haftalik_slotlar/${req.aliciGun}/${req.aliciSaat}`] = req.gonderenIsim;
        guncelleme[`takas_talepleri/${talepKey}/durum`] = "onaylandi";

        db.ref().update(guncelleme).then(() => {
            db.ref("notlar").push({
                uid: "sistem",
                isim: "🔄 TAKAS BAŞARILI",
                mesaj: `${req.gonderenIsim} ve ${req.aliciIsim} sahne saatlerini karşılıklı olarak başarıyla takas etti!`
            });
        });
    });
}

function takasReddet(talepKey) {
    db.ref(`takas_talepleri/${talepKey}/durum`).set("reddedildi");
}

function googleGirisYap() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function cikisYap() { auth.signOut(); }

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) { pano.innerHTML = `<p class="text-slate-500 italic text-center py-4">Henüz bildirim yok.</p>`; return; }
        Object.keys(veriler).reverse().forEach(key => {
            const item = veriler[key];
            pano.innerHTML += `
                <div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800/80 mb-2">
                    <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 pr-4 text-xs">${item.mesaj}</p>
                </div>`;
        });
    });
    db.ref("muzisyenler").on("value", snapshot => {
        const liste = document.getElementById("muzisyen-listesi-alan");
        if (!liste) return; liste.innerHTML = "";
        const v = snapshot.val();
        if(!v) return;
        Object.keys(v).forEach(k => {
            liste.innerHTML += `
                <div class="flex items-center gap-2 bg-[#050b18] p-2 rounded-xl border border-slate-800/60 mb-1.5">
                    <img src="${v[k].picture}" class="w-6 h-6 rounded-full border border-slate-700" referrerpolicy="no-referrer">
                    <span class="text-xs font-bold text-slate-300">${v[k].name.toUpperCase()}</span>
                </div>`;
        });
    });
}

function notEkle() {
    if (!currentUser) return;
    const mesajEl = document.getElementById("not-icerik");
    if (!mesajEl || !mesajEl.value.trim()) return;
    db.ref("notlar").push({ 
        uid: currentUser.uid, 
        isim: getAktifIsim(currentUser), 
        mesaj: mesajEl.value.trim() 
    });
    mesajEl.value = "";
}

async function HavaDurumuGetir() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (res.ok) {
            const data = await res.json();
            const havadurumuEl = document.getElementById("havadurumu-derece");
            if (havadurumuEl) {
                havadurumuEl.innerText = `Beşiktaş: ${Math.round(data.current_weather.temperature)}°C`;
            }
        }
    } catch (e) {}
}
