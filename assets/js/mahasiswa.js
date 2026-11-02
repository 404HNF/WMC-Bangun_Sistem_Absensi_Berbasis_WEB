/* ==============================================================
   MAHASISWA.JS - kelola data mahasiswa (admin/mahasiswa.html)
   ============================================================== */

let SEMUA = [];
let MODE = 'tambah';   // 'tambah' atau 'ubah'

const $ = id => document.getElementById(id);
const form = $('formMhs');

async function mulai() {
  await siapkanAdmin();
  await muat();
}

async function muat() {
  SEMUA = await api('mahasiswa.php?aksi=daftar');
  const kelas = [...new Set(SEMUA.map(m => m.kelas))].sort();

  // isi pilihan filter kelas & saran kelas di form
  const dipilih = $('filterKelas').value;
  $('filterKelas').innerHTML = '<option value="">Semua kelas</option>' +
    kelas.map(k => `<option value="${esc(k)}" ${k === dipilih ? 'selected' : ''}>${esc(k)}</option>`).join('');
  $('daftarKelas').innerHTML = kelas.map(k => `<option value="${esc(k)}">`).join('');
  $('ringkasMhs').textContent = `${SEMUA.length} mahasiswa terdaftar dalam ${kelas.length} kelas. Hanya NIM yang terdaftar yang dapat melakukan absen.`;
  tampilkan();
}

function tampilkan() {
  const cari = $('cari').value.trim().toLowerCase();
  const kelas = $('filterKelas').value;
  const daftar = SEMUA.filter(m =>
    (!kelas || m.kelas === kelas) &&
    (m.nim.toLowerCase().includes(cari) || m.nama.toLowerCase().includes(cari)));

  $('infoJumlah').textContent = `Menampilkan ${daftar.length} dari ${SEMUA.length}`;

  if (!daftar.length) {
    $('isiTabel').innerHTML = `<tr><td colspan="5"><div class="kosong"><div class="kosong-ikon">${ikon('users', 24)}</div>
      <h3>${SEMUA.length ? 'Tidak ada yang cocok' : 'Belum ada mahasiswa'}</h3>
      <p>${SEMUA.length ? 'Coba kata pencarian atau kelas lain.' : 'Tambahkan mahasiswa agar mereka bisa melakukan absen.'}</p></div></td></tr>`;
    return;
  }

  $('isiTabel').innerHTML = daftar.map(m => `
    <tr>
      <td>
        <div class="sel-nama">
          <span class="avatar avatar-sm">${esc(inisial(m.nama))}</span>
          <div><b>${esc(m.nama)}</b><small class="hanya-hp">${esc(m.nim)} · ${esc(m.kelas)}</small></div>
        </div>
      </td>
      <td class="sembunyi-hp mono">${esc(m.nim)}</td>
      <td class="sembunyi-hp"><span class="chip-kelas">${esc(m.kelas)}</span></td>
      <td class="sembunyi-hp teks-kecil">${tanggalPendek(m.dibuat_pada)}</td>
      <td class="sel-kanan-hp">
        <div class="sel-aksi">
          <button class="btn btn-teks btn-ikon btn-sm" title="Ubah" aria-label="Ubah ${esc(m.nama)}" data-ubah="${esc(m.nim)}">${ikon('edit', 16)}</button>
          <button class="btn btn-teks btn-ikon btn-sm" title="Hapus" aria-label="Hapus ${esc(m.nama)}" data-hapus="${esc(m.nim)}">${ikon('trash', 16)}</button>
        </div>
      </td>
    </tr>`).join('');
}

$('cari').addEventListener('input', tampilkan);
$('filterKelas').addEventListener('change', tampilkan);

// Tombol ubah / hapus di setiap baris tabel
$('isiTabel').addEventListener('click', e => {
  const ubah = e.target.closest('[data-ubah]');
  const hapusBtn = e.target.closest('[data-hapus]');
  if (ubah) bukaForm(ubah.dataset.ubah);
  if (hapusBtn) hapus(hapusBtn.dataset.hapus);
});


/* ---------- Form tambah / ubah ---------- */
function bukaForm(nim = null) {
  form.reset();
  $('pesanMhs').hidden = true;
  const mhs = SEMUA.find(m => m.nim === nim);
  MODE = mhs ? 'ubah' : 'tambah';

  $('judulModalMhs').textContent = mhs ? 'Ubah Data Mahasiswa' : 'Tambah Mahasiswa';
  $('subModalMhs').textContent = mhs ? 'NIM tidak dapat diubah karena menjadi kunci data absensi.' : 'NIM dipakai mahasiswa untuk absen.';
  $('nim').readOnly = !!mhs;
  if (mhs) {
    $('nim').value = mhs.nim;
    $('nama').value = mhs.nama;
    $('kelas').value = mhs.kelas;
  } else if ($('filterKelas').value) {
    $('kelas').value = $('filterKelas').value;   // isi otomatis sesuai filter kelas
  }
  bukaModal('modalMhs');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pesan = $('pesanMhs');
  const tombol = $('btnSimpanMhs');
  const tampilkanPesan = teks => { pesan.innerHTML = ikon('alert-circle') + `<span>${esc(teks)}</span>`; pesan.hidden = false; };
  pesan.hidden = true;

  if (!$('nim').value.trim() || !$('nama').value.trim() || !$('kelas').value.trim()) {
    return tampilkanPesan('NIM, nama, dan kelas wajib diisi.');
  }
  if (!/^[A-Za-z0-9.\-]{3,20}$/.test($('nim').value.trim())) {
    return tampilkanPesan('NIM hanya boleh berisi huruf/angka (3–20 karakter).');
  }

  tombolMemuat(tombol, true, 'Menyimpan…');
  try {
    await api('mahasiswa.php?aksi=' + MODE, new FormData(form));
    tutupModal('modalMhs');
    toast(MODE === 'tambah' ? $('nama').value.trim() + ' berhasil ditambahkan.' : 'Data ' + $('nama').value.trim() + ' diperbarui.');
    await muat();
  } catch (err) {
    tampilkanPesan(err.message);
  }
  tombolMemuat(tombol, false);
});

async function hapus(nim) {
  const mhs = SEMUA.find(m => m.nim === nim);
  const ya = await konfirmasi({
    judul: 'Hapus mahasiswa?',
    pesan: `${mhs.nama} (${mhs.nim}) akan dihapus beserta seluruh data absensinya.`,
    tombol: 'Hapus',
  });
  if (!ya) return;
  try {
    await api('mahasiswa.php?aksi=hapus', { nim });
    toast(mhs.nama + ' telah dihapus.');
    await muat();
  } catch (err) { toast(err.message, 'gagal'); }
}

$('btnTambah').addEventListener('click', () => bukaForm());

mulai().catch(err => toast(err.message, 'gagal'));
