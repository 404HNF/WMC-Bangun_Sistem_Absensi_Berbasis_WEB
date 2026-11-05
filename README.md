# Sistem Absensi Kelas Berbasis Web — UBBG

Prototipe dari proposal **"Rancang Bangun Sistem Absensi Kelas Berbasis Web Menggunakan PHP dan MySQL"**
(Kelompok 3 · Wireless/Mobile Computing · Ilmu Komputer UBBG).

Teknologi: **HTML, Tailwind CSS v4, JavaScript (fetch), PHP (API JSON), dan MySQL**.
Tampilan memakai tema gelap seperti website Han's Projects: latar titik-titik, kartu bergaris gelap, tab biru muda, dan **tanpa gradient**.

---

## 1. Halaman

| Halaman | File | Isi |
|---|---|---|
| Absen | `index.html` | Form NIM + kode sesi, jam server, hasil absen (Kehadiran Saya dan Anggota Kelas) |
| Aturan | `rules.html` | Tab Mahasiswa, Status Kehadiran, dan Dosen + keterangan "Terakhir diperbarui" |
| Cara Absen? | `guide.html` | 4 langkah absen + pertanyaan umum |
| Staff | `staff.html` | 5 anggota kelompok beserta pembagian kerja (tautan ada di footer) |
| Login Dosen | `admin/login.html` | Masuk ke panel dosen/admin |
| Beranda admin | `admin/index.html` | Ringkasan, sesi berlangsung, absen terbaru, grafik |
| Sesi | `admin/sessions.html` | Daftar sesi + buat sesi (mulai sekarang atau dijadwalkan) |
| Detail sesi | `admin/session-detail.html` | Kode besar, garis waktu, daftar hadir live, IP ganda, Mode Proyektor, CSV |
| Mahasiswa | `admin/students.html` | Tambah, ubah, hapus, cari, filter kelas |
| Rekap | `admin/recap.html` | Rekap per mahasiswa dan per sesi + ekspor CSV |
| Pengguna | `admin/users.html` | Akun dosen/admin |

Header halaman publik tetap seperti sebelumnya: **Absen · Aturan · Cara Absen? · Login Dosen**.

---

## 2. Struktur folder

```
absensi/
├── index.html, rules.html, guide.html, staff.html
├── admin/
│   ├── login.html, index.html, sessions.html, session-detail.html
│   └── students.html, recap.html, users.html
├── api/
│   ├── config.example.php   salin menjadi config.php lalu isi data database
│   ├── core.php             koneksi PDO + fungsi bersama
│   ├── auth.php, attendance.php, dashboard.php
│   └── sessions.php, students.php, recap.php, users.php
├── assets/
│   ├── js/                  app.js + 1 file per halaman
│   ├── img/                 logo UBBG, favicon
│   └── fonts/               font Inter
├── database/
│   ├── attendance_db.sql            tabel + akun admin + data contoh
│   ├── attendance_db_empty.sql      tabel + akun admin saja
│   ├── migrate_from_old_tables.sql  pindahkan data dari tabel lama
│   └── drop_old_tables.sql          hapus tabel lama (opsional)
└── src/
    ├── input.css            sumber Tailwind CSS v4
    └── output.css           hasil build (yang dipakai halaman)
```

---

## 3. Nama tabel dan kolom (Bahasa Inggris)

| Tabel lama | Tabel baru | Kolom baru |
|---|---|---|
| `pengguna` | `users` | `user_id`, `username`, `password_hash`, `full_name` |
| `mahasiswa` | `students` | `student_nim`, `student_name`, `class_name`, `created_at` |
| `sesi` | `class_sessions` | `session_id`, `user_id`, `course_name`, `session_code`, `start_time`, `end_time` |
| `absensi` | `attendances` | `attendance_id`, `student_nim`, `session_id`, `checked_in_at`, `status`, `client_ip` |

Nilai `status` sekarang `present` (hadir) dan `late` (terlambat). Teks di layar tetap Bahasa Indonesia.

---

## 4. Instalasi baru (XAMPP)

1. Salin folder `absensi` ke `C:\xampp\htdocs\`.
2. Buka `http://localhost/phpmyadmin`, buat database `attendance_db`, lalu **Import** `database/attendance_db.sql`
   (atau `attendance_db_empty.sql` jika tidak ingin data contoh).
3. Salin `api/config.example.php` menjadi `api/config.php`. Isinya sudah cocok untuk XAMPP.
4. Buka `http://localhost/absensi`. Login dosen: **admin / admin123** (segera ganti password di menu Pengguna).

---

## 5. Memperbarui versi lama di hosting (data tetap aman)

1. **Backup dulu**: phpMyAdmin → pilih database → **Export**.
2. Buat `api/config.php` dari `api/config.example.php`. Isi `db_host`, `db_name`, `db_user`, dan `db_pass`
   dengan nilai `$DB_HOST`, `$DB_NAME`, `$DB_USER`, dan `$DB_PASS` dari file lama `api/koneksi.php` di hosting.
3. Unggah semua file baru. File lama `api/koneksi.php` jangan ditimpa atau dihapus sebelum langkah 6.
4. phpMyAdmin → pilih database → **Import** `database/migrate_from_old_tables.sql` **satu kali saja**.
   File ini membuat 4 tabel baru lalu menyalin semua data (akun, mahasiswa, sesi, absensi). Tabel lama tidak diubah.
5. Coba login dan buka **Rekap**: angkanya harus sama seperti sebelumnya.
6. Jika sudah sesuai, hapus file lama yang tidak dipakai lagi:
   `api/koneksi.php`, `api/absen.php`, `api/sesi.php`, `api/mahasiswa.php`, `api/rekap.php`, `api/pengguna.php`,
   `admin/sesi.html`, `admin/sesi-detail.html`, `admin/mahasiswa.html`, `admin/rekap.html`, `admin/pengguna.html`,
   `assets/js/absen.js`, `assets/js/sesi.js`, `assets/js/sesi-detail.js`, `assets/js/mahasiswa.js`, `assets/js/rekap.js`,
   `assets/js/pengguna.js`, `assets/css/style.css`, dan `database/db_absensi.sql`.
7. Opsional: Import `database/drop_old_tables.sql` untuk menghapus tabel lama.

`api/config.php` berisi password database, jadi **jangan diunggah ke GitHub** (sudah tercantum di `.gitignore`).

---

## 6. Tailwind CSS v4

- Tema dan komponen ada di `src/input.css` (`@theme`, `@utility bg-dots`, `@utility bg-grid`, dan kelas seperti `card`, `btn`, `tab`, `rule-card`, `nav-link`).
- `src/output.css` sudah dibuild, jadi web langsung bisa dipakai. Setelah mengubah kelas di HTML/JS/CSS, build ulang:

```
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --minify
```

  Saat mengembangkan, ganti `--minify` dengan `--watch`.
- Baris paling atas `output.css` adalah lisensi yang ditambahkan otomatis oleh Tailwind.
- Kelas lama `rulesAbsen` dan `hrznHeaderNav` sekarang bernama `rule-card` dan `nav-link`.
- Pola titik (`bg-dots`) dan kotak (`bg-grid`) dibuat dengan SVG, sehingga tidak ada gradient sama sekali.
- Ikon memakai Font Awesome 6.4.0 dari CDN cdnjs, sama seperti sebelumnya.

---

## 7. Logo

Header memakai `src/hans_projects_logo.png` (path sama seperti sebelumnya, file tidak disertakan).
Jika file belum ada, header otomatis menampilkan tulisan **Han's Projects**.
Logo UBBG putih ada di `assets/img/ubbg-logo-white.png`.

---

## 8. Aturan kode

- Tanpa komentar di HTML, CSS, JavaScript, PHP, dan SQL.
- Semua ID, nama input, variabel, fungsi, file, tabel, dan kolom memakai Bahasa Inggris
  (contoh: `nim_mahasiswa` → `student_nim`, `kode_sesi` → `session_code`).
- Tampilan tanpa gradient.

---

## 9. Staff

| Anggota | NIM | Pembagian kerja |
|---|---|---|
| Farhan Daffa Zahrani M (Han's) | 23210134 | Frontend, Backend & Hosting |
| Akhsanul Taqwim (Akhsan) | 23210006 | Frontend & Backend |
| Agym Abdullah Gymnastiar (Agym) | 23210130 | Frontend & Tester |
| Muhammad Dwi Andika (Andika) | 23210137 | Tester Absen Admin |
| Vani Andrian AS (Vani) | 23210144 | Tester Absen Mahasiswa |
