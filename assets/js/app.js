/* ==============================================================
   APP.JS - fungsi bersama untuk semua halaman
   ============================================================== */

// Alamat folder aplikasi, dihitung dari lokasi file ini.
// Contoh: http://192.168.1.10/absensi/
const BASE = document.currentScript.src.replace(/assets\/js\/app\.js.*$/, '');


/* ---------- 1. IKON SVG (Feather Icons, lisensi MIT) ---------- */
const IKON = {
  'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="13.5" x2="12" y2="18.5"/><line x1="9.5" y1="16" x2="14.5" y2="16"/>',
  'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  'user-check': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  'bar-chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  'edit': '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'copy': '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  'wifi': '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  'hash': '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  'percent': '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  'power': '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
  'smartphone': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  'grad': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  'user-x': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
};

function ikon(nama, ukuran = 18) {
  return `<svg class="ikon-svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[nama] || ''}</svg>`;
}

// Ubah semua <i data-ikon="nama"></i> di HTML menjadi gambar SVG
function pasangIkon(akar = document) {
  akar.querySelectorAll('[data-ikon]').forEach(el => {
    el.outerHTML = ikon(el.dataset.ikon, el.dataset.ukuran || 18);
  });
}


/* ---------- 2. MEMANGGIL API PHP (fetch / AJAX) ---------- */
// GET  : api('sesi.php?aksi=daftar')
// POST : api('sesi.php?aksi=buat', formData)  atau  api('...', { id: 3 })
async function api(alamat, data = null) {
  const opsi = { method: 'GET', headers: { 'Accept': 'application/json' } };
  if (data) {
    opsi.method = 'POST';
    if (data instanceof FormData) {
      opsi.body = data;
    } else {
      opsi.body = new FormData();
      for (const kunci in data) opsi.body.append(kunci, data[kunci]);
    }
  }

  // Batalkan permintaan jika server tidak menjawab dalam 10 detik
  const kontrol = new AbortController();
  const batasWaktu = setTimeout(() => kontrol.abort(), 10000);
  opsi.signal = kontrol.signal;

  let respon;
  try {
    respon = await fetch(BASE + 'api/' + alamat, opsi);
  } catch (e) {
    const galat = new Error(e.name === 'AbortError'
      ? 'Server terlalu lama merespons. Periksa koneksi Wi-Fi, lalu coba lagi.'
      : 'Tidak dapat terhubung ke server. Periksa koneksi Wi-Fi, lalu coba lagi.');
    galat.jaringan = true;
    throw galat;
  } finally {
    clearTimeout(batasWaktu);
  }

  let hasil;
  try {
    hasil = await respon.json();
  } catch (e) {
    throw new Error('Balasan server tidak valid (HTTP ' + respon.status + '). Pastikan Apache & MySQL di XAMPP berjalan.');
  }

  // Login habis -> kembali ke halaman login (khusus halaman admin)
  if (respon.status === 401 && document.body.classList.contains('hal-admin')) {
    location.href = 'login.html';
  }
  if (!hasil.sukses) {
    const galat = new Error(hasil.pesan || 'Terjadi kesalahan.');
    galat.status = respon.status;
    throw galat;
  }
  return hasil.data;
}


/* ---------- 3. FORMAT TEKS & WAKTU ---------- */
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// "2026-10-12 08:00:00" -> Date (dibaca apa adanya, tanpa konversi zona waktu)
function keDate(teks) {
  const [tgl, jam = '00:00:00'] = String(teks).split(' ');
  const [y, m, d] = tgl.split('-').map(Number);
  const [h, i, s] = jam.split(':').map(Number);
  return new Date(y, m - 1, d, h, i, s || 0);
}
function tanggalPanjang(teks) {
  const t = keDate(teks);
  return `${HARI[t.getDay()]}, ${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}
function tanggalPendek(teks) {
  const t = keDate(teks);
  return `${HARI[t.getDay()].slice(0, 3)}, ${t.getDate()} ${BULAN[t.getMonth()].slice(0, 3)} ${t.getFullYear()}`;
}
function tanggalSingkat(teks) {
  const t = keDate(teks);
  return `${t.getDate()} ${BULAN[t.getMonth()].slice(0, 3)}`;
}
function jamMenit(teks) { return String(teks).slice(11, 16); }

function hitungMundur(detik) {
  detik = Math.max(0, Math.floor(detik));
  const dua = n => String(n).padStart(2, '0');
  const j = Math.floor(detik / 3600), m = Math.floor(detik % 3600 / 60), s = detik % 60;
  return (j > 0 ? j + ':' + dua(m) : dua(m)) + ':' + dua(s);
}
function waktuLalu(detik) {
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return Math.floor(detik / 60) + ' mnt lalu';
  if (detik < 86400) return Math.floor(detik / 3600) + ' jam lalu';
  return Math.floor(detik / 86400) + ' hari lalu';
}
function formatKode(kode) { return String(kode).slice(0, 3) + ' ' + String(kode).slice(3); }
function esc(teks) {
  return String(teks ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function inisial(nama) {
  return String(nama).trim().split(/\s+/).slice(0, 2).map(k => k[0]).join('').toUpperCase();
}
function singkatan(mk) {
  if (mk.length <= 12) return mk;
  return mk.split(/[\s\/\-]+/).filter(Boolean).map(k => k[0]).join('').toUpperCase().slice(0, 5);
}
function sapaan() {
  const j = new Date().getHours();
  if (j < 4) return 'Selamat malam';
  return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
}


/* ---------- 4. STATUS, BADGE, DAN BAR ---------- */
const LABEL_STATUS = { hadir: 'Hadir', terlambat: 'Terlambat', tidak_hadir: 'Tidak hadir', belum: 'Belum absen' };
const LABEL_SESI = { aktif: 'Berlangsung', akan_datang: 'Terjadwal', selesai: 'Selesai' };

function badge(status) {
  return `<span class="badge badge-${status}">${LABEL_STATUS[status] || LABEL_SESI[status] || status}</span>`;
}
function barPersen(persen) {
  if (persen === null || persen === undefined) return '<span class="teks-redup">–</span>';
  const p = Number(persen);
  const warna = p >= 75 ? '' : (p >= 50 ? 'sedang' : 'rendah');
  return `<div class="bar-persen"><div class="jalur"><div class="isi ${warna}" style="width:${p}%"></div></div><b>${p}%</b></div>`;
}
function barTumpuk(hadir, terlambat, total, sisaMerah = false) {
  hadir = Number(hadir); terlambat = Number(terlambat); total = Number(total) || 1;
  const sisa = Math.max(0, total - hadir - terlambat);
  return `<div class="bar-tumpuk" role="img" aria-label="${hadir} hadir, ${terlambat} terlambat dari ${total}">
    <span class="seg-hadir" style="width:${hadir / total * 100}%"></span>
    <span class="seg-terlambat" style="width:${terlambat / total * 100}%"></span>
    ${sisaMerah ? `<span class="seg-tidak" style="width:${sisa / total * 100}%"></span>` : ''}
  </div>`;
}

// Hitung fase waktu sesi: detik_berjalan dari server + waktu yang lewat sejak data diambil
function faseSesi(sesi, diambilPada, batasHadirMenit) {
  const berjalan = Number(sesi.detik_berjalan) + (performance.now() - diambilPada) / 1000;
  const durasi = Number(sesi.detik_durasi);
  const batas = Math.min(batasHadirMenit * 60, durasi);
  if (berjalan < 0) return { fase: 'akan_datang', sisa: -berjalan, progres: 0 };
  if (berjalan <= batas) return { fase: 'hadir', sisa: batas - berjalan, progres: berjalan / durasi };
  if (berjalan <= durasi) return { fase: 'terlambat', sisa: durasi - berjalan, progres: berjalan / durasi };
  return { fase: 'selesai', sisa: 0, progres: 1 };
}


/* ---------- 5. TOAST (notifikasi kecil) ---------- */
function toast(pesan, jenis = 'sukses') {
  let wadah = document.querySelector('.toast-wadah');
  if (!wadah) {
    wadah = document.createElement('div');
    wadah.className = 'toast-wadah';
    wadah.setAttribute('aria-live', 'polite');
    document.body.appendChild(wadah);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + jenis;
  el.innerHTML = ikon(jenis === 'gagal' ? 'alert-circle' : 'check-circle', 18) + `<span>${esc(pesan)}</span>`;
  wadah.appendChild(el);
  setTimeout(() => { el.classList.add('keluar'); setTimeout(() => el.remove(), 300); }, 4200);
}


/* ---------- 6. MODAL & KONFIRMASI ---------- */
function bukaModal(id) {
  const modal = document.getElementById(id);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  // Fokus otomatis ke isian pertama (hanya di layar lebar agar keyboard HP tidak langsung muncul)
  const isian = modal.querySelector('input:not([type=hidden]):not([readonly]), select');
  if (isian && window.innerWidth > 720) setTimeout(() => isian.focus(), 60);
}
function tutupModal(id) {
  document.getElementById(id).hidden = true;
  if (!document.querySelector('.modal:not([hidden])')) document.body.style.overflow = '';
}
document.addEventListener('click', e => {
  const tombol = e.target.closest('[data-tutup]');
  if (tombol && tombol.closest('.modal')) tutupModal(tombol.closest('.modal').id);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(m => tutupModal(m.id));
});

// Dialog "Yakin?" -> menghasilkan true / false
function konfirmasi({ judul, pesan, tombol = 'Ya, lanjutkan', bahaya = true }) {
  let modal = document.getElementById('modalKonfirmasi');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalKonfirmasi';
    modal.className = 'modal modal-konfirmasi';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal-latar" data-tutup></div>
      <div class="modal-kotak" role="alertdialog" aria-modal="true" aria-labelledby="konfJudul">
        <div class="modal-badan" style="padding-top:24px">
          <div class="konfirmasi-ikon" id="konfIkon"></div>
          <h2 id="konfJudul" style="font:800 20px/1.3 var(--font-judul);letter-spacing:-.02em"></h2>
          <p id="konfPesan" class="teks-kecil" style="margin-top:8px;font-size:14px;line-height:1.6"></p>
        </div>
        <div class="modal-kaki" style="padding-top:18px">
          <button class="btn btn-garis" id="konfBatal">Batal</button>
          <button class="btn" id="konfYa"></button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.querySelector('#konfIkon').className = 'konfirmasi-ikon' + (bahaya ? '' : ' info');
  modal.querySelector('#konfIkon').innerHTML = ikon(bahaya ? 'alert-triangle' : 'info', 22);
  modal.querySelector('#konfJudul').textContent = judul;
  modal.querySelector('#konfPesan').textContent = pesan;
  const ya = modal.querySelector('#konfYa');
  ya.textContent = tombol;
  ya.className = 'btn ' + (bahaya ? 'btn-bahaya' : 'btn-utama');
  bukaModal('modalKonfirmasi');
  ya.focus();

  return new Promise(selesai => {
    const tutup = hasil => {
      tutupModal('modalKonfirmasi');
      ya.onclick = null; modal.querySelector('#konfBatal').onclick = null;
      selesai(hasil);
    };
    ya.onclick = () => tutup(true);
    modal.querySelector('#konfBatal').onclick = () => tutup(false);
    modal.querySelector('.modal-latar').onclick = () => tutup(false);
  });
}


/* ---------- 7. BANTUAN LAIN ---------- */
// Jalankan fungsi sekarang, lalu ulangi setiap "ms" milidetik (dijeda saat tab tidak terlihat).
// Pesan error hanya ditampilkan sekali selama server masih bermasalah.
function ulangi(fungsi, ms) {
  let sibuk = false, sedangGagal = false;
  const jalankan = async () => {
    if (sibuk || document.hidden) return;
    sibuk = true;
    try {
      await fungsi();
      sedangGagal = false;
    } catch (err) {
      if (!sedangGagal) toast(err.message, 'gagal');
      sedangGagal = true;
    } finally {
      sibuk = false;
    }
  };
  setInterval(jalankan, ms);
  document.addEventListener('visibilitychange', jalankan);
  return jalankan();   // selesai setelah pemanggilan pertama
}

// Ubah tombol menjadi status "memuat"
function tombolMemuat(tombol, memuat, teks = 'Memproses…') {
  if (memuat) {
    tombol.dataset.asli = tombol.innerHTML;
    tombol.disabled = true;
    tombol.innerHTML = `<span class="putar"></span><span>${teks}</span>`;
  } else {
    tombol.disabled = false;
    if (tombol.dataset.asli) tombol.innerHTML = tombol.dataset.asli;
  }
}

// Unduh file CSV dari API (memakai link biasa agar cookie login ikut terkirim)
function unduh(alamat) {
  const a = document.createElement('a');
  a.href = BASE + 'api/' + alamat;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Salin teks ke clipboard (dengan cadangan untuk http biasa)
async function salin(teks) {
  try {
    await navigator.clipboard.writeText(teks);
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = teks;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}


/* ---------- 8. TATA LETAK HALAMAN ADMIN ---------- */
const MENU = [
  { id: 'beranda', label: 'Beranda', href: 'index.html', ikon: 'home' },
  { id: 'sesi', label: 'Sesi', href: 'sesi.html', ikon: 'calendar' },
  { id: 'mahasiswa', label: 'Mahasiswa', href: 'mahasiswa.html', ikon: 'users' },
  { id: 'rekap', label: 'Rekap', href: 'rekap.html', ikon: 'bar-chart' },
  { id: 'pengguna', label: 'Pengguna', href: 'pengguna.html', ikon: 'shield' },
];
let PENGGUNA = null;   // data akun yang login + aturan batas hadir

async function siapkanAdmin() {
  const aktif = document.body.dataset.halaman;

  document.getElementById('navbar').innerHTML = `
    <nav class="navbar">
      <a class="brand" href="index.html">
        <span class="brand-logo"><img src="../assets/img/logo-ubbg-emblem.png" alt="Logo UBBG"></span>
        <span class="brand-teks"><b>Absensi <span>UBBG</span></b><small>Panel Dosen &amp; Admin</small></span>
      </a>
      <div class="nav-tautan">
        ${MENU.map(m => `<a href="${m.href}" class="${m.id === aktif ? 'aktif' : ''}">${m.label}</a>`).join('')}
      </div>
      <div class="nav-kanan">
        <button class="btn btn-kaca btn-ikon btn-tema" type="button" data-tema-toggle aria-label="Ganti tema"></button>
        <div class="user-chip" title="Akun yang sedang login">
          <span class="avatar oranye" id="userAvatar">··</span>
          <span class="user-chip-teks"><b id="userNama">Memuat…</b><small id="userUsername">&nbsp;</small></span>
        </div>
        <button class="btn btn-kaca btn-ikon" id="btnKeluar" title="Keluar" aria-label="Keluar">${ikon('log-out')}</button>
      </div>
    </nav>`;

  const navBawah = document.createElement('nav');
  navBawah.className = 'nav-bawah';
  navBawah.setAttribute('aria-label', 'Menu utama');
  navBawah.innerHTML = MENU.map(m =>
    `<a href="${m.href}" class="${m.id === aktif ? 'aktif' : ''}">${ikon(m.ikon, 20)}<span>${m.label}</span></a>`).join('');
  document.body.appendChild(navBawah);
  document.getElementById('btnKeluar').addEventListener('click', keluar);
  perbaruiTombolTema();

  PENGGUNA = await api('auth.php?aksi=cek');
  document.getElementById('userNama').textContent = PENGGUNA.nama;
  document.getElementById('userUsername').textContent = '@' + PENGGUNA.username;
  document.getElementById('userAvatar').textContent = inisial(PENGGUNA.nama);
  return PENGGUNA;
}

async function keluar() {
  const ya = await konfirmasi({
    judul: 'Keluar dari panel?', pesan: 'Anda perlu login kembali untuk mengelola sesi dan rekap.',
    tombol: 'Keluar', bahaya: false,
  });
  if (!ya) return;
  try { await api('auth.php?aksi=logout', {}); } catch (e) { /* abaikan */ }
  location.href = 'login.html';
}


/* ---------- 9. TEMA TERANG / GELAP ---------- */
// Tema dipasang paling awal oleh skrip kecil di <head>. Pilihan disimpan di browser (localStorage).
function temaSekarang() {
  return document.documentElement.getAttribute('data-tema') === 'gelap' ? 'gelap' : 'terang';
}
function aturTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  try { localStorage.setItem('tema', tema); } catch (e) { /* penyimpanan browser tidak tersedia */ }
  perbaruiTombolTema();
}
function perbaruiTombolTema() {
  const gelap = temaSekarang() === 'gelap';
  document.querySelectorAll('[data-tema-toggle]').forEach(tombol => {
    tombol.innerHTML = ikon(gelap ? 'sun' : 'moon', 18);
    tombol.title = gelap ? 'Mode terang' : 'Mode gelap';
    tombol.setAttribute('aria-label', gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
  });
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-tema-toggle]')) aturTema(temaSekarang() === 'gelap' ? 'terang' : 'gelap');
});


/* ---------- 10. TOMBOL UP (kembali ke atas) ---------- */
const tombolAtas = document.createElement('button');
tombolAtas.type = 'button';
tombolAtas.className = 'tombol-atas';
tombolAtas.setAttribute('aria-label', 'Kembali ke atas');
tombolAtas.innerHTML = ikon('arrow-up', 18) + '<span>UP</span>';
tombolAtas.addEventListener('click', () => {
  const halus = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: halus ? 'smooth' : 'auto' });
});
document.body.appendChild(tombolAtas);

// Tombol muncul setelah halaman digulir ke bawah lebih dari 400px
function cekPosisiScroll() {
  tombolAtas.classList.toggle('tampil', window.scrollY > 400);
}
window.addEventListener('scroll', cekPosisiScroll, { passive: true });


/* ---------- 11. SAAT HALAMAN DIBUKA ---------- */
pasangIkon();
perbaruiTombolTema();
cekPosisiScroll();
if (location.protocol === 'file:') {
  setTimeout(() => toast('Buka aplikasi lewat http://localhost/absensi (bukan klik dua kali file HTML) agar PHP bisa berjalan.', 'gagal'), 400);
}
