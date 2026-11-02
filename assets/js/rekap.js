/* ==============================================================
   REKAP.JS - rekap kehadiran per mahasiswa & per sesi (admin/rekap.html)
   ============================================================== */

let TAB = 'mahasiswa';   // 'mahasiswa' atau 'sesi'
const $ = id => document.getElementById(id);

async function mulai() {
  await siapkanAdmin();

  // Pilihan filter mata kuliah & kelas
  const pilihan = await api('rekap.php?aksi=filter');
  $('filterMk').innerHTML += pilihan.mata_kuliah.map(mk => `<option value="${esc(mk)}">${esc(mk)}</option>`).join('');
  $('filterKelas').innerHTML += pilihan.kelas.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');

  await muat();
}

// Filter dalam bentuk parameter URL, contoh: mata_kuliah=Pemrograman%20Web&kelas=IK-23A
function parameterFilter() {
  return 'mata_kuliah=' + encodeURIComponent($('filterMk').value) + '&kelas=' + encodeURIComponent($('filterKelas').value);
}

async function muat() {
  $('isiTabel').innerHTML = '<tr><td colspan="7"><div class="kerangka"></div></td></tr>';
  try {
    // Data per sesi selalu diambil untuk angka ringkasan
    const [perSesi, perMhs] = await Promise.all([
      api('rekap.php?aksi=sesi&' + parameterFilter()),
      TAB === 'mahasiswa' ? api('rekap.php?aksi=mahasiswa&' + parameterFilter()) : null,
    ]);
    tampilkanRingkasan(perSesi);
    if (TAB === 'mahasiswa') tampilkanPerMahasiswa(perMhs);
    else tampilkanPerSesi(perSesi);
  } catch (err) {
    toast(err.message, 'gagal');
    $('isiTabel').innerHTML = `<tr><td colspan="7"><div class="kosong"><p>${esc(err.message)}</p></div></td></tr>`;
  }
}

function tampilkanRingkasan(perSesi) {
  const selesai = perSesi.filter(s => s.status === 'selesai');
  const aktif = perSesi.length - selesai.length;
  let datang = 0, seharusnya = 0, terlambat = 0, tidak = 0;
  selesai.forEach(s => { datang += Number(s.hadir) + Number(s.terlambat); seharusnya += Number(s.total); });
  perSesi.forEach(s => { terlambat += Number(s.terlambat); tidak += Number(s.tidak_hadir); });

  $('rSesi').innerHTML = selesai.length + (aktif ? ` <small>+${aktif} berlangsung</small>` : '');
  $('rRata').textContent = seharusnya ? Math.round(datang / seharusnya * 100) + '%' : '–';
  $('rTerlambat').textContent = terlambat;
  $('rTidak').textContent = tidak;
}

function kosong(pesan) {
  return `<tr><td colspan="7"><div class="kosong"><div class="kosong-ikon">${ikon('bar-chart', 24)}</div><h3>Belum ada data</h3><p>${pesan}</p></div></td></tr>`;
}


/* ---------- Tabel per mahasiswa ---------- */
function tampilkanPerMahasiswa(data) {
  $('kepalaTabel').innerHTML = `<tr>
    <th class="sembunyi-hp">No</th><th>Mahasiswa</th><th>Kelas</th>
    <th class="kanan">Hadir</th><th class="kanan">Terlambat</th><th class="kanan">Tidak hadir</th><th>Kehadiran</th></tr>`;
  if (!data.length) { $('isiTabel').innerHTML = kosong('Tidak ada mahasiswa pada filter ini.'); return; }

  $('isiTabel').innerHTML = data.map((m, i) => `
    <tr>
      <td class="sembunyi-hp angka teks-redup">${i + 1}</td>
      <td>
        <div class="sel-nama">
          <span class="avatar avatar-sm">${esc(inisial(m.nama))}</span>
          <div>
            <b>${esc(m.nama)}</b>
            <small>${esc(m.nim)}<span class="hanya-hp-inline"> · ${esc(m.kelas)}</span></small>
            <span class="angka-hp hanya-hp"><span>Hadir <b>${m.hadir}</b></span><span>Terlambat <b>${m.terlambat}</b></span><span>Tidak <b>${m.tidak_hadir}</b></span></span>
          </div>
        </div>
      </td>
      <td class="sembunyi-hp"><span class="chip-kelas">${esc(m.kelas)}</span></td>
      <td class="sembunyi-hp kanan angka">${m.hadir}</td>
      <td class="sembunyi-hp kanan angka">${m.terlambat}</td>
      <td class="sembunyi-hp kanan angka">${m.tidak_hadir}</td>
      <td class="sel-kanan-hp">${barPersen(m.persen)}</td>
    </tr>`).join('');
}


/* ---------- Tabel per sesi ---------- */
function tampilkanPerSesi(data) {
  $('kepalaTabel').innerHTML = `<tr>
    <th>Sesi</th><th class="kanan">Hadir</th><th class="kanan">Terlambat</th>
    <th class="kanan">Tidak hadir</th><th class="kanan">Total</th><th>Kehadiran</th></tr>`;
  if (!data.length) { $('isiTabel').innerHTML = kosong('Belum ada sesi yang dimulai pada filter ini.'); return; }

  $('isiTabel').innerHTML = data.map(s => `
    <tr class="bisa-klik" data-id="${s.id_sesi}" title="Buka detail sesi">
      <td>
        <b>${esc(s.mata_kuliah)}</b> ${s.status === 'aktif' ? badge('aktif') : ''}
        <small class="teks-kecil" style="display:block">${tanggalPendek(s.waktu_mulai)} · ${jamMenit(s.waktu_mulai)} WIB · kode ${formatKode(s.kode_sesi)}</small>
        <span class="angka-hp hanya-hp"><span>Hadir <b>${s.hadir}</b></span><span>Terlambat <b>${s.terlambat}</b></span><span>Tidak <b>${s.tidak_hadir}</b></span><span>dari <b>${s.total}</b></span></span>
      </td>
      <td class="sembunyi-hp kanan angka">${s.hadir}</td>
      <td class="sembunyi-hp kanan angka">${s.terlambat}</td>
      <td class="sembunyi-hp kanan angka">${s.tidak_hadir}</td>
      <td class="sembunyi-hp kanan angka">${s.total}</td>
      <td class="sel-kanan-hp">${barPersen(s.persen)}</td>
    </tr>`).join('');
}

$('isiTabel').addEventListener('click', e => {
  const baris = e.target.closest('tr[data-id]');
  if (baris) location.href = 'sesi-detail.html?id=' + baris.dataset.id;
});


/* ---------- Tab, filter, ekspor ---------- */
document.querySelectorAll('#tab button').forEach(tombol => {
  tombol.addEventListener('click', () => {
    TAB = tombol.dataset.tab;
    document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('aktif', b === tombol));
    muat();
  });
});
$('filterMk').addEventListener('change', muat);
$('filterKelas').addEventListener('change', muat);
$('btnCsv').addEventListener('click', () => unduh(`rekap.php?aksi=${TAB}&${parameterFilter()}&format=csv`));

mulai().catch(err => toast(err.message, 'gagal'));
