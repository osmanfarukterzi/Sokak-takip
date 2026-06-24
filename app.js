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

const isimEslestirme = {
    "osmanfarukterzi@gmail.com": "Sirayet",
    "nebi@mail.com": "Nebi",
    "berkan@mail.com": "Berkan"
};

function getSahneIsmi(user) {
    return isimEslestirme[user.email] || user.displayName.split(' ')[0];
}

document.addEventListener("DOMContentLoaded", () => {
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

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            const authArea = document.getElementById("auth-status-area");
            if(authArea) authArea.innerHTML = `<div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30"><span class="text-xs font-bold text-emerald-400">${getSahneIsmi(user)}</span><button onclick="cikisYap()" class="text-[10px] text-rose-400 ml-2">Çıkış</button></div>`;
            db.ref("muzisyenler/" + user.uid).set({ name: getSahneIsmi(user), picture: user.photoURL });
        } else {
            const authArea = document.getElementById("auth-status-area");
            if(authArea) authArea.innerHTML = `<button onclick="googleGirisYap()" class="bg-white text-slate-900 font-bold py-2 px-3 rounded-xl text-xs">Google ile Giriş Yap</button>`;
        }
        ProgramiCiz(mevcutSlotlar);
    });
});

function VeritabaniniKontrolEtVeDinle() {
    db.ref("haftalik_slotlar").on("value", snapshot => {
        mevcutSlotlar = snapshot.val();
        ProgramiCiz(mevcutSlotlar);
        CanliSahneVeGeriSayimMotoru();
    });
}

function CanliSahneVeGeriSayimMotoru() {
    const sahneYazi = document.getElementById("su-an-sahnede-kim-var");
    const sayacYazi = document.getElementById("canli-geri-sayim");
    if (!sahneYazi || !sayacYazi) return;

    const simdi = new Date();
    const gunlerTr = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const bugun = gunlerTr[simdi.getDay()];
    const saat = simdi.getHours();
    
    let aktifSlot = null;
    if (saat >= 12 && saat < 15) aktifSlot = "12.00-15.00";
    else if (saat >= 15 && saat < 18) aktifSlot = "15.00-18.00";
    else if (saat >= 18 && saat < 21) aktifSlot = "18.00-21.00";
    else if (saat >= 21 && saat < 24) aktifSlot = "21.00-24.00";

    if (aktifSlot && mevcutSlotlar[bugun] && mevcutSlotlar[bugun][aktifSlot]) {
        sahneYazi.innerText = mevcutSlotlar[bugun][aktifSlot];
    } else {
        sahneYazi.innerText = "MEYDANDA ŞU AN KİMSE YOK";
    }
}

function ProgramiCiz(veri) {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi || !veri) return;
    programAkisi.innerHTML = "";
    
    ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].forEach(gun => {
        let slotlarHtml = "";
        ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"].forEach(saat => {
            const isim = veri[gun] ? (veri[gun][saat] || "BOŞ") : "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            const isOwner = currentUser && getSahneIsmi(currentUser) === isim;
            
            slotlarHtml += `<div class="p-3 rounded-lg border ${isBoş ? 'border-dashed border-amber-500/30' : 'border-slate-800'} bg-[#050b18]">
                <span class="text-[10px] text-orange-500 font-bold">${saat}</span>
                <div class="font-bold text-sm ${isBoş ? 'text-amber-500/50' : 'text-white'}">${isBoş ? 'Müsait' : isim}</div>
                ${isOwner ? `<button onclick="slotBiral('${gun}','${saat}')" class="text-[10px] text-rose-400 font-bold mt-1">İptal Et</button>` : ""}
                ${isBoş && currentUser ? `<button onclick="sahneAl('${gun}','${saat}')" class="text-[10px] text-emerald-400 font-bold mt-1">Sahne Al</button>` : ""}
                ${!isBoş && !isOwner && currentUser ? `<button onclick="takasPenceresiAc('${gun}','${saat}','${isim}')" class="text-[10px] text-cyan-400 font-bold mt-1">Takas</button>` : ""}
            </div>`;
        });
        programAkisi.innerHTML += `<div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 min-w-[340px] flex-shrink-0"><div class="font-bold text-white mb-3">${gun}</div><div class="space-y-2">${slotlarHtml}</div></div>`;
    });
    PerformansPanosunuCiz();
}

function PerformansPanosunuCiz() {
    const pano = document.getElementById("performans-panosu-alani");
    if (!pano) return;
    let skorlar = {};
    Object.keys(mevcutSlotlar || {}).forEach(g => {
        Object.keys(mevcutSlotlar[g]).forEach(s => {
            let isim = mevcutSlotlar[g][s];
            if (isim !== "BOŞ" && isim !== "") skorlar[isim] = (skorlar[isim] || 0) + 3;
        });
    });
    const s = Object.entries(skorlar).sort((a, b) => b[1] - a[1]);
    pano.innerHTML = `<div class="border-t border-slate-800 pt-6 mt-6"><h3 class="text-white font-black mb-4">🏆 AYLIK PERFORMANS</h3><div class="grid grid-cols-2 gap-3">${s.map(([n, h]) => `<div class="flex justify-between bg-[#0b1329] p-3 rounded-lg border border-slate-800"><span class="font-bold text-slate-300">${n}</span><span class="text-emerald-400 font-black">${h}s</span></div>`).join('')}</div></div>`;
}

function slotBiral(g, s) {
    if(!confirm("İptal etmek istediğine emin misin?")) return;
    db.ref(`haftalik_slotlar/${g}/${s}`).set("BOŞ");
    db.ref("notlar").push({ isim: getSahneIsmi(currentUser), mesaj: `${g} ${s} slotunu iptal etti.` });
}

function sahneAl(g, s) {
    if(!confirm("Rezerve etmek istiyor musun?")) return;
    db.ref(`haftalik_slotlar/${g}/${s}`).set(getSahneIsmi(currentUser));
}

function takasPenceresiAc(kG, kS, kM) {
    let benimSlotlarim = [];
    Object.keys(mevcutSlotlar).forEach(g => {
        Object.keys(mevcutSlotlar[g]).forEach(s => {
            if(mevcutSlotlar[g][s] === getSahneIsmi(currentUser)) benimSlotlarim.push({ gun: g, saat: s });
        });
    });
    if(benimSlotlarim.length === 0) { alert("Takas edebileceğiniz aktif slotunuz yok!"); return; }
    let secim = prompt("Hangi slotunu vermek istersin?\n" + benimSlotlarim.map((x,i) => (i+1)+") "+x.gun+" "+x.saat).join("\n"));
    if(secim) {
        let b = benimSlotlarim[parseInt(secim)-1];
        db.ref("takas_talepleri").push().set({ g: getSahneIsmi(currentUser), gG: b.gun, gS: b.saat, aI: kM, aG: kG, aS: kS, d: "beklemede" });
        alert("Talep gönderildi!");
    }
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani");
        if (!alani) return; alani.innerHTML = "";
        const t = snapshot.val();
        if(!t) return;
        Object.keys(t).forEach(k => {
            const req = t[k];
            if(req.d === "beklemede" && req.aI === getSahneIsmi(currentUser)) {
                alani.innerHTML += `<div class="bg-cyan-900 p-3 rounded mt-2 text-white">Takas: ${req.g} senin ${req.aG} ${req.aS} saatini istiyor. <button onclick="takasOnayla('${k}')">Onayla</button></div>`;
            }
        });
    });
}

function takasOnayla(k) {
    db.ref(`takas_talepleri/${k}`).once("value", s => {
        const r = s.val();
        let g = {};
        g[`haftalik_slotlar/${r.gG}/${r.gS}`] = r.aI;
        g[`haftalik_slotlar/${r.aG}/${r.aS}`] = r.g;
        g[`takas_talepleri/${k}/d`] = "onaylandi";
        db.ref().update(g);
    });
}

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) return;
        Object.keys(veriler).reverse().slice(0,5).forEach(key => {
            const item = veriler[key];
            pano.innerHTML += `<div class="bg-[#050b18] p-2 rounded-xl border border-slate-800 mb-2"><span class="text-orange-400 font-bold">${item.isim}:</span> ${item.mesaj}</div>`;
        });
    });
    db.ref("muzisyenler").on("value", snapshot => {
        const liste = document.getElementById("muzisyen-listesi-alan");
        if (!liste) return; liste.innerHTML = "";
        const v = snapshot.val();
        if(!v) return;
        Object.keys(v).forEach(k => {
            liste.innerHTML += `<div class="flex items-center gap-2 bg-[#050b18] p-2 rounded-xl border border-slate-800 mb-1"><span class="text-xs font-bold text-slate-300">${v[k].name.toUpperCase()}</span></div>`;
        });
    });
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

function googleGirisYap() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function cikisYap() { auth.signOut(); }
