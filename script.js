// script.js

// ⚠️ PENTING: GANTI URL DI BAWAH INI DENGAN URL WEB APP GOOGLE APPS SCRIPT MILIK ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwrcGrhERJdiJlKdILplc_VhjI9ZxHMpNPZYPmMurGqkyJxg7zRgSeAOOvejol6Pv0V/exec"; 
const STORAGE_KEY = "REPORT_DRAFT_DATA";

// Data metrik bawaan (Hardcode)
// Digunakan sebagai nilai awal atau fallback jika gagal mengambil target dinamis dari server.
const metrics = [
    { id: 'spd', label: 'SPD', target: 30776167 },
    { id: 'std', label: 'STD', target: 388 },
    { id: 'apc', label: 'APC', target: 79290, isFormula: true },
    { id: 'psm', label: 'PSM', target: 67 },
    { id: 'pwp', label: 'PWP', target: 28 },
    { id: 'serbagratis', label: 'Serba Gratis', target: 15 },
    { id: 'sueger', label: 'Sueger', target: 39 },
    { id: 'ceban', label: 'Ceban', target: 19 },
    { id: 'newmember', label: 'New Member', target: 3 },
    { id: 'stdmember', label: 'STD MEMBER', target: 300 },
    { id: 'cbpersonalcare', label: 'CASHBACK Personal Care', target: 10 },
    { id: 'cbdiaper', label: 'CASHBACK Diaper', target: 10 },
    { id: 'cbcoockingfair', label: 'CASHBACK Cooking Fair', target: 10 },
    { id: 'beanspot', label: 'Beanspot', target: 892892 },
    { id: 'voucher', label: 'Voucher', target: 100000 },
    { id: 'nps', label: 'NPS', target: 194 }
];

document.addEventListener('DOMContentLoaded', () => {
    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;

    // 1. Gambar tabel input
    renderTable();

    // 2. Muat draft dari Local Storage (jika ada sisa inputan sebelumnya)
    loadDraft();

    // 3. Pasang pendeteksi perubahan pada input teks header
    document.getElementById('tanggal').addEventListener('input', generateReport);
    document.getElementById('shift').addEventListener('input', generateReport);
    document.getElementById('staf').addEventListener('input', generateReport);
    document.getElementById('crew').addEventListener('input', generateReport);
    
    // 4. Generate text laporan awal
    generateReport();
    
    // 5. Tarik angka target terbaru dari Google Sheets (Target Dinamis)
    fetchDynamicTargets();
});

function renderTable() {
    const tbody = document.getElementById('metric-fields');
    tbody.innerHTML = ""; 

    metrics.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-100 hover:bg-gray-50";
        
        if (m.isFormula) {
            tr.innerHTML = `
                <td class="p-2 font-medium text-gray-700">${m.label}</td>
                <td class="p-1"><input type="number" id="t_${m.id}" value="${m.target}" readonly class="w-full p-1.5 border rounded text-right font-semibold bg-gray-100 text-gray-400 select-none cursor-not-allowed focus:outline-none"></td>
                <td class="p-1"><input type="text" id="a_${m.id}" readonly class="w-full p-1.5 border rounded text-right bg-gray-100 text-gray-500 font-bold focus:outline-none" placeholder="Otomatis"></td>
            `;
        } else {
            tr.innerHTML = `
                <td class="p-2 font-medium text-gray-700">${m.label}</td>
                <td class="p-1"><input type="number" id="t_${m.id}" value="${m.target}" readonly class="w-full p-1.5 border rounded text-right font-semibold bg-gray-100 text-gray-400 select-none cursor-not-allowed focus:outline-none"></td>
                <td class="p-1"><input type="number" id="a_${m.id}" oninput="generateReport()" class="w-full p-1.5 border rounded text-right focus:border-blue-500 focus:outline-none bg-white" placeholder="0"></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function formatNumber(numStr) {
    if (!numStr || isNaN(numStr) || numStr === "0") return "0";
    return Math.round(Number(numStr)).toLocaleString('id-ID');
}

function generateReport() {
    // Sinkronisasi STD ke Target NPS
    const actualStdValue = document.getElementById('a_std').value;
    const targetNpsInput = document.getElementById('t_nps');
    
    if (actualStdValue && actualStdValue > 0) {
        targetNpsInput.value = actualStdValue;
    } else {
        targetNpsInput.value = 100;
    }

    // Hitung Actual APC otomatis
    const actualSpdRaw = document.getElementById('a_spd').value;
    const apcInput = document.getElementById('a_apc');
    if (actualSpdRaw && actualStdValue && parseFloat(actualStdValue) > 0) {
        apcInput.value = Math.round(parseFloat(actualSpdRaw) / parseFloat(actualStdValue));
    } else {
        apcInput.value = "";
    }

    // Ambil data header
    const rawTanggal = document.getElementById('tanggal').value;
    let formattedDate = rawTanggal ? new Date(rawTanggal).toLocaleDateString('id-ID') : "";
    const shift = document.getElementById('shift').value.toUpperCase();
    const staf = document.getElementById('staf').value.toUpperCase();
    const crew = document.getElementById('crew').value.toUpperCase();

    // Mulai susun teks laporan
    let txt = `🟦 FOKUS MKT & SALES*\n`;
    txt += `🔹TANGGAL : ${formattedDate}\n`;
    txt += `SIFT : ${shift}\n`;
    txt += `STAF : ${staf}\n`;
    txt += `CREW : ${crew}\n\n`;
    txt += `*Desc : Target/Actual/Acv*\n`;

    metrics.forEach(m => {
        const targetRaw = document.getElementById(`t_${m.id}`).value;
        let actualRaw = document.getElementById(`a_${m.id}`).value;
        
        // Pastikan APC masuk ke teks
        if (m.id === 'apc' && apcInput.value) actualRaw = apcInput.value;

        const target = formatNumber(targetRaw);
        const actual = formatNumber(actualRaw);
        let acv = "0%";

        if (targetRaw && actualRaw) {
            const tNum = parseFloat(targetRaw);
            const aNum = parseFloat(actualRaw);
            if (tNum > 0) acv = Math.round((aNum / tNum) * 100) + "%";
        }

        let displayLabel = m.label;
        if(m.id === 'serbagratis') displayLabel = "Serba Gratis";
        if(m.id === 'sueger') displayLabel = "Sueger";
        if(m.id === 'cbpersonalcare') displayLabel = "CASHBACK Personal Care";

        txt += `- ${displayLabel} :${target}/ ${actual}/ ${acv}\n`;
    });

    // Tampilkan di textarea
    document.getElementById('output-text').value = txt;
    
    // Simpan otomatis ke Local Storage setiap ada perubahan
    saveDraft(); 
}

// === FITUR LOCAL STORAGE (SIMPAN DRAFT) ===
function saveDraft() {
    const draftData = {
        tanggal: document.getElementById('tanggal').value,
        shift: document.getElementById('shift').value,
        staf: document.getElementById('staf').value,
        crew: document.getElementById('crew').value,
        actuals: {}
    };

    metrics.forEach(m => {
        if (!m.isFormula) {
            draftData.actuals[m.id] = document.getElementById(`a_${m.id}`).value;
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
}

function loadDraft() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const draftData = JSON.parse(saved);
            if (draftData.tanggal) document.getElementById('tanggal').value = draftData.tanggal;
            if (draftData.shift) document.getElementById('shift').value = draftData.shift;
            if (draftData.staf) document.getElementById('staf').value = draftData.staf;
            if (draftData.crew) document.getElementById('crew').value = draftData.crew;
            
            metrics.forEach(m => {
                if (!m.isFormula && draftData.actuals[m.id] !== undefined) {
                    document.getElementById(`a_${m.id}`).value = draftData.actuals[m.id];
                }
            });
        } catch (e) {
            console.error("Gagal membaca memori Local Storage", e);
        }
    }
}

// === FITUR TARGET DINAMIS (DARI GOOGLE SHEETS) ===
async function fetchDynamicTargets() {
    const btnSubmit = document.getElementById('btn-submit');
    const originalBtnText = btnSubmit.innerHTML;
    
    // Cegah error fetch jika URL belum diganti
    if (SCRIPT_URL.includes("AKfycbx...")) {
        console.warn("SCRIPT_URL belum diganti. Menggunakan target hardcode.");
        return; 
    }

    btnSubmit.innerHTML = "⏳ Memuat Target Terbaru...";
    
    try {
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();

        if (result.status === "success") {
            result.targets.forEach(t => {
                const targetInput = document.getElementById(`t_${t.id}`);
                if (targetInput && t.id !== 'nps') {
                    targetInput.value = t.target;
                }
            });
            generateReport(); 
        }
    } catch (error) {
        console.warn("Offline / Gagal memuat target dinamis. Menggunakan target bawaan. Error:", error);
    } finally {
        btnSubmit.innerHTML = originalBtnText;
    }
}

// === FITUR KIRIM DATA KE GOOGLE SHEETS ===
async function submitToSheets() {
    if (SCRIPT_URL.includes("AKfycbx...")) {
        alert("Harap ganti SCRIPT_URL dengan Web App URL Google Apps Script Anda terlebih dahulu!");
        return;
    }

    const btnSubmit = document.getElementById('btn-submit');
    const originalBtnText = btnSubmit.innerHTML;

    // Validasi input
    const tanggal = document.getElementById('tanggal').value;
    const shift = document.getElementById('shift').value;
    const staf = document.getElementById('staf').value;
    const crew = document.getElementById('crew').value;

    if (!tanggal || !shift || !staf) {
        alert("Harap isi Tanggal, Shift, dan Nama Staf terlebih dahulu!");
        return;
    }

    // Susun format data untuk dikirim ke Google Sheets (Backend)
    const payload = { header: { tanggal, shift, staf, crew }, metrics: {} };

    metrics.forEach(m => {
        const targetVal = document.getElementById(`t_${m.id}`).value || "0";
        let actualVal = document.getElementById(`a_${m.id}`).value || "0";
        
        // Ambil nilai APC dari kotak jika itu metrik formula
        if (m.id === 'apc') actualVal = document.getElementById('a_apc').value || "0";
        
        payload.metrics[m.id] = {
            target: parseFloat(targetVal),
            actual: parseFloat(actualVal)
        };
    });

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "⏳ Mengirim Data...";

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (resData.status === "success") {
            alert("✅ Data berhasil disimpan ke Google Sheets!");
            // Bersihkan draft setelah sukses terkirim
            localStorage.removeItem(STORAGE_KEY); 
        } else {
            alert("⚠️ Gagal menyimpan data: " + resData.message);
        }
    } catch (err) {
        console.error("Error Submit:", err);
        alert("❌ Terjadi kesalahan koneksi saat mengirim data!");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;
    }
}

// === FITUR UI LAINNYA ===
function copyToClipboard() {
    const textarea = document.getElementById('output-text');
    if(!textarea.value) return alert('Isi data terlebih dahulu!');
    textarea.select();
    document.execCommand('copy');
    const btn = document.getElementById('btn-copy');
    btn.innerHTML = "✅ Tersalin!";
    setTimeout(() => btn.innerHTML = "📋 Salin Teks", 2000);
}

function resetActualOnly() {
    if(confirm("Apakah Anda yakin ingin mengosongkan semua data inputan Actual?")) {
        metrics.forEach(m => {
            if (!m.isFormula) document.getElementById(`a_${m.id}`).value = "";
        });
        document.getElementById('shift').value = "";
        document.getElementById('staf').value = "";
        document.getElementById('crew').value = "";
        
        // Hapus juga memori draft
        localStorage.removeItem(STORAGE_KEY);
        generateReport();
    }
}
