/* ==============================================================
   SESI.JS - daftar sesi & form buat sesi (admin/sesi.html)
   ============================================================== */

let SEMUA = [];          // semua sesi dari server
let FILTER = 'semua';    // filter status yang dipilih
let MODE_MULAI = 'sekarang';

const form = document.getElementById('formSesi');
const inputMulai = document.getElementById('waktuMulai');
const inputDurasi = document.getElementById('durasi');

async function mulai() {
  await siapkanAdmin();
  await ulangi(muat, 10000);   // perbarui status sesi setiap 10 detik
  if (new URLSearchParams(location.search).get('buat')) bukaFormSesi();
}

async function muat() {
  SEMUA = await api('sesi.php?aksi=daftar');
  tampilkan();
}


/* ---------- Daftar kartu sesi ---------- */
function tampilkan() {
  const jumlah = status => SEMUA.filter(s => status === 'semua' || s.status === status).length;
  document.getElementById('jSemua').textContent = jumlah('semua');
  document.getElementById('jAktif').textContent = jumlah('aktif');
  document.getElementById('jAkan').textContent = jumlah('akan_datang');
  document.getElementById('jSelesai').textContent = jumlah('selesai');

  const cari = document.getElementById('cari').value.trim().toLowerCase();
  const urutan = { aktif: 0, akan_datang: 1, selesai: 2 };
  const daftar = SEMUA
    .filter(s => FILTER === 'semua' || s.status === FILTER)
    .filter(s => s.mata_kuliah.toLowerCase().includes(cari) || s.kode_sesi.includes(cari))
    .sort((a, b) => urutan[a.status] - urutan[b.status]);

  const wadah = document.getElementById('daftarSesi');
  if (!SEMUA.length) {
    wadah.innerHTML = `
      <div class="kosong" style="grid-column:1/-1">
        <div class="kosong-ikon">${ikon('calendar', 24)}</div>
        <h3>Belum ada sesi</h3>
        <p>Buat sesi pertama untuk mendapatkan kode absen 6 digit.</p>
        <button class="btn btn-utama btn-sm" onclick="bukaFormSesi()">${ikon('plus', 16)}Buat Sesi</button>
      </div>`;
    return;
  }
  if (!daftar.length) {
    wadah.innerHTML = `<div class="kosong" style="grid-column:1/-1"><div class="kosong-ikon">${ikon('search', 24)}</div><h3>Tidak ada sesi yang cocok</h3><p>Coba ubah filter atau kata pencarian.</p></div>`;
    return;
  }
  wadah.innerHTML = daftar.map(kartuSesi).join('');
}

function kartuSesi(s) {
  const hadir = Number(s.hadir), terlambat = Number(s.terlambat), total = Number(s.total);
  const persen = total ? Math.round((hadir + terlambat) / total * 100) : 0;
  return `
    <a class="kartu-sesi ${s.status === 'aktif' ? 'aktif' : ''}" href="sesi-detail.html?id=${s.id_sesi}">
      <div class="kartu-sesi-atas">${badge(s.status)}<span>${tanggalPendek(s.waktu_mulai)}</span></div>
      <div>
        <h3>${esc(s.mata_kuliah)}</h3>
        <p class="kartu-sesi-meta">${jamMenit(s.waktu_mulai)}–${jamMenit(s.waktu_tutup)} WIB · oleh ${esc(s.dibuat_oleh)}</p>
      </div>
      <div class="kartu-sesi-kode"><small>Kode sesi</small><b>${formatKode(s.kode_sesi)}</b></div>
      <div class="kartu-sesi-bawah">
        ${barTumpuk(hadir, terlambat, total, s.status === 'selesai')}
        <div class="kartu-sesi-angka">
          <span><b>${hadir}</b> hadir · <b>${terlambat}</b> terlambat</span>
          <span><b>${persen}%</b> dari ${total}</span>
        </div>
      </div>
    </a>`;
}

document.querySelectorAll('#filterStatus button').forEach(tombol => {
  tombol.addEventListener('click', () => {
    FILTER = tombol.dataset.status;
    document.querySelectorAll('#filterStatus button').forEach(b => b.classList.toggle('aktif', b === tombol));
    tampilkan();
  });
});
document.getElementById('cari').addEventListener('input', tampilkan);


/* ---------- Form buat sesi ---------- */
function bukaFormSesi() {
  form.reset();
  inputDurasi.value = PENGGUNA.durasi_default;
  inputMulai.value = '';
  aturModeMulai('sekarang');

  // Saran nama mata kuliah dari sesi yang pernah dibuat
  const daftarMk = [...new Set(SEMUA.map(s => s.mata_kuliah))];
  document.getElementById('daftarMk').innerHTML = daftarMk.map(mk => `<option value="${esc(mk)}">`).join('');
  document.getElementById('pesanSesi').hidden = true;
  bukaModal('modalSesi');
}

function aturModeMulai(mode) {
  MODE_MULAI = mode;
  const jadwal = mode === 'jadwal';
  document.querySelectorAll('#pilihMulai button').forEach(b => b.classList.toggle('aktif', b.dataset.mulai === mode));
  inputMulai.hidden = !jadwal;
  inputMulai.disabled = !jadwal;   // input yang disabled tidak ikut terkirim -> server memakai jam sekarang

  if (jadwal && !inputMulai.value) {
    const satuJamLagi = new Date();
    satuJamLagi.setHours(satuJamLagi.getHours() + 1, 0, 0, 0);
    inputMulai.value = keDatetimeLocal(satuJamLagi);
  }
  document.getElementById('bantuanMulai').textContent = jadwal
    ? 'Mahasiswa baru bisa absen ketika waktu mulai tiba.'
    : 'Memakai jam server saat tombol ditekan.';
  perbaruiInfoAturan();
}

function keDatetimeLocal(d) {
  const dua = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}T${dua(d.getHours())}:${dua(d.getMinutes())}`;
}

// Pratinjau aturan status (Tabel 1) sesuai batas waktu yang dipilih
function perbaruiInfoAturan() {
  const durasi = Math.max(0, Number(inputDurasi.value) || 0);
  const batas = Math.min(PENGGUNA.batas_hadir, durasi);
  document.querySelectorAll('#chipDurasi button').forEach(b => b.classList.toggle('aktif', Number(b.dataset.menit) === durasi));

  const mulaiPada = (MODE_MULAI === 'jadwal' && inputMulai.value) ? new Date(inputMulai.value) : new Date();
  const jamKe = menit => {
    const d = new Date(mulaiPada.getTime() + menit * 60000);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  document.getElementById('infoAturan').innerHTML = `
    <div>${badge('hadir')} menit <b>0–${batas}</b> <span class="teks-redup">(${jamKe(0)}–${jamKe(batas)})</span></div>
    ${durasi > batas ? `<div>${badge('terlambat')} menit <b>${batas}–${durasi}</b> <span class="teks-redup">(${jamKe(batas)}–${jamKe(durasi)})</span></div>` : ''}
    <div>${badge('tidak_hadir')} ditolak setelah menit <b>${durasi}</b> <span class="teks-redup">(${jamKe(durasi)})</span></div>`;
}

document.getElementById('btnBuat').addEventListener('click', bukaFormSesi);
document.querySelectorAll('#pilihMulai button').forEach(b => b.addEventListener('click', () => aturModeMulai(b.dataset.mulai)));
document.querySelectorAll('#chipDurasi button').forEach(b => b.addEventListener('click', () => {
  inputDurasi.value = b.dataset.menit;
  perbaruiInfoAturan();
}));
inputDurasi.addEventListener('input', perbaruiInfoAturan);
inputMulai.addEventListener('input', perbaruiInfoAturan);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pesan = document.getElementById('pesanSesi');
  const tombol = document.getElementById('btnSimpanSesi');
  const tampilkanPesan = teks => { pesan.innerHTML = ikon('alert-circle') + `<span>${esc(teks)}</span>`; pesan.hidden = false; };
  pesan.hidden = true;

  const durasi = Number(inputDurasi.value);
  if (!form.mata_kuliah.value.trim()) return tampilkanPesan('Nama mata kuliah wajib diisi.');
  if (!(durasi >= 1 && durasi <= 300)) return tampilkanPesan('Batas waktu absen harus 1–300 menit.');
  if (MODE_MULAI === 'jadwal' && !inputMulai.value) return tampilkanPesan('Isi tanggal dan jam mulai sesi.');

  tombolMemuat(tombol, true, 'Membuat sesi…');
  try {
    const hasil = await api('sesi.php?aksi=buat', new FormData(form));
    location.href = 'sesi-detail.html?id=' + hasil.id_sesi + '&baru=1';
  } catch (err) {
    tampilkanPesan(err.message);
    tombolMemuat(tombol, false);
  }
});

mulai().catch(err => toast(err.message, 'gagal'));
