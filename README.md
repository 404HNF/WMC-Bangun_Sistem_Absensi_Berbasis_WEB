# Sistem Absensi Kelas Berbasis Web — UBBG

Prototipe dari proposal **"Rancang Bangun Sistem Absensi Kelas Berbasis Web Menggunakan PHP dan MySQL"**
(Kelompok 3 · Wireless/Mobile Computing · Ilmu Komputer UBBG).

Teknologi: **HTML, CSS, JavaScript (fetch/AJAX), PHP (API JSON), MySQL** — tanpa framework.
Aplikasi berjalan online di server hosting: **https://ubbg.hansprojects.my.id** (melalui Cloudflare, HTTPS).
Semua font, ikon, dan logo sudah disertakan di folder `assets/` (tanpa CDN), sehingga halaman cepat dimuat.

---

## 1. Fitur

**Halaman mahasiswa** (`/absensi/`)
- Isi NIM + kode sesi 6 digit, divalidasi di browser lalu dikirim dengan `fetch` tanpa memuat ulang halaman.
- Status otomatis sesuai **Tabel 1**: ≤ 15 menit = *hadir*, setelahnya = *terlambat*, lewat batas waktu = ditolak (*tidak hadir*).
- Jika koneksi (Wi-Fi/data seluler) putus saat mengirim, muncul pesan gagal dan tombol **Kirim Ulang**.
- NIM bisa diingat di perangkat; jam server ditampilkan agar mahasiswa tahu waktu resmi.
- Setelah berhasil absen, mahasiswa bisa melihat:
  - **Kehadiran Saya**: jumlah absen di mata kuliah tersebut (misalnya 6 / 7 pertemuan), rincian hadir/terlambat/tidak hadir, dan riwayat tiap pertemuan.
  - **Anggota Kelas**: daftar mahasiswa sekelas **tanpa status absen**. NIM teman disamarkan (contoh `2321••34`) agar tidak mudah dipakai titip absen.

**Panel dosen/admin** (`/absensi/admin/`)
- Login dengan password ber-hash.
- **Buat sesi** (mulai sekarang atau dijadwalkan) → kode 6 digit dibuat otomatis.
- **Detail sesi**: kode besar, garis waktu hadir/terlambat, hitung mundur, daftar hadir **diperbarui otomatis setiap 5 detik**, penanda **IP ganda** (indikasi titip absen), **Mode Proyektor** untuk layar kelas, tutup absen lebih cepat, **ekspor CSV**.
- **Hapus absen** satu mahasiswa (ikon di kolom Aksi) jika ternyata tidak hadir atau menitip absen. Ia lalu tercatat tidak hadir (atau belum absen jika sesi masih berlangsung, sehingga masih bisa absen sendiri).
- **Data mahasiswa**: tambah, ubah, hapus, cari, filter kelas.
- **Rekap** per mahasiswa & per sesi (filter mata kuliah/kelas) + ekspor CSV.
- **Pengguna**: kelola akun dosen/admin.
- Tampilan responsif: HP (menu bawah), tablet, dan PC.

**Tampilan**
- **Mode gelap**: tombol bulan/matahari di navbar setiap halaman. Pilihan disimpan di browser; jika belum pernah dipilih, mengikuti pengaturan HP/laptop.
- Latar mode terang memakai indigo yang lebih cerah; mode gelap memakai indigo tua.
- Tombol **UP** muncul di kanan bawah setelah halaman digulir ke bawah, untuk kembali ke atas.
- Semua fitur di atas **tidak mengubah database** (tetap Tabel 2–5).

---

## 2. Struktur folder

```
absensi/
├── index.html              ← halaman absen mahasiswa
├── admin/                  ← panel dosen/admin
│   ├── login.html
│   ├── index.html          ← beranda (dashboard)
│   ├── sesi.html           ← daftar & buat sesi
│   ├── sesi-detail.html    ← kode sesi + daftar hadir live
│   ├── mahasiswa.html
│   ├── rekap.html
│   └── pengguna.html
├── api/                    ← PHP (balasan JSON)
│   ├── koneksi.php         ← pengaturan database + fungsi bantu
│   ├── auth.php            ← login / cek / logout
│   ├── absen.php           ← kirim absen (publik)
│   ├── dashboard.php
│   ├── sesi.php
│   ├── mahasiswa.php
│   ├── rekap.php
│   └── pengguna.php
├── assets/
│   ├── css/style.css
│   ├── js/                 ← app.js (fungsi bersama) + 1 file per halaman
│   ├── img/                ← logo UBBG, favicon
│   └── fonts/              ← font Inter (offline)
└── database/
    └── db_absensi.sql      ← Tabel 2–5 + akun admin + data contoh
```

---

## 3. Instalasi

File `db_absensi.sql` **tidak membuat database sendiri**. Tabel dibuat di database yang sedang dipilih
di phpMyAdmin, jadi file yang sama bisa dipakai di XAMPP maupun hosting (user hosting biasanya tidak boleh
membuat database baru, yang menyebabkan error `#1044 Access denied`).

### 3a. XAMPP (Windows)

1. Salin folder **`absensi`** ke `C:\xampp\htdocs\`.
2. Buka **XAMPP Control Panel** → klik **Start** pada **Apache** dan **MySQL**.
3. Buka `http://localhost/phpmyadmin` → klik **New/Baru** → isi nama database **`db_absensi`** → **Create/Buat**.
4. Klik **db_absensi** di panel kiri → tab **Import** → pilih `absensi/database/db_absensi.sql` → **Import**.
5. Buka:
   - Mahasiswa: `http://localhost/absensi/`
   - Dosen/admin: `http://localhost/absensi/admin/`
6. Login awal: **username `admin`**, **password `admin123`** → segera ganti di menu **Pengguna**.

### 3b. Hosting / panel (cPanel, aaPanel, dll.)

1. Buat database + user di panel hosting (catat **nama database**, **user**, dan **password**-nya;
   biasanya diberi awalan nama akun, misalnya `akun_absensi`). Pastikan user diberi **ALL PRIVILEGES** ke database itu.
2. Buka phpMyAdmin dari panel → **klik database tersebut di panel kiri** → tab **Import** → pilih `db_absensi.sql` → **Import**.
3. Upload folder `absensi` ke `public_html` (atau folder web Anda).
4. Edit `api/koneksi.php`, isi sesuai data dari panel:
   ```php
   $DB_HOST = 'localhost';
   $DB_NAME = 'nama_database_hosting';
   $DB_USER = 'user_database_hosting';
   $DB_PASS = 'password_database_hosting';
   ```
5. Buka `https://domain-anda/absensi/admin/` dan login `admin` / `admin123`.

> Jangan membuka file HTML dengan klik dua kali (alamat `file:///...`). PHP hanya berjalan lewat `http://...`.

Data contoh (15 mahasiswa, 6 sesi selesai) boleh dihapus: hapus bagian **DATA CONTOH** di akhir file SQL sebelum import.

| Error saat import | Solusi |
|---|---|
| `#1044 Access denied ... to database` | Pakai file SQL versi ini (tanpa `CREATE DATABASE`), lalu pilih database Anda dulu sebelum Import |
| `#1046 No database selected` | Klik nama database di panel kiri phpMyAdmin terlebih dahulu, baru buka tab Import |
| `#1142 ... command denied` | User database belum diberi hak penuh: di panel hosting, beri **ALL PRIVILEGES** ke database |

---

## 4. Uji coba lokal dengan XAMPP lewat Wi-Fi (opsional)

Web yang sudah di hosting cukup dibuka lewat domainnya (`https://ubbg.hansprojects.my.id`) dari Wi-Fi maupun data seluler.
Langkah di bawah hanya diperlukan jika ingin mencoba aplikasi di laptop sendiri dengan XAMPP.

1. Sambungkan laptop server dan HP ke **Wi-Fi/hotspot yang sama**.
2. Cek IP laptop: buka CMD → `ipconfig` → lihat **IPv4 Address** (contoh `192.168.1.10`).
   Sebaiknya IP dibuat tetap (static IP / DHCP reservation di router).
3. Izinkan port 80 di Windows Firewall (CMD **Run as administrator**):
   ```
   netsh advfirewall firewall add rule name="Apache HTTP 80" dir=in action=allow protocol=TCP localport=80
   ```
   Port MySQL (3306) **tidak** perlu dibuka.
4. Di HP buka `http://192.168.1.10/absensi/`.
   Halaman **Detail Sesi** dan **Mode Proyektor** menampilkan alamat ini secara otomatis.

Jika HP tetap tidak bisa membuka halaman, kemungkinan router mengaktifkan **AP/Client Isolation**
(umum di Wi-Fi kampus/publik). Gunakan hotspot HP atau router yang fitur itu bisa dimatikan.

---

## 5. Pengaturan (`api/koneksi.php`)

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `$DB_HOST`, `$DB_NAME`, `$DB_USER`, `$DB_PASS` | `localhost`, `db_absensi`, `root`, *(kosong)* | Koneksi MySQL (bawaan XAMPP) |
| `$BATAS_HADIR` | `15` | Menit: absen ≤ 15 menit sejak mulai = hadir |
| `$DURASI_DEFAULT` | `30` | Batas waktu absen bawaan saat membuat sesi (bisa diubah dosen per sesi) |
| `$CSV_PEMISAH` | `,` | Ganti ke `;` jika Excel menampilkan semua data di satu kolom |
| Zona waktu | `Asia/Jakarta` | WIB; jam MySQL otomatis disamakan dengan PHP |

---

## 6. Pemetaan ke proposal

| Proposal | Implementasi |
|---|---|
| Tabel 1 – klasifikasi status | `api/absen.php` langkah 6 + `$BATAS_HADIR`; batas tutup = `waktu_tutup` tiap sesi |
| Tabel 2 – pengguna | tabel `pengguna`, password dengan `password_hash()` / `password_verify()` |
| Tabel 3 – mahasiswa | tabel `mahasiswa` |
| Tabel 4 – sesi | tabel `sesi`, `kode_sesi` unik 6 digit |
| Tabel 5 – absensi | tabel `absensi`, **UNIQUE (nim, id_sesi)**, status ENUM `hadir/terlambat` |
| 5.2 no. 1 – buat sesi | `admin/sesi.html` → `api/sesi.php?aksi=buat` |
| 5.2 no. 3–6 – isi, verifikasi, status, simpan + IP | `index.html` → `api/absen.php?aksi=kirim` |
| 5.2 no. 7 – rekap, live 5 detik, CSV, tidak hadir | `admin/sesi-detail.html`, `admin/rekap.html` |
| 5.2 no. 8 – gangguan jaringan & data ganda | pesan + Kirim Ulang (timeout 10 detik) & UNIQUE di database |
| 5.3 – server hosting & Cloudflare | IP asli mahasiswa dibaca dari header `CF-Connecting-IP` di `api/absen.php` |
| 5.3 – keamanan dasar | hash password, prepared statement (PDO), sesi login PHP |

**Tidak hadir** tidak disimpan di tabel: mahasiswa yang tidak punya data absensi pada sesi yang sudah
ditutup dihitung tidak hadir. Mahasiswa yang baru didaftarkan **setelah** sebuah sesi ditutup tidak dihitung pada sesi itu.

---

## 7. Daftar API

Semua balasan berformat `{"sukses": true/false, "pesan": "...", "data": ...}`.

| Endpoint | Method | Login | Keterangan |
|---|---|---|---|
| `api/absen.php?aksi=info` | GET | – | jumlah sesi aktif, jam server |
| `api/absen.php?aksi=kirim` | POST `nim`, `kode` | – | kirim absen; balasan berisi `rekap` (kehadiran di mata kuliah itu) dan `anggota` (teman sekelas tanpa status) |
| `api/auth.php?aksi=login` / `cek` / `logout` | POST / GET / POST | – / ✓ / ✓ | login dosen/admin |
| `api/dashboard.php` | GET | ✓ | ringkasan beranda |
| `api/sesi.php?aksi=daftar` / `detail&id=` | GET | ✓ | tambah `&format=csv` untuk ekspor |
| `api/sesi.php?aksi=buat` / `tutup` / `hapus` | POST | ✓ | kelola sesi |
| `api/sesi.php?aksi=hapus_absen` | POST `id`, `nim` | ✓ | hapus absen satu mahasiswa di sesi itu |
| `api/mahasiswa.php?aksi=daftar` / `tambah` / `ubah` / `hapus` | GET/POST | ✓ | data mahasiswa |
| `api/rekap.php?aksi=mahasiswa` / `sesi` / `filter` | GET | ✓ | rekap (`&mata_kuliah=&kelas=&format=csv`) |
| `api/pengguna.php?aksi=daftar` / `tambah` / `ubah` / `hapus` | GET/POST | ✓ | akun dosen/admin |

Kode HTTP: 200 berhasil · 400 isian salah · 401 belum login · 403 sesi belum mulai/sudah ditutup · 404 NIM/kode tidak ditemukan · 409 sudah absen.

---

## 8. Panduan pengujian (Tabel 8)

**Fungsional** — login (benar/salah), buat sesi, absen hadir, absen terlambat (buat sesi terjadwal yang sudah lewat > 15 menit),
absen setelah ditutup, NIM tidak terdaftar, kode salah, absen ganda, rekap, ekspor CSV.

**Waktu respon** — di browser Brave tekan F12 → tab **Network** → kirim absen → lihat kolom **Time** untuk `absen.php`.
Ulangi 30 kali di jarak ± 2 m, ± 10 m, dan di balik dinding, lalu ulangi dengan data seluler.

**Beban & data ganda** — Apache Benchmark sudah ada di XAMPP (`C:\xampp\apache\bin\ab.exe`).
Buat sesi, lalu buat file `data.txt` berisi satu baris (ganti kode dengan kode sesi aktif):
```
nim=23210134&kode=123456
```
Jalankan 15 permintaan bersamaan:
```
C:\xampp\apache\bin\ab.exe -n 15 -c 15 -p data.txt -T application/x-www-form-urlencoded "http://192.168.1.10/absensi/api/absen.php?aksi=kirim"
```
Untuk server hosting, ganti alamatnya dengan alamat web Anda, contoh `https://ubbg.hansprojects.my.id/api/absen.php?aksi=kirim`
(jika `ab.exe` tidak mendukung https, gunakan JMeter).
Hasil yang benar: **1 berhasil**, `Non-2xx responses: 14` (ditolak 409 karena sudah absen), dan di phpMyAdmin hanya ada **1 baris** untuk NIM tersebut di sesi itu.
`ab` juga akan menampilkan `Failed requests (Length)` karena panjang pesan balasan berbeda — itu normal.
Untuk menguji banyak NIM berbeda secara bersamaan, gunakan JMeter dengan *CSV Data Set Config* berisi daftar NIM.

**Kebenaran data** — bandingkan data yang dikirim dengan isi tabel `absensi` di phpMyAdmin (waktu, status, IP).

---

## 9. Jika ada masalah

| Pesan / gejala | Penyebab & solusi |
|---|---|
| "Balasan server tidak valid" | Apache belum berjalan, atau halaman dibuka lewat `file:///` |
| "Gagal terhubung ke database (...)" | Baca pesan di dalam kurung: `Access denied` = user/password salah, `Unknown database` = nama database salah. Perbaiki di `api/koneksi.php` |
| HP tidak bisa membuka alamat | Beda jaringan, firewall port 80 belum dibuka, atau AP isolation aktif |
| Status/jam terasa salah | Periksa jam & tanggal laptop server (waktu yang dipakai adalah jam server) |
| CSV satu kolom di Excel | Ubah `$CSV_PEMISAH` menjadi `';'` |
| Setelah update, tampilan jadi putih/berantakan | Browser/Cloudflare masih memakai CSS lama dari cache. Tekan **Ctrl+F5**. Agar tidak terulang, setiap mengubah CSS/JS ganti angka `?v=20261014` di semua file HTML (Find & Replace di VS Code) |

---

## 10. Deploy ke VPS Linux (opsional)

1. Pasang Apache/Nginx + PHP (ekstensi `pdo_mysql`) + MySQL/MariaDB.
2. Salin folder ke web root, misalnya `/var/www/html/absensi`.
3. Buat database lalu import: `mysql -u root -p -e "CREATE DATABASE db_absensi CHARACTER SET utf8mb4"` kemudian `mysql -u root -p db_absensi < database/db_absensi.sql`.
4. Buat user MySQL khusus (jangan pakai root tanpa password) lalu isi di `api/koneksi.php`.
5. Folder `database/` sudah diblokir lewat `.htaccess` (Apache). Di Nginx, tambahkan `location /absensi/database { deny all; }`.
6. Karena web dibuka ke internet, **gunakan HTTPS** (mis. lewat Cloudflare) dan segera ganti password admin bawaan.
7. Di belakang Cloudflare, `api/absen.php` mencatat IP asli mahasiswa dari header `CF-Connecting-IP`, sehingga penanda *IP ganda* tetap berfungsi.

---

## 11. Lisensi aset

- Font **Inter** © The Inter Project Authors — SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
- Ikon berbasis **Feather Icons** — MIT License.
- Logo **Universitas Bina Bangsa Getsempena** milik UBBG, dipakai untuk keperluan akademik.
