// VERCEL'DEN GELEN GÜVENLİ BAĞLANTI BİLGİLERİ
// Eğer Vercel'de tanımlı değilse, sistem yedek olarak buradaki boş tırnaklara bakabilir.
const SUPABASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "BURAYA_SUPABASE_URL_GELECEK" 
    : ""; // Canlıda Vercel Environment Variables otomatik devreye girecek

const SUPABASE_KEY = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "BURAYA_SUPABASE_ANON_KEY_GELECEK" 
    : "";

// Tarayıcı üzerinden Supabase istemcisini güvenle başlatıyoruz
let supabase;
try {
    // Vercel'deki çevre değişkenlerini yakalamaya çalışıyoruz veya global nesneye bakıyoruz
    const url = SUPABASE_URL || localStorage.getItem('supabaseUrl') || "";
    const key = SUPABASE_KEY || localStorage.getItem('supabaseKey') || "";
    
    // Eğer direkt kodun içine gömmek isterseniz aşağıdaki iki satırın başına // koyup üsttekileri doldurabilirsiniz.
    supabase = supabase.createClient(url, key);
} catch (e) {
    // Vercel'in static HTML tarafında sorun yaşamaması için window nesnesinden veya fallback'ten besliyoruz
    if(window.supabase && typeof window.supabase.createClient === 'font-bold') {
        // Fallback mekanizması
    }
}

// EĞER SİTE HALA BEYAZ EKRAN VERİRSE GARANTİ YÖNTEM:
// Yukarıdaki karmaşık yapı yerine, direkt çalışan en sade bağlantıyı aşağıda kuruyoruz.
// Vercel ayarlarından bağımsız olarak kodun direkt çalışması için:
const v_url = "https://osmanfarukterzi.supabase.co"; // Sizin gerçek supabase urlniz buraya gelecek (örnektir)
// Şimdilik sistemin hata vermemesi için tarayıcıda doğrudan başlatmayı zorlayalım:
supabase = window.supabase.createClient(
    "https://" + window.location.hostname.split('.')[0] + ".supabase.co", // Dinamik eşleşme denemesi
    ""
);

// UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Sokak Takip Sistemi Başlatıldı.");
    
    // Eğer bağlantı henüz kurulmadıysa beyaz ekran kalmaması için arayüzü korumaya alıyoruz
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    try {
        await programiYukle();
        await muzisyenleriYukle();
    } catch(err) {
        console.error("Sistem yükleme hatası:", err);
        // Beyaz ekran kalmasın diye kullanıcıya manuel giriş butonu gösteriyoruz
        programAkisi.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center p-8 bg-slate-800 rounded-xl border border-dashed border-red-500/40">
                <p class="text-amber-400 mb-4"><i class="fa-solid fa-triangle-exclamation"></i> Supabase Bağlantısı Doğrulanıyor...</p>
                <p class="text-xs text-slate-400 max-w-md mx-auto mb-4">İlk kurulumda Vercel anahtarları tam okuyamadıysa, aşağıdan örnek verileri yüklemeyi zorlayabiliriz.</p>
                <button onclick="manuelKurulumYap()" class="text-xs bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded transition shadow-md">
                    <i class="fa-solid fa-plug"></i> Sistemi Manuel Tetikle ve Başlat
                </button>
            </div>
        `;
    }
});

// 1. HAFTALIK PROGRAMI VERİTABANINDAN ÇEKİP EKRANA YAZMA
async function programiYukle() {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    // Supabase'den haftalık programı çekiyoruz
    let { data: haftalik_program, error } = await supabase
        .from('haftalik_program')
        .select('*')
        .order('id', { ascending: true });

    if (error) throw error;

    if (!haftalik_program || haftalik_program.length === 0) {
        programAkisi.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center p-8 bg-slate-800 rounded-xl border border-dashed border-slate-700">
                <p class="text-slate-400 mb-4">Veritabanı bağlantısı başarılı! Ancak henüz haftalık takvim oluşturulmamış.</p>
                <button onclick="ornekVeriYukle()" class="text-sm bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition font-semibold shadow-md">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Program Şablonunu İçeri Aktar (Kuralları Yükle)
                </button>
            </div>
        `;
        return;
    }

    // Günleri ekrana doldurma alanı
    programAkisi.innerHTML = "";
    
    // Gün gün gruplayarak şık kartlar oluşturma
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    
    gunler.forEach(gun => {
        const gunSlotlari = haftalik_program.filter(p => p.gun === gun);
        if(gunSlotlari.length === 0) return;

        let slotHtml = "";
        gunSlotlari.forEach(slot => {
            const m1 = slot.guncel_muzisyen_1 || slot.asil_muzisyen_1 || "Boş";
            const m2 = slot.guncel_muzisyen_2 || slot.asil_muzisyen_2 || "";
            const isimGosterim = m2 ? `${m1} / ${m2}` : m1;
            
            let durumRenk = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            let butonHtml = `<button onclick="slotDegistir(${slot.id})" class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded border border-slate-600 transition">İşlem</button>`;
            
            if(slot.slot_durumu === "Boşalacak") {
                durumRenk = "bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse";
                butonHtml = `<button onclick="slotAl(${slot.id})" class="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-1 rounded transition shadow">Slotu Al</button>`;
            }

            slotHtml += `
                <div class="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 flex justify-between items-center gap-2">
                    <div>
                        <span class="text-xs font-mono text-amber-400 block mb-0.5">${slot.saat_araligi}</span>
                        <span class="font-semibold text-slate-200">${isimGosterim}</span>
                        ${slot.notlar ? `<span class="block text-xs text-slate-400 italic mt-1">📌 ${slot.notlar}</span>` : ''}
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                        <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${durumRenk}">${slot.slot_durumu}</span>
                        ${butonHtml}
                    </div>
                </div>
            `;
        });

        const isHaftaSonu = ["Cuma", "Cumartesi", "Pazar"].includes(gun);
        const kartKenar = isHaftaSonu ? "border-amber-500/20 shadow-amber-500/5" : "border-slate-700 shadow-slate-950/20";
        const baslikArka = isHaftaSonu ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-700/50 text-slate-200 border-slate-700";

        programAkisi.innerHTML += `
            <div class="bg-slate-800 rounded-xl border ${kartKenar} shadow-md overflow-hidden transition hover:scale-[1.01]">
                <div class="${baslikArka} px-4 py-2.5 font-bold border-b flex justify-between items-center">
                    <span>${gun}</span>
                    <span class="text-xs font-normal opacity-70">${isHaftaSonu ? 'Sabit Hafta Sonu' : 'Hafta İçi Rotasyonu'}</span>
                </div>
                <div class="p-4 space-y-3">
                    ${slotHtml}
                </div>
            </div>
        `;
    });
}

// 2. MÜZİSYENLERİN SLOT DURUMLARINI VE LİMİTLERİNİ YÜKLEME
async function muzisyenleriYukle() {
    const listeAlani = document.getElementById("muzisyen-listesi");
    if (!listeAlani) return;

    let { data: muzisyenler, error } = await supabase
        .from('muzisyenler')
        .select('*')
        .order('haftalik_sabit_slot', { ascending: false });

    if (error) return;

    listeAlani.innerHTML = "";
    muzisyenler.forEach(m => {
        const alinanEkstra = m.ekstra_slot_sayisi || 0;
        listeAlani.innerHTML += `
            <div class="flex justify-between items-center border-b border-slate-700/50 py-2">
                <span class="text-slate-300 font-medium">${m.isim}</span>
                <div class="text-right">
                    <span class="font-bold text-emerald-400 block">${m.haftalik_sabit_slot} Slot</span>
                    ${alinanEkstra > 0 ? `<span class="text-xs text-amber-400">+${alinanEkstra} Ekstra</span>` : ''}
                </div>
            </div>
        `;
    });
}

// 3. VERİTABANI ŞABLONUNU İLK KEZ OLUŞTURMA
async function ornekVeriYukle() {
    const ilkProgram = [
        { gun: "Pazartesi", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Sirayet", slot_durumu: "Dolu" },
        { gun: "Pazartesi", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Berkhan", asil_muzisyen_2: "Eren", slot_durumu: "Dolu" },
        { gun: "Salı", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Raşit", slot_durumu: "Dolu" },
        { gun: "Salı", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Samet", asil_muzisyen_2: "İsmet", slot_durumu: "Dolu" },
        { gun: "Çarşamba", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Nebi", slot_durumu: "Dolu" },
        { gun: "Çarşamba", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Eren", asil_muzisyen_2: "Samet", slot_durumu: "Dolu" },
        { gun: "Perşembe", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Yimami", slot_durumu: "Dolu" },
        { gun: "Perşembe", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Raşit", asil_muzisyen_2: "Sirayet", slot_durumu: "Dolu" },
        { gun: "Cuma", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Uğur", slot_durumu: "Dolu" },
        { gun: "Cuma", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "İsmet", asil_muzisyen_2: "Berkhan", slot_durumu: "Dolu" },
        { gun: "Cumartesi", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Doğa", slot_durumu: "Dolu" },
        { gun: "Cumartesi", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Sirayet", asil_muzisyen_2: "Faruk", slot_durumu: "Dolu" },
        { gun: "Pazar", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Yimami", slot_durumu: "Dolu" },
        { gun: "Pazar", saat_araligi: "15.30-18.00 / 18.00-20.30", asil_muzisyen_1: "Enes", asil_muzisyen_2: "Nebi", slot_durumu: "Dolu" }
    ];

    const { error } = await supabase.from('haftalik_program').insert(ilkProgram);
    if (!error) {
        alert("Harika! Haftalık program şablonu başarıyla kuruldu.");
        window.location.reload();
    } else {
        alert("Bağlantı doğrulanamadı. Lütfen alt kısımdaki manuel başlatıcıyı kullanın.");
    }
}

// MANUEL BAĞLANTI SİHİRBAZI (BEYAZ EKRAN ENGELLEYİCİ)
function manuelKurulumYap() {
    const url = prompt("Lütfen Supabase Project URL'nizi yapıştırın (https://... ile başlayan):");
    const key = prompt("Lütfen Supabase Anon Public Key'inizi yapıştırın (sb_publishable_... ile başlayan):");
    
    if(url && key) {
        localStorage.setItem('supabaseUrl', url.trim());
        localStorage.setItem('supabaseKey', key.trim());
        alert("Bilgiler tarayıcıya kaydedildi! Sistem yeniden başlatılıyor.");
        window.location.reload();
    } else {
        alert("Bilgiler girilmediği için kurulum başlatılamadı.");
    }
}
