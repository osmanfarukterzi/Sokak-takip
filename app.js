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
let mevcutSlotlar = {}; 

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
                    <div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30">
                        <img src="${user.photoURL}" class="w-6 h-6 rounded-full border border-emerald-500" referrerpolicy="no-referrer">
                        <span class="text-xs font-bold text-emerald-400">${user.displayName.split(' ')[0]}</span>
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
                    <button onclick="googleGirisYap()" class="bg-white hover:bg-slate-100 text-slate-900 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-2 transition shadow-lg cursor-pointer">
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
        if (!veriler || Object.keys(veriler).length === 0) {
            db.ref("haftalik_slotlar").set(varsayilanProgram);
            veriler = varsayilanProgram;
        }
        mevcutSlotlar = veriler;
        ProgramiCiz(veriler);
    });
}

// İLK FOTOĞRAFTAKİ GENİŞ VE PARLAYAN TASARIMI BİREBİR OLUŞTURAN YER
function ProgramiCiz(veri) {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    const aktifVeri = (veri && Object.keys(veri).length > 0) ? veri : varsayilanProgram;
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    programAkisi.innerHTML = "";

    let userGroupKey = currentUser && currentUser.displayName ? currentUser.displayName.toLowerCase() : "";

    gunler.forEach(gun => {
        let slotlarHtml = "";
        const saatler = ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"];

        saatler.forEach(saat => {
            const isim = aktifVeri[gun] && aktifVeri[gun][saat] ? aktifVeri[gun][saat] : "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            const güvenliIsim = isim.toLowerCase();
            
            const isOwner = currentUser && (
                userGroupKey.includes(güvenliIsim) || 
                (güvenliIsim.includes("sirayet") && userGroupKey.includes("osman faruk")) ||
                (güvenliIsim.includes("faruk") && userGroupKey.includes("osman faruk"))
            );

            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12.00-15.00";
            
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
                    ? `<button onclick="sahneAl('${gun}', '${saat}')" class="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-0.5 px-2 rounded transition cursor-pointer">Sahne Al</button>`
                    : `<span class="text-[9px] text-amber-500/40 italic">Müsait</span>`;
            } else if (isOwner) {
                kartStili = "bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                etiketHtml = `<button onclick="slotBiral('${gun}', '${saat}')" class="text-[9px] bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-slate-950 px-2 py-0.5 rounded transition cursor-pointer">İptal Et</button>`;
            } else if (currentUser) {
                etiketHtml = `<button onclick="takasPenceresiAc('${gun}', '${saat}', '${isim}')" class="text-[9px] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 px-2 py-0.5 rounded border border-cyan-500/20 transition cursor-pointer">Takas</button>`;
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
}

function slotBiral(gun, saat) {
    if (!confirm(`${gun} günü ${saat} slotunuzu boşaltmak istediğinize emin misiniz?`)) return;
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set("BOŞ").then(() => {
        db.ref("notlar").push({ uid: "sistem", isim: "📢 BİLDİRİM", mesaj: `${currentUser.displayName}, ${gun} ${saat} slotunu boşa çıkardı.` });
    });
}

function sahneAl(gun, saat) {
    if(!currentUser) return;
    let sahneIsmi = currentUser.displayName.toLowerCase().includes("osman faruk") ? "Sirayet" : currentUser.displayName.split(' ')[0];
    if (!confirm(`${gun} günü ${saat} slotunu rezerve etmek istiyor musunuz?`)) return;
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set(sahneIsmi);
}

function takasPenceresiAc(karsiGun, karsiSaat, karsiMuzisyen) {
    let benimSlotlarim = [];
    if(!currentUser) return;
    let userGroupKey = currentUser.displayName.toLowerCase();

    Object.keys(mevcutSlotlar).forEach(g => {
        if(mevcutSlotlar[g]) {
            Object.keys(mevcutSlotlar[g]).forEach(s => {
                let nameInSlot = mevcutSlotlar[g][s] ? mevcutSlotlar[g][s].toLowerCase() : "";
                if(userGroupKey.includes(nameInSlot) || (nameInSlot.includes("sirayet") && userGroupKey.includes("osman faruk"))) {
                    benimSlotlarim.push({ gun: g, saat: s });
                }
            });
        }
    });

    if(benimSlotlarim.length === 0) { alert("Takas edebileceğiniz aktif slotunuz yok!"); return; }
    let metin = "Takas etmek istediğiniz slotunuzu seçin:\n\n";
    benimSlotlarim.forEach((item, idx) => { metin += `${idx + 1}) ${item.gun} - ${item.saat}\n`; });
    let secim = prompt(metin);
    let idx = parseInt(secim) - 1;
    if(isNaN(idx) || idx < 0 || idx >= benimSlotlarim.length) return;

    let bSlot = benimSlotlarim[idx];
    db.ref("takas_talepleri").push().set({
        gonderenUid: currentUser.uid, gonderenIsim: userGroupKey.includes("osman faruk") ? "Sirayet" : currentUser.displayName,
        gonderenGun: bSlot.gun, gonderenSaat: bSlot.saat, aliciIsim: karsiMuzisyen, aliciGun: karsiGun, aliciSaat: karsiSaat, durum: "beklemede"
    });
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani");
        if (!alani) return; alani.innerHTML = "";
        const t = snapshot.val();
        if(!t) { alani.innerHTML = `<p class="text-slate-500 italic text-[11px] text-center py-2">Aktif takas teklifi yok.</p>`; return; }
        Object.keys(t).forEach(k => {
            if(t[k].durum !== "beklemede") return;
            alani.innerHTML += `<div class="bg-[#050b18] p-2 rounded-xl border border-slate-800 text-[11px] text-slate-300"><strong>${t[k].gonderenIsim}</strong> takas istiyor.</div>`;
        });
    });
}

function TarihiOtomatikGuncelle() {}
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
                <div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800/80 relative">
                    <span class="font-bold text-orange-400 block mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 pr-4">${item.mesaj}</p>
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
                <div class="flex items-center gap-2 bg-[#050b18] p-2 rounded-xl border border-slate-800/60">
                    <img src="${v[k].picture}" class="w-6 h-6 rounded-full border border-slate-700" referrerpolicy="no-referrer">
                    <span class="text-xs font-bold text-slate-300">${v[k].name.toUpperCase()}</span>
                </div>`;
        });
    });
}

function notEkle() {
    if (!currentUser) return;
    const mesajEl = document.getElementById("not-icerik");
    if (!mesajEl.value.trim()) return;
    db.ref("notlar").push({ uid: currentUser.uid, isim: currentUser.displayName.toLowerCase().includes("osman faruk") ? "Sirayet" : currentUser.displayName.split(' ')[0], mesaj: mesajEl.value.trim() });
    mesajEl.value = "";
}

async function HavaDurumuGetir() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (res.ok) {
            const data = await res.json();
            document.getElementById("havadurumu-derece").innerText = `Beşiktaş: ${Math.round(data.current_weather.temperature)}°C`;
        }
    } catch (e) {}
}
