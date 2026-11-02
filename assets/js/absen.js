/* ==============================================================
   ABSEN.JS - halaman absen mahasiswa (index.html)
   Alur: isi NIM + kode -> cek di browser -> kirim ke api/absen.php
         dengan fetch (tanpa memuat ulang halaman) -> tampilkan hasil
   ============================================================== */

const form = document.getElementById('formAbsen');
const inputNim = document.getElementById('nim');
const inputKode = document.getElementById('kode');
const ingatNim = document.getElementById('ingatNim');
const btnKirim = document.getElementById('btnKirim');
const pesanGagal = document.getElementById('pesanGagal');
const hasilAbsen = document.getElementById('hasilAbsen');


/* ---------- 1. ISIAN OTOMATIS ---------- */
// NIM yang pernah disimpan di perangkat ini
try {
  const nimTersimpan = localStorage.getItem('absen_nim');
  if (nimTersimpan) inputNim.value = nimTersimpan;
} catch (e) { /* penyimpanan browser tidak tersedia */ }

// Kode dari alamat web, contoh: ...?kode=123456
const kodeDariUrl = new URLSearchParams(location.search).get('kode');
if (kodeDariUrl) inputKode.value = kodeDariUrl.replace(/\D/g, '').slice(0, 6);

// Kode sesi hanya boleh angka, maksimal 6 digit
inputKode.addEventListener('input', () => {
  inputKode.value = inputKode.value.replace(/\D/g, '').slice(0, 6);
  tandaiSalah(inputKode, document.getElementById('errKode'), '');
});
inputNim.addEventListener('input', () => tandaiSalah(inputNim, document.getElementById('errNim'), ''));


/* ---------- 2. INFO SERVER: sesi aktif & jam server ---------- */
let jamServerDetik = null;   // detik sejak 00:00 menurut server
let jamDiambil = 0;          // waktu (ms) saat jam server diambil

async function muatInfo() {
  const pil = document.getElementById('pilStatus');
  const teks = document.getElementById('teksStatus');
  try {
    const info = await api('absen.php?aksi=info');
    pil.className = 'pil-status' + (info.sesi_aktif > 0 ? ' aktif' : '');
    teks.textContent = info.sesi_aktif > 0
      ? info.sesi_aktif + ' sesi sedang berlangsung'
      : 'Belum ada sesi berlangsung';

    const [j, m, s] = info.jam_server.split(':').map(Number);
    jamServerDetik = j * 3600 + m * 60 + s;
    jamDiambil = Date.now();

    document.querySelectorAll('.isi-batas').forEach(el => el.textContent = info.batas_hadir);
    document.querySelectorAll('.isi-durasi').forEach(el => el.textContent = info.durasi_default);
  } catch (e) {
    pil.className = 'pil-status galat';
    teks.textContent = 'Server tidak terjangkau';
  }
}

function tampilkanJam() {
  if (jamServerDetik === null) return;
  const detik = Math.floor(jamServerDetik + (Date.now() - jamDiambil) / 1000) % 86400;
  const dua = n => String(n).padStart(2, '0');
  document.getElementById('jamServer').textContent =
    dua(Math.floor(detik / 3600)) + ':' + dua(Math.floor(detik % 3600 / 60)) + ':' + dua(detik % 60);
}

muatInfo();
setInterval(muatInfo, 20000);
setInterval(tampilkanJam, 1000);


/* ---------- 3. VALIDASI DI SISI CLIENT ---------- */
function tandaiSalah(input, tempatPesan, pesan) {
  tempatPesan.textContent = pesan;
  input.classList.toggle('salah', pesan !== '');
}

function validasi() {
  let valid = true;
  const nim = inputNim.value.trim();
  const kode = inputKode.value.trim();

  if (nim === '') {
    tandaiSalah(inputNim, document.getElementById('errNim'), 'NIM wajib diisi.'); valid = false;
  } else if (!/^[A-Za-z0-9.\-]{3,20}$/.test(nim)) {
    tandaiSalah(inputNim, document.getElementById('errNim'), 'NIM hanya berisi huruf/angka (3–20 karakter).'); valid = false;
  }
  if (!/^\d{6}$/.test(kode)) {
    tandaiSalah(inputKode, document.getElementById('errKode'), 'Kode sesi harus 6 digit angka.'); valid = false;
  }
  return valid;
}


/* ---------- 4. KIRIM ABSEN ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  pesanGagal.hidden = true;
  if (!validasi()) return;

  tombolMemuat(btnKirim, true, 'Mengirim…');
  try {
    const data = await api('absen.php?aksi=kirim', { nim: inputNim.value.trim(), kode: inputKode.value.trim() });

    try {
      if (ingatNim.checked) localStorage.setItem('absen_nim', data.nim);
      else localStorage.removeItem('absen_nim');
    } catch (e) { /* abaikan */ }

    tampilkanHasil(data);
    muatInfo();
  } catch (err) {
    // Gagal: tampilkan pesan dari server, atau pesan jaringan agar mahasiswa bisa kirim ulang
    pesanGagal.innerHTML = ikon(err.jaringan ? 'wifi' : 'alert-circle', 18) + `<span>${esc(err.message)}</span>`;
    pesanGagal.hidden = false;
    tombolMemuat(btnKirim, false);
    if (err.jaringan) btnKirim.querySelector('span').textContent = 'Kirim Ulang';
    return;
  }
  tombolMemuat(btnKirim, false);
});

function tampilkanHasil(data) {
  const terlambat = data.status === 'terlambat';
  document.getElementById('hasilIkon').className = 'hasil-ikon' + (terlambat ? ' terlambat' : '');
  document.getElementById('hasilIkon').innerHTML = ikon(terlambat ? 'clock' : 'check', 38);
  document.getElementById('hasilJudul').textContent = terlambat ? 'Absen diterima' : 'Absen berhasil!';
  document.getElementById('hasilNama').textContent = data.nama;
  document.getElementById('hasilNim').textContent = data.nim + ' · ' + data.kelas;
  document.getElementById('hasilMk').textContent = data.mata_kuliah;
  document.getElementById('hasilWaktu').innerHTML = esc(data.waktu) + ' WIB<small>menit ke-' + data.menit_ke + ' sejak sesi dimulai</small>';
  document.getElementById('hasilStatus').innerHTML = badge(data.status);

  tampilkanRekapSaya(data);
  tampilkanAnggota(data);
  pilihTab('panelRekap');

  form.hidden = true;
  hasilAbsen.hidden = false;
}

// Fitur: jumlah absen mahasiswa di mata kuliah ini
function tampilkanRekapSaya(data) {
  const r = data.rekap;
  const datang = r.hadir + r.terlambat;
  const persen = r.pertemuan ? Math.round(datang / r.pertemuan * 100) : 0;

  document.getElementById('rekapMk').textContent = data.mata_kuliah;
  document.getElementById('rekapDatang').textContent = datang;
  document.getElementById('rekapPertemuan').textContent = r.pertemuan;
  document.getElementById('rekapHadir').textContent = r.hadir;
  document.getElementById('rekapTerlambat').textContent = r.terlambat;
  document.getElementById('rekapTidak').textContent = r.tidak_hadir;
  document.getElementById('rekapPersen').textContent = persen + '%';
  document.getElementById('rekapCincin').style.setProperty('--p', persen);

  // Satu kotak kecil untuk setiap pertemuan (tanggal/bulan), diwarnai sesuai status
  document.getElementById('rekapRiwayat').innerHTML = r.riwayat.map(p => {
    const t = keDate(p.tanggal);
    return `<span class="riwayat-item ${p.status}${p.sesi_ini ? ' kini' : ''}"
                  title="${tanggalPanjang(p.tanggal)} · ${LABEL_STATUS[p.status]}${p.sesi_ini ? ' (sesi ini)' : ''}">${t.getDate()}/${t.getMonth() + 1}</span>`;
  }).join('');
}

// Fitur: anggota kelas yang sama, tanpa status absen
function tampilkanAnggota(data) {
  document.getElementById('jumlahAnggota').textContent = data.anggota.length;
  document.getElementById('catatanAnggota').textContent =
    `Kelas ${data.kelas} · ${data.anggota.length} mahasiswa terdaftar. Status absen anggota lain tidak ditampilkan.`;
  document.getElementById('daftarAnggota').innerHTML = data.anggota.map(a => `
    <li class="${a.saya ? 'saya' : ''}">
      <span class="avatar avatar-sm ${a.saya ? 'oranye' : ''}">${esc(inisial(a.nama))}</span>
      <div><b>${esc(a.nama)}${a.saya ? '<span class="chip-anda">Anda</span>' : ''}</b><small>${esc(a.nim)}</small></div>
    </li>`).join('');
}

// Pindah tab "Kehadiran Saya" / "Anggota Kelas"
function pilihTab(idPanel) {
  document.querySelectorAll('.hasil-tab button').forEach(b => b.classList.toggle('aktif', b.dataset.panel === idPanel));
  document.querySelectorAll('.panel-hasil').forEach(panel => { panel.hidden = panel.id !== idPanel; });
}
document.querySelectorAll('.hasil-tab button').forEach(b => b.addEventListener('click', () => pilihTab(b.dataset.panel)));

// Kembali ke form (NIM tetap, kode dikosongkan)
document.getElementById('btnSelesai').addEventListener('click', () => {
  inputKode.value = '';
  btnKirim.querySelector('span').textContent = 'Kirim Absen';
  hasilAbsen.hidden = true;
  form.hidden = false;
});
