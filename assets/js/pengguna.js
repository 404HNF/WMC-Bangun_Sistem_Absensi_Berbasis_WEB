/* ==============================================================
   PENGGUNA.JS - kelola akun dosen & admin (admin/pengguna.html)
   ============================================================== */

let SEMUA = [];
let ID_SAYA = null;
let MODE = 'tambah';

const $ = id => document.getElementById(id);
const form = $('formPengguna');

async function mulai() {
  await siapkanAdmin();
  await muat();
}

async function muat() {
  const data = await api('pengguna.php?aksi=daftar');
  SEMUA = data.pengguna;
  ID_SAYA = String(data.id_saya);

  $('isiTabel').innerHTML = SEMUA.map(p => {
    const saya = String(p.id_pengguna) === ID_SAYA;
    return `
      <tr>
        <td>
          <div class="sel-nama">
            <span class="avatar avatar-sm ${saya ? 'oranye' : ''}">${esc(inisial(p.nama))}</span>
            <div><b>${esc(p.nama)} ${saya ? '<span class="chip-kelas">Anda</span>' : ''}</b>
              <small class="hanya-hp">@${esc(p.username)} · ${p.jumlah_sesi} sesi</small></div>
          </div>
        </td>
        <td class="sembunyi-hp mono">@${esc(p.username)}</td>
        <td class="sembunyi-hp kanan angka">${p.jumlah_sesi}</td>
        <td class="sel-kanan-hp">
          <div class="sel-aksi">
            <button class="btn btn-teks btn-ikon btn-sm" title="Ubah" aria-label="Ubah ${esc(p.nama)}" data-ubah="${p.id_pengguna}">${ikon('edit', 16)}</button>
            ${saya ? '' : `<button class="btn btn-teks btn-ikon btn-sm" title="Hapus" aria-label="Hapus ${esc(p.nama)}" data-hapus="${p.id_pengguna}">${ikon('trash', 16)}</button>`}
          </div>
        </td>
      </tr>`;
  }).join('');
}

$('isiTabel').addEventListener('click', e => {
  const ubah = e.target.closest('[data-ubah]');
  const hapusBtn = e.target.closest('[data-hapus]');
  if (ubah) bukaForm(ubah.dataset.ubah);
  if (hapusBtn) hapus(hapusBtn.dataset.hapus);
});


/* ---------- Form tambah / ubah ---------- */
function bukaForm(id = null) {
  form.reset();
  $('pesanPengguna').hidden = true;
  $('password').type = 'password';
  const p = SEMUA.find(x => String(x.id_pengguna) === String(id));
  MODE = p ? 'ubah' : 'tambah';

  $('judulModalPengguna').textContent = p ? 'Ubah Pengguna' : 'Tambah Pengguna';
  $('bantuanPassword').textContent = p ? 'kosongkan jika tidak diganti' : 'minimal 6 karakter';
  $('idPengguna').value = p ? p.id_pengguna : '';
  if (p) {
    $('namaPengguna').value = p.nama;
    $('username').value = p.username;
  }
  bukaModal('modalPengguna');
}

$('btnIntip').addEventListener('click', () => {
  const tampil = $('password').type === 'password';
  $('password').type = tampil ? 'text' : 'password';
  $('btnIntip').innerHTML = ikon(tampil ? 'eye-off' : 'eye', 17);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pesan = $('pesanPengguna');
  const tombol = $('btnSimpan');
  const tampilkanPesan = teks => { pesan.innerHTML = ikon('alert-circle') + `<span>${esc(teks)}</span>`; pesan.hidden = false; };
  pesan.hidden = true;

  const password = $('password').value;
  if (!$('namaPengguna').value.trim() || !$('username').value.trim()) return tampilkanPesan('Nama dan username wajib diisi.');
  if (MODE === 'tambah' && !password) return tampilkanPesan('Password wajib diisi.');
  if (password && password.length < 6) return tampilkanPesan('Password minimal 6 karakter.');

  tombolMemuat(tombol, true, 'Menyimpan…');
  try {
    await api('pengguna.php?aksi=' + MODE, new FormData(form));
    tutupModal('modalPengguna');
    toast(MODE === 'tambah' ? 'Akun berhasil ditambahkan.' : 'Akun berhasil diperbarui.');
    await muat();
    if ($('idPengguna').value === ID_SAYA) await siapkanAdminUlang();
  } catch (err) {
    tampilkanPesan(err.message);
  }
  tombolMemuat(tombol, false);
});

// Perbarui nama di navbar jika akun sendiri yang diubah
async function siapkanAdminUlang() {
  const saya = await api('auth.php?aksi=cek');
  $('userNama').textContent = saya.nama;
  $('userUsername').textContent = '@' + saya.username;
  $('userAvatar').textContent = inisial(saya.nama);
}

async function hapus(id) {
  const p = SEMUA.find(x => String(x.id_pengguna) === String(id));
  const ya = await konfirmasi({
    judul: 'Hapus akun?',
    pesan: `Akun ${p.nama} (@${p.username}) akan dihapus dan tidak bisa login lagi.`,
    tombol: 'Hapus akun',
  });
  if (!ya) return;
  try {
    await api('pengguna.php?aksi=hapus', { id });
    toast('Akun ' + p.nama + ' dihapus.');
    await muat();
  } catch (err) { toast(err.message, 'gagal'); }
}

$('btnTambah').addEventListener('click', () => bukaForm());

mulai().catch(err => toast(err.message, 'gagal'));
