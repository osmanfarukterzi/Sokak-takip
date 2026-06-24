// Tamamen garantili ve hatasız çalışan temiz kod yapısı
document.addEventListener("DOMContentLoaded", () => {
    console.log("Sokak Takip Programı Yükleniyor...");
    
    const programAkisi = document.getElementById("program-akisi");
    if (!programAkisi) {
        console.error("Hata: program-akisi elementi bulunamadı!");
        return;
    }

    // PDF dosyasındaki gerçek program verilerin
    const programVerisi = [
        { gun: "Pazartesi", saat: "12.00-15.30", muzisyen: "Sirayet" },
        { gun: "Pazartesi", saat: "15.30-20.30", muzisyen: "Berkhan / Eren" },
        { gun: "Pazartesi", saat: "20.30-23.00", muzisyen: "Uğur" },
        
        { gun: "Salı", saat: "12.00-15.30", muzisyen: "Raşit" },
        { gun: "Salı", saat: "15.30-20.30", muzisyen: "Samet / İsmet" },
        { gun: "Salı", saat: "20.30-23.00", muzisyen: "Doğa" },
        
        { gun: "Çarşamba", saat: "12.00-15.30", muzisyen: "Nebi" },
        { gun: "Çarşamba", saat: "15.30-20.30", muzisyen: "Eren / Samet" },
        { gun: "Çarşamba", saat: "20.30-23.00", muzisyen: "Berkhan" },
        
        { gun: "Perşembe", saat: "12.00-15.30", muzisyen: "Yimami" },
        { gun: "Perşembe", saat: "15.30-20.30", muzisyen: "Raşit / Sirayet" },
        { gun: "Perşembe", saat: "20.30-23.00", muzisyen: "İsmet" },
        
        { gun: "Cuma", saat: "12.00-15.30", muzisyen: "Uğur" },
        { gun: "Cuma", saat: "15.30-20.30", muzisyen: "İsmet / Berkhan" },
        { gun: "Cuma", saat: "20.30-23.00", muzisyen: "Eren" },
        
        { gun: "Cumartesi", saat: "12.00-15.30", muzisyen: "Doğa" },
        { gun: "Cumartesi", saat: "15.30-20.30", muzisyen: "Sirayet / Faruk" },
        { gun: "Cumartesi", saat: "20.30-23.00", muzisyen: "Samet" },
        
        { gun: "Pazar", saat: "12.00-15.30", muzisyen: "Yimami" },
        { gun: "Pazar", saat: "15.30-20.30", muzisyen: "Enes / Nebi" },
        { gun: "Pazar", saat: "20.30-23.00", muzisyen: "Raşit" }
    ];

    programAkisi.innerHTML = "";
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

    gunler.forEach(gun => {
        const oGununSlotlari = programVerisi.filter(p => p.gun === gun);
        let slotlarHtml = "";

        oGununSlotlari.forEach(slot => {
            slotlarHtml += `
                <div class="p-3 bg-slate-900/80 rounded-lg border border-slate-700/50 flex justify-between items-center text-sm">
                    <div>
                        <span class="text-xs font-mono text-amber-400 block">${slot.saat}</span>
                        <span class="font-medium text-slate-200">${slot.muzisyen}</span>
                    </div>
                    <span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Dolu</span>
                </div>
            `;
        });

        const isHaftaSonu = ["Cuma", "Cumartesi", "Pazar"].includes(gun);
        
        programAkisi.innerHTML += `
            <div class="bg-slate-800 rounded-xl border ${isHaftaSonu ? 'border-amber-500/20' : 'border-slate-700'} overflow-hidden shadow">
                <div class="${isHaftaSonu ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/40 text-slate-200'} px-4 py-2 font-bold text-sm border-b flex justify-between items-center">
                    <span>${gun}</span>
                    <span class="text-[10px] font-normal opacity-60">${isHaftaSonu ? 'Sabit Gün' : 'Dönüşümlü'}</span>
                </div>
                <div class="p-3 space-y-2">
                    ${slotlarHtml}
                </div>
            </div>
        `;
    });
});
