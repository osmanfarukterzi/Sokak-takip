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
}
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let mevcutSlotlar = {}; 
const BENIM_SABIT_ISGIM = "Sirayet"; 

function isimTemizle(isim) {
    if(!isim) return "";
    return isim.toString().trim().toLowerCase()
        .replace(/\s+/g, '')
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ç/g, 'c')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o');
}

function getAktifIsim(user) {
    if (!user || !user.email) return "";
    
    // E-postayı her ihtimale karşı küçük harfe çevirip boşluklarını temizliyoruz
    const email = user.email.toLowerCase().trim();
    
    // E-posta ve Müzisyen eşleştirme tablosu
    const muzisyenler = {
        "osmanfarukterzi@gmail.com": "Sirayet",
        "mamiiibennn@gmail.com": "Mami",
        "berkhan54d@gmail.com": "Berkhan",
        "ugurpoyrazz93@gmail.com": "Uğur",
        "y.kuloglu53@gmail.com": "Yiğit",
        "faruk.kayya@gmail.com": "Farnefes",
        "ismtadymn0667@gmail.com": "İsmet",
        "infoenesozdmr@gmail.com": "Enes",
        "cannebigs@gmail.com": "Nebi",
        "dogadenizyilmaz@gmail.com": "Doğa",
        "harbidensametofficial@gmail.com": "Samet",
        "orsun52@gmail.com": "Raşit"
    };

    // Eğer e-posta listede varsa sahne adını döndür, yoksa mailin ilk kısmını göster
    return muzisyenler[email] || email.split('@')[0];
}

function benimSlotumMu(slotIsmi, kullanıcıIsmi) {
    let temizSlot = isimTemizle(slotIsmi);
    let temizKullanici = isimTemizle(kullanıcıIsmi);
    
    if (temizSlot.includes("farnefes")) {
        return false; 
    }
    
    if (temizKullanici === "sirayet" || temizKullanici === "osman" || temizKullanici === "faruk") {
        if (temizSlot === "faruk") return true;
        return temizSlot.includes("sirayet") || temizSlot.includes("osman");
    }
    
    return temizSlot === temizKullanici;
}

const varsayilanProgram = {
    "tarih_basligi": "29 Haziran - 5 Temmuz",
    "Pazartesi": { "12:00-15:00": "Nebi", "15:00-18:00": "Sirayet", "18:00-21:00": "Berkhan", "21:00-24:00": "Uğur" },
    "Salı":      { "12:00-15:00": "Doğa", "15:00-18:00": "Raşit", "18:00-21:00": "Samet", "21:00-24:00": "İsmet" },
    "Çarşamba":  { "12:00-15:00": "Uğur", "15:00-18:00": "Berkhan", "18:00-21:00": "Nebi", "21:00-24:00": "Samet" },
    "Perşembe":  { "12:00-15:00": "Mami", "15:00-18:00": "İsmet", "18:00-21:00": "Raşit", "21:00-24:00": "Sirayet" },
    "Cuma":      { "12:00-15:00": "Doğa", "15:00-18:00": "Nebi", "18:00-21:00": "Raşit", "21:00-24:00": "İsmet" },
    "Cumartesi": { "12:00-15:00": "Mami", "15:00-18:00": "Berkhan", "18:00-21:00": "Uğur", "21:00-24:00": "Sirayet" },
    "Pazar":     { "12:00-15:00": "Yiğit", "15:00-18:00": "Farnefes", "18:00-21:00": "Samet", "21:00-24:00": "Enes" }
};

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("ozel-takas-modal")) {
        const modalDiv = document.createElement("div");
        modalDiv.id = "ozel-takas-modal";
        modalDiv.className = "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center hidden p-4";
        modalDiv.innerHTML = `
            <div class="bg-[#0b1329] border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 class="text-white font-black flex items-center gap-2 text-xs tracking-wider">
                        <i class="fa-solid fa-right-left text-cyan-400"></i> TAKAS EDİLECEK SLOTUNUZU SEÇİN
                    </h3>
                    <button onclick="document.getElementById('ozel-takas-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition">✕ Kapat</button>
                </div>
                <p id="takas-modal-aciklama" class="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800"></p>
                <div class="space-y-2 max-h-60 overflow-y-auto pr-1" id="takas-edilebilir-slotlar"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }

    window.googleGirisYap = googleGirisYap;
    window.cikisYap = cikisYap;
    window.sahneAl = sahneAl;
    window.slotBiral = slotBiral;
    window.takasPenceresiAc = takasPenceresiAc;
    window.takasTalebiGonder = takasTalebiGonder;
    window.takasOnayla = takasOnayla;
    window.takasReddet = takasReddet;
    window.takasIptalEt = takasIptalEt;
    window.notEkle = notEkle;

    VeritabaniniKontrolEtVeDinle();
    CanliVerileriDinle();
    CanliTakaslariDinle();
    CanliMuzisyenleriDinle();
    setTimeout(HavaDurumuGetir, 500);
    setInterval(CanliSahneVeGeriSayimMotoru, 1000);

    auth.onAuthStateChanged(user => {
        const authArea = document.getElementById("auth-status-area");
        const notYazanInput = document.getElementById("not-yazan");
        
        if (user) {
            currentUser = user;
            let aktifIsim = getAktifIsim(user);
            if(notYazanInput) notYazanInput.value = aktifIsim;
            if(authArea) {
                authArea.innerHTML = `
                    <div class="flex items-center gap-2 bg-[#050b18] py-1.5 px-3 rounded-xl border border-emerald-500/30 shadow-sm">
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
        
        // BAŞLIK İÇİN KESİN ÇÖZÜM: 
        // Veritabanında ne olursa olsun veya boşsa, başlığı biz zorla buraya yazıyoruz
        const GUNCEL_BASLIK = "29 Haziran - 5 Temmuz";
        
        if (!veriler || Object.keys(veriler).length === 0) {
            let baslangic = { ...varsayilanProgram };
            baslangic.tarih_basligi = GUNCEL_BASLIK;
            db.ref("haftalik_slotlar").set(baslangic);
            veriler = baslangic;
        } else {
            // Var olan veriyi bozma ama başlığı zorla güncelle
            veriler.tarih_basligi = GUNCEL_BASLIK;
        }

            mevcutSlotlar = veriler;
            ProgramiCiz(mevcutSlotlar);
            PerformansPanosunuCiz(); 
            CanliSahneVeGeriSayimMotoru();
            SohbetOdasiDinle();
    });
}

window.sahneAl = function(gun, saat) {
    if (!currentUser) {
        alert("Slot alabilmek için önce giriş yapmalısın!");
        return;
    }
    
    const benimIsmim = getAktifIsim(currentUser);
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    let toplamSlotSayim = 0;

    // 1. ADIM: Mevcut programı tara ve bu müzisyenin kaç slotu var say
    gunler.forEach(g => {
        if (mevcutSlotlar && mevcutSlotlar[g]) {
            Object.keys(mevcutSlotlar[g]).forEach(s => {
                if (mevcutSlotlar[g][s] === benimIsmim) {
                    toplamSlotSayim++;
                }
            });
        }
    });

    // 2. ADIM: Kural Kontrolü (Maksimum 2 Slot)
    if (toplamSlotSayim >= 2) {
        alert(`Hop ${benimIsmim}! Meydan kuralları gereği bir kişi haftada en fazla 2 slot alabilir. Sen zaten 2 slotunu doldurmuşsun!`);
        return; // İşlemi iptal et, veritabanına yazdırma
    }

    // 3. ADIM: Eğer kuralı ihlal etmiyorsa slotu rezerve et
    db.ref(`haftalik_slotlar/${gun}/${saat}`).set(benimIsmim)
        .then(() => {
            // İsteğe bağlı: Panoya otomatik bildirim düşür
            const bildirimMetni = `✅ YENİ SLOT: ${benimIsmim}, ${gun} ${saat} slotunu tek tıkla rezerve etti.`;
            // Eğer bildirim panon Firebase'e bağlıysa buraya push kodu ekleyebilirsin
            console.log("Slot başarıyla alındı.");
        })
        .catch((error) => {
            console.error("Slot alınırken hata oluştu: ", error);
        });
};

function slotBiral(gun, saat) {
    if (!currentUser) return;
    let isim = getAktifIsim(currentUser);

    db.ref(`haftalik_slotlar/${gun}/${saat}`).set("BOŞ").then(() => {
        db.ref("notlar").push({
            isim: "📢 BİLDİRİM",
            mesaj: `${isim}, ${gun} ${saat} slotunu boşalttı. Slot şu an rezerve edilebilir!`
        });
    }).catch(err => alert("Hata: " + err.message));
}

function takasPenceresiAc(karsiGun, karsiSaat, karsiMuzisyen) {
    if(!currentUser) { alert("Takas yapabilmek için giriş yapmalısınız."); return; }
    let benimIsmim = getAktifIsim(currentUser);
    let benimSlotlarim = [];

    Object.keys(mevcutSlotlar).forEach(gun => {
        if(mevcutSlotlar[gun] && gun !== "tarih_basligi") {
            Object.keys(mevcutSlotlar[gun]).forEach(saat => {
                let slotIsmi = mevcutSlotlar[gun][saat] || "";
                if(slotIsmi !== "" && slotIsmi !== "BOŞ") {
                    if (benimSlotumMu(slotIsmi, benimIsmim)) {
                        benimSlotlarim.push({ gun: gun, saat: saat });
                    }
                }
            });
        }
    });

    if(benimSlotlarim.length === 0) { 
        alert(`Şu anda takvimde senin adına (${benimIsmim}) ait aktif bir slot bulamadık. Önce boş bir slot almalısın.`); 
        return; 
    }
    
    const modal = document.getElementById("ozel-takas-modal");
    const modalAciklama = document.getElementById("takas-modal-aciklama");
    const slotlarAlani = document.getElementById("takas-edilebilir-slotlar");
    
    modalAciklama.innerHTML = `<span class="text-cyan-400 font-bold">${karsiMuzisyen}</span> müzisyeninin <span class="text-amber-400 font-bold">${karsiGun} (${karsiSaat})</span> slotunu almak istiyorsun. Karşılığında vermek istediğin kendi slotuna aşağıdan **DİREKT TIKLA**:`;
    slotlarAlani.innerHTML = "";

    benimSlotlarim.forEach(item => {
        slotlarAlani.innerHTML += `
            <button onclick="window.takasTalebiGonder('${item.gun}', '${item.saat}', '${karsiMuzisyen}', '${karsiGun}', '${karsiSaat}')" 
                class="w-full text-left bg-[#050b18] hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-xl text-xs text-white transition font-semibold flex justify-between items-center cursor-pointer group shadow-sm">
                <span class="group-hover:text-cyan-400 transition">${item.gun} — ${item.saat}</span>
                <span class="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">Seç ve Gönder</span>
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
    }).then(() => {
        alert("Takas talebiniz karşı tarafa anında iletildi ve panoya eklendi!");
    }).catch(err => alert("Talep gönderilemedi: " + err.message));
}

function takasIptalEt(talepKey) {
    if(!confirm("Gönderdiğiniz bu takas teklifini geri çekmek istediğinize emin misiniz?")) return;
    db.ref(`takas_talepleri/${talepKey}`).remove().then(() => {
        alert("Takas teklifiniz başarıyla iptal edildi.");
    });
}

function CanliTakaslariDinle() {
    db.ref("takas_talepleri").on("value", snapshot => {
        const alani = document.getElementById("canli-takas-talepleri-alani");
        if (!alani) return; 
        alani.innerHTML = "";
        
        const t = snapshot.val();
        if(!t) { alani.innerHTML = `<p class="text-slate-500 italic text-center py-4 text-xs">Aktif takas teklifi yok.</p>`; return; }
        
        let talepVarmi = false;
        let benimIsim = currentUser ? getAktifIsim(currentUser) : "";

        Object.keys(t).forEach(key => {
            const req = t[key];
            if(req.durum !== "beklemede") return;
            talepVarmi = true;

            const isImTarget = benimSlotumMu(req.aliciIsim, benimIsim);
            const isImSender = req.gonderenUid === (currentUser ? currentUser.uid : null) || benimSlotumMu(req.gonderenIsim, benimIsim);

            if(isImTarget) {
                alani.innerHTML += `
                    <div class="bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/40 p-4 rounded-xl space-y-3 shadow-lg">
                        <p class="text-xs text-slate-200 leading-relaxed">
                            <span class="text-cyan-400 font-extrabold">${req.gonderenIsim}</span>, senin <span class="text-amber-400 font-bold">${req.aliciGun} ${req.aliciSaat}</span> slotunu, kendi <span class="text-emerald-400 font-bold">${req.gonderenGun} ${req.gonderenSaat}</span> slotuyla değiştirmek istiyor.
                        </p>
                        <div class="flex gap-2 pt-1">
                            <button onclick="window.takasOnayla('${key}')" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg transition text-[10px] cursor-pointer shadow-md">Kabul Et</button>
                            <button onclick="window.takasReddet('${key}')" class="flex-1 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-slate-950 font-bold py-1.5 rounded-lg transition text-[10px] cursor-pointer border border-rose-500/20">Reddet</button>
                        </div>
                    </div>`;
            } else {
                let iptalButonHtml = "";
                if (isImSender) {
                    iptalButonHtml = `<button onclick="window.takasIptalEt('${key}')" class="text-[9px] bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 font-bold px-2 py-1 rounded border border-rose-500/20 transition cursor-pointer ml-2">İptal Et</button>`;
                }

                alani.innerHTML += `
                    <div class="bg-[#050b18] p-3 rounded-xl border border-slate-800 text-slate-400 text-[11px] mb-2 shadow-sm flex items-center justify-between">
                        <div>
                            <span class="text-slate-300 font-bold">${req.gonderenIsim}</span> ➔ <span class="text-slate-300 font-bold">${req.aliciIsim}</span>
                            <div class="text-[10px] text-slate-500 mt-0.5">${req.gonderenGun} ⇄ ${req.aliciGun}</div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            ${iptalButonHtml ? iptalButonHtml : `<span class="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1"><i class="fa-solid fa-spinner animate-spin"></i> Bekliyor</span>`}
                        </div>
                    </div>`;
            }
        });

        if(!talepVarmi) { alani.innerHTML = `<p class="text-slate-500 italic text-center py-4 text-xs">Aktif takas teklifi yok.</p>`; }
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
            alert("Takas işlemi başarıyla onaylandı ve takvim güncellendi!");
        });
    });
}

function takasReddet(talepKey) {
    db.ref(`takas_talepleri/${talepKey}/durum`).set("reddedildi").then(() => {
        alert("Takas teklifi reddedildi.");
    });
}

function ProgramiCiz(veri) {
    const baslikEl = document.getElementById("dinamik-tarih-basligi");
    
    // Güvenlik: Veriden başlığı al, yoksa "MEYDAN SLOT TAKVİMİ" yaz
    let baslikMetni = (veri && veri.tarih_basligi && veri.tarih_basligi.trim() !== "") 
        ? veri.tarih_basligi 
        : "MEYDAN SLOT TAKVİMİ";
    
    if (baslikEl) {
        baslikEl.innerText = baslikMetni;
    }

    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    const aktifVeri = (veri && Object.keys(veri).length > 0) ? veri : varsayilanProgram;
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    programAkisi.innerHTML = "";

    let benimIsmim = currentUser ? getAktifIsim(currentUser) : "";

    gunler.forEach(gun => {
        let slotlarHtml = "";
        const saatler = ["12:00-15:00", "15:00-18:00", "18:00-21:00", "21:00-24:00"];

        saatler.forEach(saat => {
            // Veri kontrolü: aktifVeri[gun] var mı bak, yoksa boş kabul et
            const isim = (aktifVeri[gun] && aktifVeri[gun][saat]) ? aktifVeri[gun][saat] : "BOŞ";
            const isBoş = isim === "BOŞ" || isim === "";
            
            const isOwner = currentUser && !isBoş && benimSlotumMu(isim, benimIsmim);
            const isHaftaIciSabit = ["Pazartesi", "Salı", "Çarşamba", "Perşembe"].includes(gun) && saat === "12:00-15:00";
            const isHaftaSonuIlk = ["Cuma", "Cumartesi", "Pazar"].includes(gun) && saat === "12:00-15:00";
            
            let kartStili = "bg-slate-900 border border-slate-800"; 
            let etiketHtml = "";

            if (isHaftaIciSabit) {
                kartStili = "bg-amber-600/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)]"; 
                etiketHtml = `<span class="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><i class="fa-solid fa-lock text-[8px]"></i> SABİT</span>`;
            } else if (isHaftaSonuIlk) {
                kartStili = "bg-purple-500/10 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.05)]"; 
                etiketHtml = `<span class="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1"><i class="fa-solid fa-star text-[8px]"></i> HAFTA SONU</span>`;
            } else {
                etiketHtml = `<span class="text-[9px] font-bold text-slate-500 bg-slate-500/5 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">DÖNGÜ</span>`;
            }

            if (isBoş) {
                kartStili = "bg-amber-500/5 border border-dashed border-amber-500/30";
                etiketHtml = currentUser 
                    ? `<button onclick="window.sahneAl('${gun}', '${saat}')" class="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1 px-2.5 rounded-lg transition cursor-pointer shadow-sm">Sahne Al</button>`
                    : `<span class="text-[9px] text-amber-500/40 italic">Boş Slot</span>`;
            } else if (isOwner) {
                kartStili = "bg-emerald-500/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.07)]"; 
                etiketHtml = `<button onclick="window.slotBiral('${gun}', '${saat}')" class="text-[9px] bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 px-2 py-1 rounded-lg border border-rose-500/20 transition cursor-pointer font-bold">İptal Et</button>`;
            } else if (currentUser) {
                etiketHtml = `<button onclick="window.takasPenceresiAc('${gun}', '${saat}', '${isim}')" class="text-[9px] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 px-2 py-1 rounded-lg border border-cyan-500/20 transition cursor-pointer font-bold">Takas</button>`;
            }

            slotlarHtml += `
                <div class="p-3.5 rounded-xl flex justify-between items-center transition-all ${kartStili}">
                    <div>
                        <span class="text-[10px] font-bold text-slate-500 block mb-0.5">${saat}</span>
                        <span class="font-extrabold text-sm ${isBoş ? 'text-amber-500/40 italic' : 'text-white'}">${isBoş ? 'Müsait' : isim}</span>
                    </div>
                    <div class="shrink-0">${etiketHtml}</div>
                </div>`;
        });

        programAkisi.innerHTML += `
            <div class="bg-[#0b1329] border border-slate-800 rounded-2xl p-4 shadow-xl min-w-[320px] snap-start flex-shrink-0">
                <div class="border-b border-slate-800 pb-2 mb-3 flex justify-between items-center">
                    <span class="font-bold text-sm text-white flex items-center gap-2">
                        <i class="fa-regular fa-calendar text-orange-500"></i> ${gun}
                    </span>
                </div>
                <div class="space-y-3">${slotlarHtml}</div>
            </div>`;
    });
}

function PerformansPanosunuCiz() {
    const pano = document.getElementById("performans-panosu-alani");
    if (!pano) return;
    
    let skorlar = {};
    Object.keys(mevcutSlotlar || {}).forEach(g => {
        if(mevcutSlotlar[g] && g !== "tarih_basligi") {
            Object.keys(mevcutSlotlar[g]).forEach(s => {
                let isim = mevcutSlotlar[g][s];
                if (isim !== "BOŞ" && isim !== "") skorlar[isim] = (skorlar[isim] || 0) + 3;
            });
        }
    });
    const s = Object.entries(skorlar).sort((a, b) => b[1] - a[1]);
    
    pano.innerHTML = `
        <div class="border-t border-slate-800 pt-6 mt-6">
            <h3 class="text-white font-black mb-4 flex items-center gap-2 text-xs tracking-wider">
                <i class="fa-solid fa-trophy text-amber-500"></i> HAFTALIK PERFORMANS TABLOSU
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${s.map(([n, h]) => `
                    <div class="flex justify-between items-center bg-[#0b1329] p-3 rounded-xl border border-slate-800">
                        <span class="font-bold text-slate-300 text-xs">${n}</span>
                        <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">${h} SAAT</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function CanliMuzisyenleriDinle() {
    db.ref("muzisyenler").on("value", snapshot => {
        const listeAlani = document.getElementById("kayitli-muzisyenler-listesi");
        if (!listeAlani) return;
        listeAlani.innerHTML = "";
        
        const muzisyenler = snapshot.val();
        if (!muzisyenler) {
            listeAlani.innerHTML = `<p class="text-slate-500 italic text-xs p-2">Kayıtlı müzisyen yok.</p>`;
            return;
        }

        Object.keys(muzisyenler).forEach(key => {
            const m = muzisyenler[key];
            const pResim = m.picture ? m.picture : "https://via.placeholder.com/150";
            listeAlani.innerHTML += `
                <div class="flex items-center gap-2 bg-[#050b18] p-2 rounded-xl border border-slate-800/60 shadow-sm">
                    <img src="${pResim}" class="w-7 h-7 rounded-full border border-slate-700" referrerpolicy="no-referrer">
                    <div class="truncate">
                        <span class="text-xs font-bold text-slate-200 block truncate">${m.name || 'Müzisyen'}</span>
                    </div>
                </div>
            `;
        });
    });
}

function CanliSahneVeGeriSayimMotoru() {
    const sahneYazi = document.getElementById("su-an-sahnede-kim-var");
    const sayacYazi = document.getElementById("canli-geri-sayim");
    const sayacEtiket = document.getElementById("sayac-etiket");
    const canliIsik = document.getElementById("canli-isik");

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
            sahneYazi.innerText = "MEYDAN BOŞ / MÜSAİT";
            sahneYazi.className = "text-xl font-black text-emerald-400 tracking-wide";
            if(canliIsik) canliIsik.className = "w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping";
        } else {
            sahneYazi.innerText = kiminSahnep;
            sahneYazi.className = "text-xl font-black text-white tracking-wide";
            if(canliIsik) canliIsik.className = "w-2.5 h-2.5 bg-red-500 rounded-full animate-ping";
        }

        const toplamBitisSaniye = bitisSaati * 3600;
        let kalanSaniye = toplamBitisSaniye - toplamGecenSaniye;

        const h = Math.floor(kalanSaniye / 3600).toString().padStart(2, '0');
        const m = Math.floor((kalanSaniye % 3600) / 60).toString().padStart(2, '0');
        const s = (kalanSaniye % 60).toString().padStart(2, '0');

        sayacYazi.innerText = `${h}:${m}:${s}`;
        if(sayacEtiket) sayacEtiket.innerText = "Slotun Bitmesine Kalan";
    } else {
        sahneYazi.innerText = "MEYDANDA ŞU AN KİMSE YOK";
        sahneYazi.className = "text-xl font-black text-slate-500 tracking-wide";
        if(canliIsik) canliIsik.className = "w-2.5 h-2.5 bg-slate-600 rounded-full";

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

function CanliVerileriDinle() {
    db.ref("notlar").on("value", snapshot => {
        const pano = document.getElementById("musaidlik-notlari");
        if (!pano) return; pano.innerHTML = "";
        const veriler = snapshot.val();
        if (!veriler) { pano.innerHTML = `<p class="text-slate-500 italic text-center py-4 text-xs">Henüz bildirim yok.</p>`; return; }
        Object.keys(veriler).reverse().forEach(key => {
            const item = veriler[key];
            pano.innerHTML += `
                <div class="bg-[#050b18] p-2.5 rounded-xl border border-slate-800 mb-2">
                    <span class="font-bold text-orange-400 block text-[11px] mb-0.5">${item.isim}:</span>
                    <p class="text-slate-300 text-xs">${item.mesaj}</p>
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

// 1. SOHBET ODASI MOTORU: Mesajları Canlı Dinleme
function SohbetOdasiDinle() {
    db.ref("meydan_chat").limitToLast(30).on("value", snapshot => {
        const sohbetKutusu = document.getElementById("sohbet-mesajlari");
        if (!sohbetKutusu) return;
        
        sohbetKutusu.innerHTML = "";
        const veriler = snapshot.val();
        
        if (!veriler) {
            sohbetKutusu.innerHTML = `<div class="text-slate-600 text-xs italic text-center pt-8">Henüz mesaj yok. İlk mesajı sen yaz!</div>`;
            return;
        }

        Object.keys(veriler).forEach(key => {
            const m = veriler[key];
            const isMe = currentUser && m.isim === getAktifIsim(currentUser);
            
            // Kimin yazdığına göre sağa veya sola yasla
            sohbetKutusu.innerHTML += `
                <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    <span class="text-[10px] text-slate-500 font-bold mb-0.5 px-1">${m.isim}</span>
                    <div class="max-w-[85%] px-3 py-2 rounded-2xl text-xs ${isMe ? 'bg-rose-600/20 border border-rose-500/30 text-rose-200 rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'}">
                        ${m.mesaj}
                    </div>
                </div>`;
        });
        
        // Sohbeti otomatik en aşağı kaydır
        sohbetKutusu.scrollTop = sohbetKutusu.scrollHeight;
    });
}

function MeydanaMesajGonder() {
    if (!currentUser) {
        alert("Mesaj yazmak için giriş yapmalısın Osman!");
        return;
    }
    const girdi = document.getElementById("sohbet-girdi");
    if (!girdi || girdi.value.trim() === "") return;

    const yeniMesaj = {
        isim: getAktifIsim(currentUser),
        mesaj: girdi.value.trim(),
        tarih: Date.now()
    };

    db.ref("meydan_chat").push(yeniMesaj);
    girdi.value = ""; // Kutuyu temizle
}

document.getElementById("sohbet-girdi")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") MeydanaMesajGonder();
});

function PerformansPanosunuCiz() {
    const slotKutusu = document.getElementById("haftalik-slot-sayilari");
    const skorKutusu = document.getElementById("skor-tablosu");
    if (!slotKutusu || !skorKutusu || !mevcutSlotlar) return;

    let istatistik = {};
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

    gunler.forEach(gun => {
        if (mevcutSlotlar[gun]) {
            Object.keys(mevcutSlotlar[gun]).forEach(saat => {
                const isim = mevcutSlotlar[gun][saat];
                if (isim && isim !== "BOŞ" && isim !== "") {
                    if (!istatistik[isim]) istatistik[isim] = 0;
                    istatistik[isim]++;
                }
            });
        }
    });

    let siraliListe = Object.keys(istatistik).map(isim => {
        return { isim: isim, slotAdet: istatistik[isim], toplamSaat: istatistik[isim] * 3 };
    }).sort((a, b) => b.slotAdet - a.slotAdet);

    slotKutusu.innerHTML = "";
    skorKutusu.innerHTML = "";

    if (siraliListe.length === 0) {
        const bosUyarisi = `<div class="text-slate-600 text-xs italic text-center pt-8">Takvimde henüz dolu slot yok.</div>`;
        slotKutusu.innerHTML = bosUyarisi;
        skorKutusu.innerHTML = bosUyarisi;
        return;
    }

    siraliListe.forEach((müzisyen, index) => {
        slotKutusu.innerHTML += `
            <div class="flex justify-between items-center p-2.5 bg-slate-900/50 border border-slate-800/80 rounded-xl text-xs">
                <span class="font-bold text-slate-300">${müzisyen.isim}</span>
                <span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg font-black">${müzisyen.slotAdet} Slot</span>
            </div>`;

        let dereceSimge = `<span class="w-5 text-center font-bold text-slate-500 text-[11px]">${index + 1}.</span>`;
        if (index === 0) dereceSimge = `🏆`;
        if (index === 1) dereceSimge = `🥈`;
        if (index === 2) dereceSimge = `🥉`;

        skorKutusu.innerHTML += `
            <div class="flex justify-between items-center p-2.5 bg-slate-900/50 border border-slate-800/80 rounded-xl text-xs">
                <div class="flex items-center gap-2">
                    ${dereceSimge}
                    <span class="font-bold text-slate-200">${müzisyen.isim}</span>
                </div>
                <span class="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-black">${müzisyen.toplamSaat} Saat</span>
            </div>`;
    });
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
function googleGirisYap() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function cikisYap() { auth.signOut(); }

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Giriş yapan kullanıcıyı global değişkene eşitliyoruz
        window.currentUser = user; 
        const benimIsmim = getAktifIsim(user);

        // Kullanıcı giriş yaptığında veritabanında kendini "online" olarak işaretler
        const onlineRef = db.ref("sistemde_aktif_olanlar/" + user.uid);
        onlineRef.set({
            isim: benimIsmim,
            girisTarihi: Date.now()
        });

        // Tarayıcı sekmesi veya sayfa kapatıldığında Firebase bu kaydı otomatik siler
        onlineRef.onDisconnect().remove();

    } else {
        // Eğer kullanıcı çıkış (Logout) yaparsa ismi aktif listesinden silinsin
        if (window.currentUser) {
            db.ref("sistemde_aktif_olanlar/" + window.currentUser.uid).remove();
        }
        window.currentUser = null;
    }
});
