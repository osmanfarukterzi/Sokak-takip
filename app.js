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

// İSİM EŞLEŞTİRME - Burayı istediğin kadar uzatabilirsin, satır sayısı arttıkça sistem daha akıllı hale gelir.
const isimEslestirme = {
    "osmanfarukterzi@gmail.com": "Sirayet",
    "nebi@ornek.com": "Nebi",
    "berkan@ornek.com": "Berkan",
    "doga@ornek.com": "Doğa",
    "rasit@ornek.com": "Raşit",
    "samet@ornek.com": "Samet",
    "ismet@ornek.com": "İsmet",
    "ugur@ornek.com": "Uğur",
    "yigit@ornek.com": "Yiğit",
    "faruk@ornek.com": "Faruk",
    "enes@ornek.com": "Enes",
    "mami@ornek.com": "Mami"
};

function getSahneIsmi(user) {
    if (!user || !user.email) return "Misafir";
    return isimEslestirme[user.email] || user.displayName.split(' ')[0];
}

document.addEventListener("DOMContentLoaded", () => {
    // Performans panosu ve takvim alanı kontrolü
    const anaKapsayici = document.getElementById("program-akisi")?.parentElement;
    if(anaKapsayici && !document.getElementById("performans-panosu-alani")) {
        const yeniDiv = document.createElement("div");
        yeniDiv.id = "performans-panosu-alani";
        anaKapsayici.appendChild(yeniDiv);
    }

    db.ref("haftalik_slotlar").on("value", snapshot => {
        mevcutSlotlar = snapshot.val();
        ProgramiCiz(mevcutSlotlar);
    });

    CanliVerileriDinle();
    CanliTakaslariDinle();
    setTimeout(HavaDurumuGetir, 500);
    setInterval(CanliSahneVeGeriSayimMotoru, 1000);

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            const authArea = document.getElementById("auth-status-area");
            if(authArea) authArea.innerHTML = `<div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30"><span class="text-xs font-bold text-emerald-400">${getSahneIsmi(user)}</span><button onclick="cikisYap()" class="text-[10px] text-rose-400 ml-2">Çıkış</button></div>`;
            db.ref("muzisyenler/" + user.uid).set({ name: getSahneIsmi(user), picture: user.photoURL, email: user.email });
        } else {
            const authArea = document.getElementById("auth-status-area");
            if(authArea) authArea.innerHTML = `<button onclick="googleGirisYap()" class="bg-white text-slate-900 font-bold py-2 px-3 rounded-xl text-xs">Google ile Giriş Yap</button>`;
        }
    });
});

function ProgramiCiz(veri) {
    const baslikEl = document.getElementById("dinamik-tarih-basligi");
    if (baslikEl) baslikEl.innerText = "29 HAZİRAN - 5 TEMMUZ SLOT TAKVİMİ";
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi || !veri) return;
    programAkisi.innerHTML = "";
    
    ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"].forEach(gun => {
        let slotlarHtml = "";
        ["12.00-15.00", "15.00-18.00", "18.00-21.00", "21.00-24.00"].forEach(saat => {
            const isim = veri[gun] ? (veri[gun][saat] || "BOŞ") : "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            const isOwner = currentUser && getSahneIsmi(currentUser) === isim;
            
            slotlarHtml += `
            <div class="p-3.5 rounded-xl flex justify-between items-center ${isBoş ? 'bg-amber-500/5 border border-dashed border-amber-500/30' : (isOwner ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-[#050b18] border border-slate-800/80')}">
                <div><span class="text-[10px] font-bold text-orange-500">${saat}</span><span class="font-extrabold text-sm block ${isBoş ? 'text-amber-500/50' : 'text-white'}">${isBoş ? 'Müsait' : isim}</span></div>
                <div class="shrink-0">
                    ${isBoş && currentUser ? `<button onclick="sahneAl('${gun}','${saat}')" class="text-[10px] bg-amber-500 px-2 py-0.5 rounded font-black cursor-pointer">Sahne Al</button>` : ""}
                    ${isOwner ? `<button onclick="slotBiral('${gun}','${saat}')" class="text-[9px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded cursor-pointer">İptal Et</button>` : ""}
                    ${!isBoş && !isOwner && currentUser ? `<button onclick="takasPenceresiAc('${gun}','${saat}','${isim}')" class="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded cursor-pointer">Takas</button>` : ""}
                </div>
            </div>`;
        });
        programAkisi.innerHTML += `<div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 min-w-[340px] flex-shrink-0"><div class="font-bold text-sm text-white mb-3">${gun}</div><div class="space-y-3">${slotlarHtml}</div></div>`;
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
    if(!confirm("Bu slotu boşaltmak istediğine emin misin?")) return;
    db.ref(`haftalik_slotlar/${g}/${s}`).set("BOŞ");
    db.ref("notlar").push({ isim: getSahneIsmi(currentUser), mesaj: `${g} ${s} slotunu boşalttı.` });
}

function sahneAl(g, s) {
    if(!confirm("Bu slotu rezerve etmek istiyor musun?")) return;
    db.ref(`haftalik_slotlar/${g}/${s}`).set(getSahneIsmi(currentUser));
    db.ref("notlar").push({ isim: getSahneIsmi(currentUser), mesaj: `${g} ${s} slotunu aldı.` });
}

function takasPenceresiAc(kG, kS, kM) {
    let benimSlotlarim = [];
    Object.keys(mevcutSlotlar).forEach(g => {
        Object.keys(mevcutSlotlar[g]).forEach(s => {
            if(mevcutSlotlar[g][s] === getSahneIsmi(currentUser)) benimSlotlarim.push({ gun: g, saat: s });
        });
    });
    if(benimSlotlarim.length === 0) { alert("Takas edebileceğiniz aktif slotunuz bulunmuyor!"); return; }
    
    let secim = prompt("Hangi slotunu vermek istersin?\n" + benimSlotlarim.map((x,i) => (i+1)+") "+x.gun+" "+x.saat).join("\n"));
    if(secim && benimSlotlarim[parseInt(secim)-1]) {
        let b = benimSlotlarim[parseInt(secim)-1];
        db.ref("takas_talepleri").push().set({ g: getSahneIsmi(currentUser), gG: b.gun, gS: b.saat, aI: kM, aG: kG, aS: kS, d: "beklemede" });
        alert("Takas talebi gönderildi!");
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
                alani.innerHTML += `<div class="bg-cyan-950 p-3 rounded-xl border border-cyan-500 mb-2 text-white text-xs">Takas: <b>${req.g}</b> senin <b>${req.aG} ${req.aS}</b> saatini istiyor. <button onclick="takasOnayla('${k}')" class="bg-emerald-500 px-2 py-0.5 rounded ml-2">Kabul Et</button></div>`;
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
        db.ref("notlar").push({ isim: "SİSTEM", mesaj: `${r.g} ile ${r.aI} takas yaptı.` });
    });
}

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) return;
        Object.keys(veriler).reverse().slice(0,8).forEach(key => {
            const item = veriler[key];
            pano.innerHTML += `<div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800 mb-2"><span class="text-orange-400 font-bold text-xs">${item.isim}:</span> <span class="text-slate-300 text-xs">${item.mesaj}</span></div>`;
        });
    });
    db.ref("muzisyenler").on("value", snapshot => {
        const liste = document.getElementById("muzisyen-listesi-alan");
        if (!liste) return; liste.innerHTML = "";
        const v = snapshot.val();
        if(!v) return;
        Object.keys(v).forEach(k => {
            liste.innerHTML += `<div class="flex items-center gap-2 bg-[#050b18] p-2 rounded-xl border border-slate-800 mb-1"><span class="text-xs font-bold text-slate-300 uppercase">${v[k].name}</span></div>`;
        });
    });
}

function CanliSahneVeGeriSayimMotoru() {
    const sahneYazi = document.getElementById("su-an-sahnede-kim-var");
    if (!sahneYazi) return;
    const s = new Date(); const gTr = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const g = gTr[s.getDay()]; const h = s.getHours();
    let slot = h >= 21 ? "21.00-24.00" : h >= 18 ? "18.00-21.00" : h >= 15 ? "15.00-18.00" : h >= 12 ? "12.00-15.00" : null;
    sahneYazi.innerText = (slot && mevcutSlotlar[g] && mevcutSlotlar[g][slot] !== "BOŞ") ? mevcutSlotlar[g][slot] : "MEYDANDA KİMSE YOK";
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
