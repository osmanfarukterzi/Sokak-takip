// SUPABASE BAĞLANTI AYARLARI
// NOT: Burardaki URL ve KEY kısımlarını kendi Supabase bilgilerinizle değiştireceğiz!
const SUPABASE_URL = "https://ijmizfpfaowuuresevdz.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_YfVKoPw50KOhEJpKhR1f2A_-T9w5TXc";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Sokak Takip Sistemi Başlatıldı.");
    await programiYukle();
    await muzisyenleriYukle();
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

    if (error) {
        console.error("Program yüklenirken hata oluştu:", error);
        return;
    }

    // Eğer veritabanı henüz boşsa ekrana geçici bir bilgi basıyoruz
    if (!haftalik_program || haftalik_program.length === 0) {
        programAkisi.innerHTML = `
            <div class="col-span-1 md:col-span-2 text-center p-8 bg-slate-800 rounded-xl border border-dashed border-slate-700">
                <p class="text-slate-400 mb-2">Henüz veritabanına bu haftanın programı girilmemiş.</p>
                <button onclick="ornekVeriYukle()" class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded transition font-medium">
                    <i class="fa-solid fa-magic"></i> Örnek Programı İçeri Aktar
                </button>
            </div>
        `;
        return;
    }

    // Günleri ekrana doldurma alanı (Gelişmiş döngü altyapısı)
    programAkisi.innerHTML = "";
    // Program verilerini gün gün gruplayıp ekrana basacak arayüz döngüsü buraya bağlanacak
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
                    <span class="font-bold text-emerald-400 block">${m.haftalik_sabit_slot} Sabit</span>
                    ${alinanEkstra > 0 ? `<span class="text-xs text-amber-400">+${alinanEkstra} Ekstra</span>` : ''}
                </div>
            </div>
        `;
    });
}

// 3. VERİTABANI BOŞSA OTOMATİK PROGRAMI OLUŞTURMA SİHİRBAZI
async function ornekVeriYukle() {
    // Sizin gönderdiğiniz PDF/Metin tablosundaki verileri ilk kez Supabase'e basan fonksiyondur
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
        alert("Harika! Haftalık program şablonu başarıyla kuruldu.");
        window.location.reload();
    } else {
        alert("Bir hata oluştu, Supabase bağlantı bilgilerinizi kontrol edin.");
    }
}
