/* ==============================================================
   DASHBOARD.JS - halaman beranda admin (admin/index.html)
   Data diperbarui otomatis setiap 5 detik.
   ============================================================== */

let SESI = [];             // daftar sesi terakhir dari server
let DIAMBIL = 0;           // waktu (performance.now) saat data diambil
let FEED_LAMA = null;      // penanda absen yang sudah pernah tampil

async function mulai() {
  await siapkanAdmin();
  const kini = new Date();
  document.getElementById('sapaan').textContent = sapaan();
  document.getElementById('namaSapa').textContent = PENGGUNA.nama;
  document.getElementById('tanggalHariIni').textContent =
    `${HARI[kini.getDay()]}, ${kini.getDate()} ${BULAN[kini.getMonth()]} ${kini.getFullYear()}`;

  ulangi(muatData, 5000);
  setInterval(perbaruiHitungMundur, 1000);
}

async function muatData() {
  const [ringkas, sesi] = await Promise.all([api('dashboard.php'), api('sesi.php?aksi=daftar')]);
  SESI = sesi;
  DIAMBIL = performance.now();

  tampilkanRingkasan(ringkas, sesi);
  tampilkanSesiAktif(sesi.filter(s => s.status === 'aktif'));
  tampilkanFeed(ringkas.aktivitas);
  tampilkanGrafik(sesi.filter(s => s.status !== 'akan_datang').slice(0, 8).reverse());
}


/* ---------- Ringkasan angka ---------- */
function tampilkanRingkasan(r, sesi) {
  const aktif = sesi.filter(s => s.status === 'aktif').length;
  const akanDatang = sesi.filter(s => s.status === 'akan_datang').length;
  const selesai = sesi.filter(s => s.status === 'selesai');

  document.getElementById('sMahasiswa').textContent = r.jumlah_mahasiswa;
  document.getElementById('sMahasiswaSub').textContent = r.jumlah_kelas + ' kelas';

  document.getElementById('sAktif').textContent = aktif;
  document.getElementById('sAktifSub').textContent = akanDatang ? akanDatang + ' sesi terjadwal' : 'Tidak ada sesi terjadwal';

  document.getElementById('sHariIni').textContent = r.hadir_hari_ini + r.terlambat_hari_ini;
  document.getElementById('sHariIniSub').textContent = r.hadir_hari_ini + ' hadir · ' + r.terlambat_hari_ini + ' terlambat';

  // Rata-rata kehadiran dari sesi yang sudah selesai
  let datang = 0, seharusnya = 0;
  selesai.forEach(s => { datang += Number(s.hadir) + Number(s.terlambat); seharusnya += Number(s.total); });
  document.getElementById('sRata').textContent = seharusnya ? Math.round(datang / seharusnya * 100) + '%' : '–';
  document.getElementById('sRataSub').textContent = 'dari ' + selesai.length + ' sesi selesai';
}


/* ---------- Sesi berlangsung ---------- */
function tampilkanSesiAktif(daftar) {
  const wadah = document.getElementById('daftarAktif');
  if (!daftar.length) {
    wadah.innerHTML = `
      <div class="kosong">
        <div class="kosong-ikon">${ikon('calendar', 24)}</div>
        <h3>Belum ada sesi berlangsung</h3>
        <p>Buat sesi untuk mendapatkan kode absen, lalu tampilkan kodenya di kelas.</p>
        <a class="btn btn-utama btn-sm" href="sesi.html?buat=1">${ikon('plus', 16)}Buat Sesi</a>
      </div>`;
    return;
  }
  wadah.innerHTML = daftar.map(s => `
    <a class="item-aktif" href="sesi-detail.html?id=${s.id_sesi}">
      <div>
        <h3>${esc(s.mata_kuliah)}</h3>
        <div class="item-aktif-meta">
          <span>${ikon('clock', 13)} ${jamMenit(s.waktu_mulai)}–${jamMenit(s.waktu_tutup)} WIB</span>
          <span><b>${Number(s.hadir) + Number(s.terlambat)}</b> / ${s.total} sudah absen</span>
          <span class="hitung" data-id="${s.id_sesi}"></span>
        </div>
      </div>
      <div class="item-aktif-kode"><small>Kode</small><b>${formatKode(s.kode_sesi)}</b></div>
      ${barTumpuk(s.hadir, s.terlambat, s.total)}
    </a>`).join('');
  perbaruiHitungMundur();
}

function perbaruiHitungMundur() {
  document.querySelectorAll('.hitung[data-id]').forEach(el => {
    const sesi = SESI.find(s => String(s.id_sesi) === el.dataset.id);
    if (!sesi) return;
    const f = faseSesi(sesi, DIAMBIL, PENGGUNA.batas_hadir);
    if (f.fase === 'hadir') el.innerHTML = `Tepat waktu · <b>${hitungMundur(f.sisa)}</b> lagi`;
    else if (f.fase === 'terlambat') el.innerHTML = `Ditutup dalam <b>${hitungMundur(f.sisa)}</b>`;
    else el.textContent = 'Absen ditutup';
  });
}


/* ---------- Absen terbaru ---------- */
function tampilkanFeed(daftar) {
  const wadah = document.getElementById('feed');
  if (!daftar.length) {
    wadah.innerHTML = `<div class="kosong"><div class="kosong-ikon">${ikon('user-check', 24)}</div><h3>Belum ada absen</h3><p>Kehadiran yang masuk akan tampil di sini.</p></div>`;
    return;
  }
  const kunci = a => a.nim + a.waktu_absen;
  wadah.innerHTML = daftar.map(a => `
    <div class="feed-item ${FEED_LAMA && !FEED_LAMA.has(kunci(a)) ? 'baru' : ''}">
      <span class="avatar avatar-sm">${esc(inisial(a.nama))}</span>
      <div class="teks">
        <b>${esc(a.nama)}</b>
        <small>${esc(a.mata_kuliah)} · ${waktuLalu(a.detik_lalu)}</small>
      </div>
      ${badge(a.status)}
    </div>`).join('');
  FEED_LAMA = new Set(daftar.map(kunci));
}


/* ---------- Grafik kehadiran per sesi ---------- */
function tampilkanGrafik(daftar) {
  const wadah = document.getElementById('grafik');
  if (!daftar.length) {
    wadah.innerHTML = `<div class="kosong" style="flex:1"><p>Grafik muncul setelah ada sesi.</p></div>`;
    return;
  }
  wadah.innerHTML = daftar.map(s => {
    const total = Number(s.total) || 0;
    const hadir = Number(s.hadir), terlambat = Number(s.terlambat);
    const tidak = s.status === 'selesai' ? Math.max(0, total - hadir - terlambat) : 0;
    const persen = total ? Math.round((hadir + terlambat) / total * 100) : 0;
    const tinggi = n => (total ? n / total * 100 : 0) + '%';
    return `
      <a class="grafik-kolom" href="sesi-detail.html?id=${s.id_sesi}"
         title="${esc(s.mata_kuliah)} · ${tanggalPanjang(s.waktu_mulai)}&#10;${hadir} hadir, ${terlambat} terlambat, ${tidak} tidak hadir">
        <span class="grafik-persen">${persen}%</span>
        <span class="grafik-batang">
          <span class="seg-hadir" style="height:${tinggi(hadir)}"></span>
          <span class="seg-terlambat" style="height:${tinggi(terlambat)}"></span>
          <span class="seg-tidak" style="height:${tinggi(tidak)}"></span>
        </span>
        <span class="grafik-label"><b>${esc(singkatan(s.mata_kuliah))}</b>${tanggalSingkat(s.waktu_mulai)}</span>
      </a>`;
  }).join('');
}

mulai().catch(err => toast(err.message, 'gagal'));
