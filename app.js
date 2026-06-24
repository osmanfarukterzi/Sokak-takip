// KESİN ÇÖZÜM: DOĞRUDAN SUPABASE BİLGİLERİNİ KODA GÖMÜYORUZ
const SUPABASE_URL = "https://osmanfarukterzi.supabase.co"; // Sizin gerçek urlniz bu değilse birazdan güncelleyeceğiz
const SUPABASE_KEY = "BURAYA_EKRANDA_GÖRDÜĞÜNÜZ_sb_publishable_İLE_BAŞLAYAN_UPUZUN_ANAHTARI_YAPIŞTIRIN";

// Supabase'i başlatıyoruz
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Sokak Takip Sistemi Başlatıldı.");
    
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

    try {
        await programiYukle();
        await muzisyenleriYukle();
    } catch(err) {
        console.error("Bağlantı Hatası:", err);
        programAkisi.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center p-8 bg-slate-800 rounded-xl border border-dashed border-amber-500/40">
                <p class="text-amber-400 mb-2"><i class="fa-solid fa-plug"></i> Anahtarlar Eşleşmedi</p>
                <p class="text-xs text-slate-400">Lütfen kodun en üstündeki URL ve KEY alanlarına kendi Supabase bilgilerini yapıştırıp tekrar kaydet.</p>
            </div>
        `;
    }
});

// 1. HAFTALIK PROGRAMI VERİTABANINDAN ÇEKİP EKRANA YAZMA
async function programiYukle() {
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) return;

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

    programAkisi.innerHTML = "";
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
            let butonHtml = `<button class="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded border border-slate-600 transition">İşlem</button>`;

            slotHtml += `
                <div class="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60 flex justify-between items-center gap-2">
                    <div>
                        <span class="text-xs font-mono text-amber-400 block mb-0.5">${slot.saat_araligi}</span>
                        <span class="font-semibold text-slate-200">${isimGosterim}</span>
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                        <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${durumRenk}">${slot.slot_durumu}</span>
                        ${butonHtml}
                    </div>
                </div>
            `;
        });

        const isHaftaSonu = ["Cuma", "Cumartesi", "Pazar"].includes(gun);
        programAkisi.innerHTML += `
            <div class="bg-slate-800 rounded-xl border ${isHaftaSonu ? 'border-amber-500/20' : 'border-slate-700'} shadow-md overflow-hidden">
                <div class="${isHaftaSonu ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-200'} px-4 py-2.5 font-bold border-b flex justify-between items-center">
                    <span>${gun}</span>
                    <span class="text-xs font-normal opacity-70">${isHaftaSonu ? 'Sabit Hafta Sonu' : 'Haim Rotasyonu'}</span>
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
        listeAlani.innerHTML += `
            <div class="flex justify-between items-center border-b border-slate-700/50 py-2">
                <span class="text-slate-300 font-medium">${m.isim}</span>
                <span class="font-bold text-emerald-400">${m.haftalik_sabit_slot} Slot</span>
            </div>
        `;
    });
}

// 3. İLK PROGRAMI VERİTABANINA BASMA SİHİRBAZI
async function ornekVeriYukle() {
    const ilkProgram = [
        { gun: "Pazartesi", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Sirayet", slot_durumu: "Dolu" },
        { gun: "Pazartesi", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Berkhan", asil_muzisyen_2: "Eren", slot_durumu: "Dolu" },
        { gun: "Salı", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Raşit", slot_durumu: "Dolu" },
        { gun: "Salı", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Samet", asil_muzisyen_2: "İsmet", slot_durumu: "Dolu" },
        { gun: "Çarşamba", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Nebi", slot_durumu: "Dolu" },
        { gun: "Çarşamba", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Eren", asil_muzisyen_2: "Samet", slot_durumu: "Dolu" },
        { gun: "Perşembe", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Yimami", slot_durumu: "Dolu" },
        { gun: "Perşembe", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Raşit", asil_muzisyen_2: "Sirayet", slot_durumu: "Dolu" },
        { gun: "Cuma", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Uğur", slot_durumu: "Dolu" },
        { gun: "Cuma", saat_araligi: "15.30-20.30", asil_muzisyen_1: "İsmet", asil_muzisyen_2: "Berkhan", slot_durumu: "Dolu" },
        { gun: "Cumartesi", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Doğa", slot_durumu: "Dolu" },
        { gun: "Cumartesi", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Sirayet", asil_muzisyen_2: "Faruk", slot_durumu: "Dolu" },
        { gun: "Pazar", saat_araligi: "12.00-15.30", asil_muzisyen_1: "Yimami", slot_durumu: "Dolu" },
        { gun: "Pazar", saat_araligi: "15.30-20.30", asil_muzisyen_1: "Enes", asil_muzisyen_2: "Nebi", slot_durumu: "Dolu" }
    ];

    const { error } = await supabase.from('haftalik_program').insert(ilkProgram);
    if (!error) {
        alert("Harika! Sistem başarıyla tetiklendi.");
        window.location.reload();
    } else {
        alert("Hata: " + error.message);
    }
}
