/* ==============================================================
   SESI-DETAIL.JS - kode sesi + daftar hadir live (admin/sesi-detail.html)
   Daftar hadir diperbarui otomatis setiap 5 detik.
   ============================================================== */

const ID = new URLSearchParams(location.search).get('id');
let SESI = null;           // data sesi
let DAFTAR = [];           // daftar mahasiswa + status absen
let IP_SERVER = '';
let DIAMBIL = 0;           // performance.now() saat data diambil
let FILTER = 'semua';
let SUDAH_ABSEN = null;    // NIM yang sudah absen pada pembaruan sebelumnya
let MEMUAT_ULANG = false;

const $ = id => document.getElementById(id);

async function mulai() {
  if (!ID) { location.href = 'sesi.html'; return; }
  await siapkanAdmin();
  document.querySelectorAll('.isi-batas').forEach(el => el.textContent = PENGGUNA.batas_hadir);

  await ulangi(muat, 5000);
  setInterval(perbaruiWaktu, 1000);

  if (new URLSearchParams(location.search).get('baru') && SESI) {
    toast('Sesi dibuat. Tampilkan kode ' + formatKode(SESI.kode_sesi) + ' kepada mahasiswa.');
    history.replaceState(null, '', 'sesi-detail.html?id=' + ID);
  }
}

async function muat(paksa = false) {
  // Sesi yang sudah selesai tidak berubah lagi, jadi tidak perlu diperbarui terus
  if (SESI && SESI.status === 'selesai' && paksa !== true) return;

  let data;
  try {
    data = await api('sesi.php?aksi=detail&id=' + encodeURIComponent(ID));
  } catch (err) {
    if (err.status === 404) return tampilkanTidakAda();
    throw err;
  }
  SESI = data.sesi;
  DAFTAR = data.daftar;
  IP_SERVER = data.ip_server;
  DIAMBIL = performance.now();

  tampilkanSesi();
  isiPilihanKelas();
  tampilkanDaftar();
  perbaruiWaktu();
  if (!$('proyektor').hidden) isiProyektor();
}


/* ---------- Kartu kode & informasi sesi ---------- */
function alamatAbsen() {
  const url = new URL(BASE);
  const lokal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // Dibuka dari laptop server (localhost)? tampilkan IP jaringan agar bisa diketik mahasiswa
  if (lokal && IP_SERVER && !IP_SERVER.startsWith('127.') && IP_SERVER.includes('.')) url.hostname = IP_SERVER;
  return (url.host + url.pathname).replace(/\/$/, '');
}

function jamSetelah(teksMulai, detik) {
  const d = new Date(keDate(teksMulai).getTime() + detik * 1000);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function tampilkanSesi() {
  document.title = SESI.mata_kuliah + ' · Absensi UBBG';
  $('judulMk').textContent = SESI.mata_kuliah;
  $('metaSesi').textContent = `${tanggalPanjang(SESI.waktu_mulai)} · ${jamMenit(SESI.waktu_mulai)}–${jamMenit(SESI.waktu_tutup)} WIB · dibuat oleh ${SESI.dibuat_oleh}`;
  $('badgeSesi').innerHTML = badge(SESI.status);
  $('kodeBesar').textContent = formatKode(SESI.kode_sesi);
  $('alamatWeb').textContent = alamatAbsen();

  // Garis waktu: zona hadir (indigo) lalu zona terlambat (oranye)
  const durasi = Number(SESI.detik_durasi);
  const batas = Math.min(PENGGUNA.batas_hadir * 60, durasi);
  const rasio = durasi > 0 ? batas / durasi : 1;
  $('lini').style.setProperty('--hadir', (rasio * 100) + '%');
  $('lMulai').textContent = 'Mulai ' + jamMenit(SESI.waktu_mulai);
  $('lBatas').textContent = 'Batas hadir ' + jamSetelah(SESI.waktu_mulai, batas);
  $('lBatas').hidden = rasio < 0.22 || rasio > 0.78;   // sembunyikan jika label bertumpuk
  $('lTutup').textContent = 'Tutup ' + jamMenit(SESI.waktu_tutup);

  $('btnTutupSesi').hidden = SESI.status !== 'aktif';
  $('tandaLive').hidden = SESI.status === 'selesai';
  $('infoPerbarui').textContent = SESI.status === 'selesai'
    ? 'Sesi selesai. Mahasiswa tanpa data absen tercatat tidak hadir.'
    : 'Diperbarui otomatis setiap 5 detik.';
}

function perbaruiWaktu() {
  if (!SESI) return;
  const f = faseSesi(SESI, DIAMBIL, PENGGUNA.batas_hadir);
  $('lini').style.setProperty('--progres', Math.min(100, Math.max(0, f.progres * 100)) + '%');

  let teks, teksProyektor;
  if (f.fase === 'akan_datang') {
    teks = `${ikon('clock', 16)} Absen dibuka dalam <b>${hitungMundur(f.sisa)}</b>`;
    teksProyektor = `Absen dibuka dalam <b>${hitungMundur(f.sisa)}</b>`;
  } else if (f.fase === 'hadir') {
    teks = `${ikon('check-circle', 16)} Masih tepat waktu · <b>${hitungMundur(f.sisa)}</b> lagi`;
    teksProyektor = `Tepat waktu: <b>${hitungMundur(f.sisa)}</b> lagi`;
  } else if (f.fase === 'terlambat') {
    teks = `${ikon('alert-circle', 16)} Lewat batas hadir · ditutup dalam <b>${hitungMundur(f.sisa)}</b>`;
    teksProyektor = `Ditutup dalam <b>${hitungMundur(f.sisa)}</b>`;
  } else {
    teks = `${ikon('lock', 16)} Absen sudah ditutup pukul ${jamMenit(SESI.waktu_tutup)} WIB`;
    teksProyektor = 'Absen sudah ditutup';
  }
  $('hitungMundur').innerHTML = teks;
  $('pWaktu').innerHTML = teksProyektor;

  // Status sesi berganti (mulai / ditutup) -> ambil data terbaru dari server
  const statusSeharusnya = f.fase === 'akan_datang' ? 'akan_datang' : (f.fase === 'selesai' ? 'selesai' : 'aktif');
  if (statusSeharusnya !== SESI.status && !MEMUAT_ULANG) {
    MEMUAT_ULANG = true;
    setTimeout(() => muat(true).catch(() => {}).finally(() => { MEMUAT_ULANG = false; }), 1200);
  }
}


/* ---------- Daftar hadir ---------- */
function isiPilihanKelas() {
  const pilih = $('filterKelas');
  const dipilih = pilih.value;
  const kelas = [...new Set(DAFTAR.map(d => d.kelas))].sort();
  pilih.innerHTML = '<option value="">Semua kelas</option>' +
    kelas.map(k => `<option value="${esc(k)}" ${k === dipilih ? 'selected' : ''}>${esc(k)}</option>`).join('');
}

function tampilkanDaftar() {
  const kelas = $('filterKelas').value;
  const cari = $('cari').value.trim().toLowerCase();
  const perKelas = DAFTAR.filter(d => !kelas || d.kelas === kelas);

  // Angka ringkas (mengikuti filter kelas)
  const hadir = perKelas.filter(d => d.status === 'hadir').length;
  const terlambat = perKelas.filter(d => d.status === 'terlambat').length;
  const sisa = perKelas.length - hadir - terlambat;
  const persen = perKelas.length ? Math.round((hadir + terlambat) / perKelas.length * 100) : 0;
  const labelSisa = SESI.status === 'selesai' ? 'Tidak hadir' : 'Belum absen';

  $('mHadir').textContent = hadir;
  $('mTerlambat').textContent = terlambat;
  $('mSisa').textContent = sisa;
  $('mSisaLabel').textContent = labelSisa;
  $('fSisaLabel').textContent = labelSisa;
  $('mSisaSub').textContent = { selesai: 'tanpa data absen', aktif: 'masih bisa absen', akan_datang: 'sesi belum dimulai' }[SESI.status];
  $('cincin').style.setProperty('--p', persen);
  $('mPersen').textContent = persen + '%';
  $('mJumlah').textContent = hadir + terlambat;
  $('mTotal').textContent = perKelas.length;
  $('fSemua').textContent = perKelas.length;
  $('fHadir').textContent = hadir;
  $('fTerlambat').textContent = terlambat;
  $('fSisa').textContent = sisa;

  // Alamat IP yang dipakai lebih dari satu NIM (indikasi titip absen)
  const jumlahIp = {};
  DAFTAR.forEach(d => { if (d.ip_client) jumlahIp[d.ip_client] = (jumlahIp[d.ip_client] || 0) + 1; });

  const baris = perKelas
    .filter(d => FILTER === 'semua'
      || (FILTER === 'sisa' ? (d.status === 'belum' || d.status === 'tidak_hadir') : d.status === FILTER))
    .filter(d => d.nim.toLowerCase().includes(cari) || d.nama.toLowerCase().includes(cari));

  if (!baris.length) {
    $('isiTabel').innerHTML = `<tr><td colspan="7"><div class="kosong"><div class="kosong-ikon">${ikon('users', 24)}</div>
      <h3>Tidak ada data</h3><p>${DAFTAR.length ? 'Tidak ada mahasiswa yang cocok dengan filter.' : 'Belum ada mahasiswa terdaftar.'}</p></div></td></tr>`;
  } else {
    $('isiTabel').innerHTML = baris.map((d, i) => {
      const jam = d.waktu_absen ? d.waktu_absen.slice(11) : '–';
      const ganda = d.ip_client && jumlahIp[d.ip_client] > 1
        ? `<span class="tanda-ip" title="Alamat IP ini dipakai ${jumlahIp[d.ip_client]} NIM pada sesi ini">IP ×${jumlahIp[d.ip_client]}</span>` : '';
      const baru = SUDAH_ABSEN && d.waktu_absen && !SUDAH_ABSEN.has(d.nim) ? 'baru' : '';
      return `
        <tr class="${baru}">
          <td class="sembunyi-hp angka teks-redup">${i + 1}</td>
          <td class="sel-utama-hp">
            <div class="sel-nama">
              <span class="avatar avatar-sm">${esc(inisial(d.nama))}</span>
              <div><b>${esc(d.nama)}</b>
                <small>${esc(d.nim)}<span class="hanya-hp-inline"> · ${esc(d.kelas)}${d.waktu_absen ? ' · ' + jam : ''}</span></small>
                ${ganda ? `<span class="hanya-hp">${ganda}</span>` : ''}
              </div>
            </div>
          </td>
          <td class="sembunyi-hp"><span class="chip-kelas">${esc(d.kelas)}</span></td>
          <td class="sembunyi-hp angka">${jam}</td>
          <td class="sel-kanan-hp">${badge(d.status)}</td>
          <td class="sembunyi-hp"><span class="mono teks-kecil">${esc(d.ip_client || '–')}</span>${ganda}</td>
          <td class="kanan sel-aksi-hp">${d.waktu_absen ? `<button class="btn btn-teks bahaya btn-ikon btn-sm" type="button"
              data-hapus-absen="${esc(d.nim)}" title="Hapus absen" aria-label="Hapus absen ${esc(d.nama)}">${ikon('user-x', 16)}</button>` : ''}</td>
        </tr>`;
    }).join('');
  }
  SUDAH_ABSEN = new Set(DAFTAR.filter(d => d.waktu_absen).map(d => d.nim));
}

function tampilkanTidakAda() {
  $('judulMk').textContent = 'Sesi tidak ditemukan';
  $('metaSesi').textContent = 'Sesi mungkin sudah dihapus.';
  document.querySelector('.kepala-aksi').hidden = true;
  document.querySelector('.admin-isi').innerHTML = `<section class="kartu"><div class="kosong">
    <div class="kosong-ikon">${ikon('calendar', 24)}</div><h3>Sesi tidak ditemukan</h3>
    <p>Sesi ini tidak ada atau sudah dihapus.</p><a class="btn btn-utama btn-sm" href="sesi.html">Kembali ke daftar sesi</a></div></section>`;
  SESI = null;
}

document.querySelectorAll('#filterStatus button').forEach(tombol => {
  tombol.addEventListener('click', () => {
    FILTER = tombol.dataset.status;
    document.querySelectorAll('#filterStatus button').forEach(b => b.classList.toggle('aktif', b === tombol));
    tampilkanDaftar();
  });
});
$('filterKelas').addEventListener('change', tampilkanDaftar);
$('cari').addEventListener('input', tampilkanDaftar);

// Hapus absen satu mahasiswa (jika tidak benar-benar hadir / menitip absen)
$('isiTabel').addEventListener('click', async (e) => {
  const tombol = e.target.closest('[data-hapus-absen]');
  if (!tombol) return;
  const mhs = DAFTAR.find(d => d.nim === tombol.dataset.hapusAbsen);
  const masihBerjalan = SESI.status === 'aktif';

  const ya = await konfirmasi({
    judul: 'Hapus absen mahasiswa ini?',
    pesan: `Absen ${mhs.nama} (${mhs.nim}) pukul ${mhs.waktu_absen.slice(11, 16)} akan dihapus dan tercatat `
      + (masihBerjalan ? 'belum absen. Selama sesi masih berlangsung, NIM ini masih bisa absen lagi.' : 'tidak hadir.'),
    tombol: 'Hapus absen',
  });
  if (!ya) return;

  try {
    await api('sesi.php?aksi=hapus_absen', { id: ID, nim: mhs.nim });
    toast('Absen ' + mhs.nama + ' dihapus.');
    await muat(true);
  } catch (err) { toast(err.message, 'gagal'); }
});


/* ---------- Tombol aksi ---------- */
$('btnSalin').addEventListener('click', async () => {
  await salin(SESI.kode_sesi);
  toast('Kode ' + formatKode(SESI.kode_sesi) + ' disalin.');
});

$('btnCsv').addEventListener('click', () => {
  unduh('sesi.php?aksi=detail&id=' + encodeURIComponent(ID) + '&format=csv');
});

$('btnTutupSesi').addEventListener('click', async () => {
  const ya = await konfirmasi({
    judul: 'Tutup absen sekarang?',
    pesan: 'Mahasiswa tidak bisa absen lagi pada sesi ini. Yang belum absen akan tercatat tidak hadir.',
    tombol: 'Tutup absen',
  });
  if (!ya) return;
  try {
    await api('sesi.php?aksi=tutup', { id: ID });
    toast('Absen ditutup.');
    await muat(true);
  } catch (err) { toast(err.message, 'gagal'); }
});

$('btnHapus').addEventListener('click', async () => {
  const ya = await konfirmasi({
    judul: 'Hapus sesi ini?',
    pesan: `Sesi "${SESI.mata_kuliah}" beserta semua data absensinya akan dihapus permanen.`,
    tombol: 'Hapus sesi',
  });
  if (!ya) return;
  try {
    await api('sesi.php?aksi=hapus', { id: ID });
    location.href = 'sesi.html';
  } catch (err) { toast(err.message, 'gagal'); }
});


/* ---------- Mode proyektor (layar penuh untuk ditampilkan di kelas) ---------- */
function isiProyektor() {
  $('pMk').textContent = SESI.mata_kuliah;
  $('pUrl').textContent = alamatAbsen();
  $('pKode').textContent = formatKode(SESI.kode_sesi);
  $('pJumlah').textContent = DAFTAR.filter(d => d.waktu_absen).length;
}
function bukaProyektor() {
  if (!SESI) return;
  isiProyektor();
  perbaruiWaktu();
  $('proyektor').hidden = false;
  if ($('proyektor').requestFullscreen) $('proyektor').requestFullscreen().catch(() => {});
}
function tutupProyektor() {
  $('proyektor').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
$('btnProyektor').addEventListener('click', bukaProyektor);
$('btnTutupProyektor').addEventListener('click', tutupProyektor);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('proyektor').hidden) tutupProyektor(); });
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && !$('proyektor').hidden) $('proyektor').hidden = true;
});

mulai().catch(err => toast(err.message, 'gagal'));
