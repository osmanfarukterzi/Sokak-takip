// FIREBASE BAĞLANTI AYARLARIN
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
let mevcutSlotlar = {}; 

// YEDEK SABİT PROGRAM (Sistem koruması)
const varsayilanProgram = {
    "Pazartesi": { "12.00-15.00": "Nebi", "15.00-18.00": "Sirayet", "18.00-21.00": "Berkan", "21.00-24.00": "Uğur" },
    "Salı":      { "12.00-15.00": "Doğa", "15.00-18.00": "Raşit", "18.00-21.00": "Samet", "21.00-24.00": "İsmet" },
    "Çarşamba":  { "12.00-15.00": "Uğur", "15.00-18.00": "Berkan", "18.00-21.00": "Nebi", "21.00-24.00": "Samet" },
    "Perşembe":  { "12.00-15.00": "Mami", "15.00-18.00": "İsmet", "18.00-21.00": "Raşit", "21.00-24.00": "Sirayet" },
    "Cuma":      { "12.00-15.00": "Doğa", "15.00-18.00": "Nebi", "18.00-21.00": "Raşit", "21.00-24.00": "İsmet" },
    "Cumartesi": { "12.00-15.00": "Mami", "15.00-18.00": "Berkan", "18.00-21.00": "Uğur", "21.00-24.00": "Sirayet" },
    "Pazar":     { "12.00-15.00": "Yiğit", "15.00-18.00": "Faruk", "18.00-21.00": "Samet", "21.00-24.00": "Enes" }
};

document.addEventListener("DOMContentLoaded", () => {
    TarihiOtomatikGuncelle();
    VeritabaniniKontrolEtVeDinle();
    CanliVerileriDinle();
    CanliTakaslariDinle();
    setTimeout(HavaDurumuGetir, 500);

    auth.onAuthStateChanged(user => {
        const authArea = document.getElementById("auth-status-area");
        const notYazanInput = document.getElementById("not-yazan");
        
        if (user) {
            currentUser = user;
            if(notYazanInput) notYazanInput.value = user.displayName;
            if(authArea) {
                authArea.innerHTML = `
                    <div class="flex items-center gap-2 bg-slate-950 py-1.5 px-3 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
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
                    <button onclick="googleGirisYap()" class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer">
                        <img src="https://www.google.com/favicon.ico" class="w-4 h-4 brightness-0" alt="Google">
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
        if (!veriler || Object.keys(veriler).length === 0) {
            db.ref("haftalik_slotlar").set(varsayilanProgram);
            veriler = varsayilanProgram;
        }
        mevcutSlotlar = veriler;
        ProgramiCiz(veriler);
    });
}

// EVET, RENKLERİN VE EFSANE TASARIMIN GERİ GELDİĞİ YER BURASI!
function ProgramiCiz(veri) {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    const aktifVeri = (veri && Object.keys(veri).length > 0) ? veri : varsayilanProgram;
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    programAkisi.innerHTML = "";

    let userGroupKey = "";
    if (currentUser && currentUser.displayName) {
        userGroupKey = currentUser.displayName.toLowerCase();
    }

    gunler.forEach(gun => {
        if (!aktifVeri[gun]) {
            aktifVeri[gun] = { "12.00-15.00": "BOŞ", "15.00-18.00": "BOŞ", "18.00-21.00": "BOŞ", "21.00-24.00": "BOŞ" };
        }

        let slotlarHtml = "";
        const saatler = ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"];

        saatler.forEach(saat => {
            const isim = aktifVeri[gun][saat] || "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            const güvenliIsim = isim ? isim.toLowerCase() : "";
            
            const isOwner = currentUser && (
                userGroupKey.includes(güvenliIsim) || 
                (güvenliIsim.includes("sirayet") && userGroupKey.includes("osman faruk")) ||
                (güvenliIsim.includes("faruk") && userGroupKey.includes("osman faruk"))
            );

            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12.00-15.00";
            const isHaftaSonuYanalDongu = ["Cuma", "Cumartesi", "Pazar"].includes(gun) && saat === "12.00-15.00";
            
            let kartStili = "bg-slate-900/80 border-slate-800/80 hover:border-slate-700/80 shadow-md";
            let butonlarHtml = "";
            let isimStili = "text-slate-200";
            
            if (isBoş) {
                // PARLAYAN VE YANIP SÖNEN BOŞ SLOT TASARIMI (Altın/Kehribar Rengi)
                kartStili = "bg-amber-500/5 border border-dashed border-amber-500/40 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.05)]";
                isimStili = "text-amber-500/80 font-medium italic";
                butonlarHtml = currentUser 
                    ? `<button onclick="sahneAl('${gun}', '${saat}')" class="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-1 px-3 rounded-xl transition shadow-md cursor-pointer transform active:scale-95">🎪 Sahne Al</button>`
                    : `<span class="text-[9px] text-amber-500/50 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Giriş Yap</span>`;
            } else {
                if (isOwner) {
                    // SANA AİT GRUBUN PARLAYAN NEON YEŞİL KARTI (SİRAYET)
                    kartStili = "bg-emerald-500/10 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20";
                    isimStili = "text-emerald-400 font-black drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                    butonlarHtml = `<button onclick="slotBiral('${gun}', '${saat}')" class="text-[10px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-bold py-1 px-2.5 rounded-lg border border-rose-500/40 transition cursor-pointer shadow-sm">🚫 İptal Et</button>`;
                } else {
                    // BAŞKALARININ DOLU SLOTLARI
                    if (currentUser) {
                        butonlarHtml = `<button onclick="takasPenceresiAc('${gun}', '${saat}', '${isim}')" class="text-[10px] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 py-1 px-2.5 rounded-lg border border-cyan-500/30 transition cursor-pointer shadow-sm font-semibold">🔄 Takas</button>`;
                    }
                }
            }

            // Göz Alıcı Etiket Tasarımları
            let etiketHtml = "";
            if (isHaftaIciSabit && !isBoş) etiketHtml = `<span class="text-[8px] font-extrabold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded border border-orange-500/30 shadow-sm">🔒 SABİT</span>`;
            else if (isHaftaSonuYanalDongu && !isBoş) etiketHtml = `<span class="text-[8px] font-extrabold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30 shadow-sm">🔄 DÖNGÜ</span>`;
            else if (!isBoş) etiketHtml = `<span class="text-[8px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">⏳ SLOT</span>`;

            slotlarHtml += `
                <div class="p-3.5 rounded-xl border transition-all duration-200 flex justify-between items-center gap-3 min-w-[260px] ${kartStili}">
                    <div>
                        <span class="text-[10px] font-mono font-bold text-slate-500 block mb-0.5 flex items-center gap-1">${saat} ${etiketHtml}</span>
                        <span class="text-sm tracking-wide ${isimStili}">${isBoş ? 'Müsait (Boş)' : isim}</span>
                    </div>
                    <div class="shrink-0">${butonlarHtml}</div>
                </div>`;
        });

        programAkisi.innerHTML += `
            <div class="bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-800/80 p-4 shadow-xl min-w-[300px] snap-start flex-shrink-0 hover:border-slate-700/50 transition-all duration-300">
                <div class="border-b border-slate-800 pb-2.5 mb-3.5 flex justify-between items-center">
                    <span class="font-black text-base text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-300 flex items-center gap-2">
                        <i class="fa-regular fa-calendar text-orange-500 text-sm"></i> ${gun}
                    </span>
                </div>
                <div class="space-y-3">${slotlarHtml}</div>
            </div>`;
    });
}

function slotBiral(gun, saat) {
    if (!confirm(`${gun} günü ${saat} slotunuzu boşaltmak ve iptal etmek istediğinize emin misiniz?`)) return;
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set("BOŞ").then(() => {
        db.ref("notlar").push({
            uid: "sistem",
            isim: "📢 SİSTEM BİLDİRİMİ",
            mesaj: `${currentUser.displayName}, ${gun} günü ${saat} slotunu boşa çıkardı! İsteyen yukarıdan sahne alabilir.`
        });
    });
}

function sahneAl(gun, saat) {
    if(!currentUser) return;
    let sahneIsmi = currentUser.displayName;
    if(sahneIsmi.toLowerCase().includes("osman faruk")) {
        sahneIsmi = "Sirayet";
    } else {
        sahneIsmi = sahneIsmi.split(' ')[0];
    }

    if (!confirm(`${gun} günü ${saat} boş slotunu ${sahneIsmi} adına rezerve etmek istiyor musunuz?`)) return;
    
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set(sahneIsmi).then(() => {
        db.ref("notlar").push({
            uid: "sistem",
            isim: "📢 SİSTEM BİLDİRİMİ",
            mesaj: `Harika! ${sahneIsmi} grubu, ${gun} günü ${saat} boş slotunu kaptı.`
        });
    });
}

function takasPenceresiAc(karsiGun, karsiSaat, karsiMuzisyen) {
    let benimSlotlarim = [];
    const gunler = Object.keys(mevcutSlotlar);
    if(!currentUser) return;
    let userGroupKey = currentUser.displayName.toLowerCase();

    gunler.forEach(g => {
        if(mevcutSlotlar[g]) {
            Object.keys(mevcutSlotlar[g]).forEach(s => {
                let nameInSlot = mevcutSlotlar[g][s] ? mevcutSlotlar[g][s].toLowerCase() : "";
                if(userGroupKey.includes(nameInSlot) || (nameInSlot.includes("sirayet") && userGroupKey.includes("osman faruk"))) {
                    benimSlotlarim.push({ gun: g, saat: s });
                }
            });
        }
    });

    if(benimSlotlarim.length === 0) {
        alert("Takas teklif edebilmeniz için bu hafta en az bir adet aktif slotunuzun bulunması gerekir!");
        return;
    }

    let seceneklerMetni = "Takas etmek istediğiniz KENDİ slotunuzu seçin:\n\n";
    benimSlotlarim.forEach((item, index) => {
        seceneklerMetni += `${index + 1}) ${item.gun} - ${item.saat}\n`;
    });

    let secim = prompt(`${seceneklerMetni}\nLütfen seçtiğiniz numara değerini yazın (Örn: 1):`);
    let secimIndex = parseInt(secim) - 1;

    if(isNaN(secimIndex) || secimIndex < 0 || secimIndex >= benimSlotlarim.length) {
        alert("Geçersiz seçim yaptınız, işlem iptal edildi.");
        return;
    }

    let benimSecilenSlot = benimSlotlarim[secimIndex];

    let yeniTakasRef = db.ref("takas_talepleri").push();
    yeniTakasRef.set({
        gonderenUid: currentUser.uid,
        gonderenIsim: currentUser.displayName.toLowerCase().includes("osman faruk") ? "Sirayet" : currentUser.displayName,
        gonderenGun: benimSecilenSlot.gun,
        gonderenSaat: benimSecilenSlot.saat,
        aliciIsim: karsiMuzisyen,
        aliciGun: karsiGun,
        aliciSaat: karsiSaat,
        durum: "beklemede"
    }).then(() => {
        alert(`${karsiMuzisyen} kullanıcısına takas teklifiniz canlı olarak iletildi! Pano üzerinde görünecektir.`);
    });
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const takasAlani = document.getElementById("canli-takas-talepleri-alani");
        if (!takasAlani) return;
        takasAlani.innerHTML = "";
        
        const talepler = snapshot.val();
        if(!talepler) {
            takasAlani.innerHTML = `<p class="text-slate-600 text-[11px] italic text-center py-1">Aktif takas teklifi yok.</p>`;
            return;
        }

        Object.keys(talepler).forEach(key => {
            const t = talepler[key];
            if(t.durum !== "beklemede") return;

            let userGroupKey = currentUser ? currentUser.displayName.toLowerCase() : "";
            const isMeAlici = currentUser && (
                userGroupKey.includes(t.aliciIsim.toLowerCase()) || 
                (t.aliciIsim.toLowerCase() === "sirayet" && userGroupKey.includes("osman faruk"))
            );

            let aksiyonButonlari = "";
            if (isMeAlici) {
                aksiyonButonlari = `
                    <div class="flex gap-1.5 mt-2">
                        <button onclick="takasCevapla('${key}', 'onayla')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] px-2 py-1 rounded cursor-pointer">Onayla</button>
                        <button onclick="takasCevapla('${key}', 'reddet')" class="bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 font-medium text-[10px] px-2 py-1 rounded border border-rose-500/30 cursor-pointer">Reddet</button>
                    </div>`;
            } else {
                aksiyonButonlari = `<p class="text-[10px] text-slate-500 italic mt-1">🔄 Karşı tarafın onayı bekleniyor...</p>`;
            }

            takasAlani.innerHTML += `
                <div class="bg-slate-950 p-2.5 rounded-lg border border-cyan-950/50 text-xs shadow-inner">
                    <span class="font-bold text-cyan-400">⚡ Takas Teklifi</span>
                    <p class="text-slate-300 mt-1">
                        <strong class="text-slate-200">${t.gonderenIsim}</strong>, sana ait olan <span class="text-amber-400 font-mono">${t.aliciGun} (${t.aliciSaat})</span> slotunu, kendi <span class="text-cyan-400 font-mono">${t.gonderenGun} (${t.gonderenSaat})</span> slotuyla değiştirmek istiyor.
                    </p>
                    ${aksiyonButonlari}
                </div>`;
        });
    });
}

function takasCevapla(key, aksiyon) {
    db.ref(`takas_talepleri/${key}`).once("value", snapshot => {
        const t = snapshot.val();
        if(!t) return;

        if(aksiyon === "reddet") {
            db.ref(`takas_talepleri/${key}/durum`).set("reddedildi").then(() => {
                db.ref("notlar").push({
                    uid: "sistem",
                    isim: "❌ TAKAS İPTAL",
                    mesaj: `${t.aliciIsim}, ${t.gonderenIsim} tarafınca gelen takas teklifini reddetti.`
                });
            });
        } else if(aksiyon === "onayla") {
            let guncellemeler = {};
            guncellemeler[`haftalik_slotlar/${t.gonderenGun}/${t.gonderenSaat}`] = t.aliciIsim;
            guncellemeler[`haftalik_slotlar/${t.aliciGun}/${t.aliciSaat}`] = t.gonderenIsim;
            guncellemeler[`takas_talepleri/${key}/durum`] = "onaylandi";

            db.ref().update(guncellemeler).then(() => {
                db.ref("notlar").push({
                    uid: "sistem",
                    isim: "🎉 TAKAS GERÇEKLEŞTİ",
                    mesaj: `${t.gonderenIsim} ve ${t.aliciIsim} başarıyla slotlarını takas etti! Çizelge güncellendi.`
                });
            });
        }
    });
}

function TarihiOtomatikGuncelle() {
    const baslikEl = document.getElementById("dinamik-tarih-basligi");
    if (!baslikEl) return;
    const simdi = new Date();
    const bugunHangiGun = simdi.getDay();
    let hedefPazartesi = new Date(simdi);
    const gunMesafe = bugunHangiGun === 0 ? 6 : bugunHangiGun - 1;
    hedefPazartesi.setDate(simdi.getDate() - gunMesafe + 7); 
    const hedefPazar = new Date(hedefPazartesi);
    hedefPazar.setDate(hedefPazartesi.getDate() + 6);
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    baslikEl.innerText = `${hedefPazartesi.getDate()} ${aylar[hedefPazartesi.getMonth()]} - ${hedefPazar.getDate()} ${aylar[hedefPazar.getMonth()]} SLOT TAKVİMİ`;
}

function googleGirisYap() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Hata: " + e.message));
}
function cikisYap() { auth.signOut(); }

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) { pano.innerHTML = `<p class="text-slate-600 text-center italic py-2">Henüz bildirim yok.</p>`; return; }
        Object.keys(veriler).reverse().forEach(key => {
            const item = veriler[key];
            const isMyNote = currentUser && currentUser.uid === item.uid;
            pano.innerHTML += `
                <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs relative">
                    <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 pr-4">${item.mesaj}</p>
                    ${isMyNote ? `<button onclick="notSil('${key}')" class="absolute top-1 right-2 text-rose-500 text-[10px] hover:underline cursor-pointer">Sil</button>` : ""}
                </div>`;
        });
    });
    db.ref("muzisyenler").on("value", snapshot => {
        const listeAlani = document.getElementById("muzisyen-listesi-alan");
        const sayac = document.getElementById("aktif-uye-sayisi");
        if (!listeAlani) return; listeAlani.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) { listeAlani.innerHTML = `<p class="text-slate-600 italic text-center py-2">Henüz kimse yok.</p>`; if (sayac) sayac.innerText = "0 Aktif"; return; }
        const keys = Object.keys(veriler);
        if (sayac) sayac.innerText = `${keys.length} Aktif`;
        keys.forEach(key => {
            const u = veriler[key];
            listeAlani.innerHTML += `
                <div class="flex items-center gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                    <img src="${u.picture}" class="w-6 h-6 rounded-full" referrerpolicy="no-referrer">
                    <span class="font-bold text-slate-200">${u.name}</span>
                </div>`;
        });
    });
}

function notEkle() {
    if (!currentUser) { alert("Önce giriş yapmalısın!"); return; }
    const mesajEl = document.getElementById("not-icerik");
    if (!mesajEl.value.trim()) return;
    db.ref("notlar").push({ uid: currentUser.uid, isim: currentUser.displayName.toLowerCase().includes("osman faruk") ? "Sirayet" : currentUser.displayName, mesaj: mesajEl.value.trim() });
    mesajEl.value = "";
}

function notSil(key) { db.ref("notlar").child(key).remove(); }

async function HavaDurumuGetir() {
    const dereceEl = document.getElementById("havadurumu-derece"); const ozetEl = document.getElementById("havadurumu-ozet");
    if (!dereceEl || !ozetEl) return;
    try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (response.ok) { const data = await response.json(); if (data && data.current_weather) { dereceEl.innerText = `Beşiktaş: ${Math.round(data.current_weather.temperature)}°C`; ozetEl.innerText = data.current_weather.weathercode >= 1 && data.current_weather.weathercode <= 3 ? "Parçalı Bulutlu" : "Hava Açık"; } }
    } catch (e) { }
}
