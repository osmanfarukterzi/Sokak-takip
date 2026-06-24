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

// İSİM EŞLEŞTİRME - Buraya herkesi ekliyoruz
const isimEslestirme = {
    "osmanfarukterzi@gmail.com": "Sirayet",
    "nebi@mail.com": "Nebi",
    "berkan@mail.com": "Berkan",
    "doga@mail.com": "Doğa",
    "rasit@mail.com": "Raşit",
    "samet@mail.com": "Samet",
    "ismet@mail.com": "İsmet",
    "ugur@mail.com": "Uğur",
    "yigit@mail.com": "Yiğit",
    "faruk@mail.com": "Faruk",
    "enes@mail.com": "Enes",
    "mami@mail.com": "Mami"
};

function getSahneIsmi(user) {
    if (!user) return "Misafir";
    return isimEslestirme[user.email] || user.displayName.split(' ')[0];
}

document.addEventListener("DOMContentLoaded", () => {
    db.ref("haftalik_slotlar").on("value", snapshot => {
        mevcutSlotlar = snapshot.val() || {};
        ProgramiCiz(mevcutSlotlar);
    });
    
    CanliVerileriDinle();
    CanliTakaslariDinle();
    setInterval(CanliSahneVeGeriSayimMotoru, 1000);
    HavaDurumuGetir();
});

function ProgramiCiz(veri) {
    const akis = document.getElementById("program-akisi");
    if (!akis) return;
    akis.innerHTML = "";
    
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const saatler = ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"];

    gunler.forEach(gun => {
        let gunluk = veri[gun] || {};
        let html = `<div class="bg-[#0b1329] border border-slate-800 rounded-xl p-4 mb-6">
            <h2 class="text-white font-black text-lg mb-4 border-b border-slate-700 pb-2">${gun}</h2>`;
            
        saatler.forEach(saat => {
            const isim = gunluk[saat] || "BOŞ";
            html += `<div class="flex justify-between items-center bg-[#050b18] p-3 rounded-lg border border-slate-800 mb-2">
                <div>
                    <span class="text-[10px] text-orange-500 font-bold block">${saat}</span>
                    <span class="text-sm font-bold text-white">${isim}</span>
                </div>
                <div class="flex gap-1">
                    ${currentUser ? `<button onclick="sahneAl('${gun}','${saat}')" class="text-[10px] bg-emerald-600 px-2 py-1 rounded font-bold text-white">AL</button>` : ""}
                    ${currentUser && getSahneIsmi(currentUser) === isim ? `<button onclick="slotBiral('${gun}','${saat}')" class="text-[10px] bg-rose-900 px-2 py-1 rounded font-bold text-rose-200">İPTAL</button>` : ""}
                </div>
            </div>`;
        });
        html += `</div>`;
        akis.innerHTML += html;
    });
    PerformansPanosunuCiz();
}

function PerformansPanosunuCiz() {
    const pano = document.getElementById("performans-panosu-alani");
    if (!pano) return;
    let skorlar = {};
    Object.keys(mevcutSlotlar).forEach(g => {
        Object.keys(mevcutSlotlar[g] || {}).forEach(s => {
            let isim = mevcutSlotlar[g][s];
            if (isim !== "BOŞ" && isim !== "") skorlar[isim] = (skorlar[isim] || 0) + 3;
        });
    });
    const s = Object.entries(skorlar).sort((a, b) => b[1] - a[1]);
    pano.innerHTML = `<div class="border-t border-slate-800 pt-6 mt-6">
        <h3 class="text-white font-black mb-4">🏆 AYLIK PERFORMANS TABLOSU</h3>
        <div class="grid grid-cols-2 gap-3">${s.map(([n, h]) => `<div class="bg-[#0b1329] p-3 rounded-lg border border-slate-800 text-center"><span class="block text-white font-bold">${n}</span><span class="text-emerald-400 text-xs">${h} SAAT</span></div>`).join('')}</div>
    </div>`;
}

function slotBiral(g, s) {
    db.ref(`haftalik_slotlar/${g}/${s}`).set("BOŞ");
    db.ref("notlar").push({ isim: getSahneIsmi(currentUser), mesaj: `${g} ${s} iptal edildi.` });
}

function sahneAl(g, s) {
    db.ref(`haftalik_slotlar/${g}/${s}`).set(getSahneIsmi(currentUser));
    db.ref("notlar").push({ isim: getSahneIsmi(currentUser), mesaj: `${g} ${s} alındı.` });
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani");
        if (!alani) return; alani.innerHTML = "";
        const t = snapshot.val() || {};
        Object.keys(t).forEach(k => {
            const r = t[k];
            if(r.d === "beklemede" && r.aI === getSahneIsmi(currentUser)) {
                alani.innerHTML += `<div class="bg-cyan-950 p-2 rounded text-white text-xs">Takas isteği: ${r.g} senin saatini istiyor. <button onclick="takasOnayla('${k}')" class="text-emerald-400">Onayla</button></div>`;
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
        const p = document.getElementById("musaidlik-notlari");
        if (!p) return; p.innerHTML = "";
        const v = snapshot.val() || {};
        Object.keys(v).reverse().slice(0,10).forEach(key => {
            const i = v[key];
            p.innerHTML += `<div class="bg-[#050b18] p-2 text-slate-300 text-xs border border-slate-800">${i.isim}: ${i.mesaj}</div>`;
        });
    });
    db.ref("muzisyenler").on("value", snapshot => {
        const l = document.getElementById("muzisyen-listesi-alan");
        if (!l) return; l.innerHTML = "";
        const v = snapshot.val() || {};
        Object.keys(v).forEach(k => {
            l.innerHTML += `<div class="bg-[#050b18] p-2 text-slate-300 text-xs border border-slate-800 uppercase">${v[k].name}</div>`;
        });
    });
}

function CanliSahneVeGeriSayimMotoru() {
    const el = document.getElementById("su-an-sahnede-kim-var");
    if (!el) return;
    const s = new Date(); const gTr = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const g = gTr[s.getDay()]; const h = s.getHours();
    let sl = h >= 21 ? "21.00-24.00" : h >= 18 ? "18.00-21.00" : h >= 15 ? "15.00-18.00" : h >= 12 ? "12.00-15.00" : null;
    el.innerText = (sl && mevcutSlotlar[g] && mevcutSlotlar[g][sl] !== "BOŞ") ? mevcutSlotlar[g][sl] : "MEYDAN BOŞ";
}

async function HavaDurumuGetir() {
    try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.0428&longitude=29.0074&current_weather=true");
        if (res.ok) {
            const data = await res.json();
            document.getElementById("havadurumu-derece").innerText = `Hava: ${Math.round(data.current_weather.temperature)}°C`;
        }
    } catch (e) {}
}

function googleGirisYap() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function cikisYap() { auth.signOut(); }
