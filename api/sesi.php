
<?php

require_once __DIR__ . '/koneksi.php';

requireLogin();

$action = $_GET['aksi'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ======================================
// DAFTAR SESI
// ======================================

if ($action === 'daftar' && $method === 'GET') {

    try {

        $sql = "
            SELECT
                s.id_sesi,
                s.mata_kuliah,
                s.kode_sesi,
                s.waktu_mulai,
                s.waktu_tutup,
                s.durasi_menit,
                COALESCE(p.nama, 'Administrator') AS dibuat_oleh,

                (
                    SELECT COUNT(*)
                    FROM absensi a
                    WHERE a.id_sesi = s.id_sesi
                    AND a.status = 'hadir'
                ) AS hadir,

                (
                    SELECT COUNT(*)
                    FROM absensi a
                    WHERE a.id_sesi = s.id_sesi
                    AND a.status = 'terlambat'
                ) AS terlambat,

                (
                    SELECT COUNT(*)
                    FROM mahasiswa
                ) AS total

            FROM sesi s

            LEFT JOIN pengguna p
                ON s.id_pengguna = p.id_pengguna

            ORDER BY s.waktu_mulai DESC
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute();

        $daftar = $stmt->fetchAll();

        $sekarang = new DateTime();

        foreach ($daftar as &$sesi) {

            $mulai = new DateTime($sesi['waktu_mulai']);
            $tutup = new DateTime($sesi['waktu_tutup']);

            if ($sekarang < $mulai) {
                $sesi['status'] = 'akan_datang';
            } elseif ($sekarang >= $tutup) {
                $sesi['status'] = 'selesai';
            } else {
                $sesi['status'] = 'aktif';
            }

            $sesi['hadir'] = (int) $sesi['hadir'];
            $sesi['terlambat'] = (int) $sesi['terlambat'];
            $sesi['total'] = (int) $sesi['total'];
        }

        unset($sesi);

        sendResponse(
            true,
            'Session data retrieved successfully.',
            $daftar
        );

    } catch (PDOException $e) {

        sendResponse(
            false,
            'Failed to retrieve session data.',
            null,
            500
        );
    }
}


// ======================================
// BUAT SESI BARU
// ======================================

if ($action === 'buat' && $method === 'POST') {

    $mataKuliah = trim($_POST['mata_kuliah'] ?? '');
    $durasi = (int) ($_POST['durasi'] ?? 0);
    $waktuMulaiInput = trim($_POST['waktu_mulai'] ?? '');

    // Validasi nama mata kuliah
    if ($mataKuliah === '') {
        sendResponse(false, 'Nama mata kuliah wajib diisi.', null, 400);
    }

    // Validasi durasi
    if ($durasi < 1 || $durasi > 300) {
        sendResponse(false, 'Durasi harus antara 1 sampai 300 menit.', null, 400);
    }

    try {

        // Waktu mulai: sekarang atau jadwal yang dipilih
        if ($waktuMulaiInput === '') {
            $waktuMulai = new DateTime();
        } else {
            $waktuMulai = DateTime::createFromFormat(
                'Y-m-d\TH:i',
                $waktuMulaiInput
            );

            if (!$waktuMulai) {
                sendResponse(false, 'Format waktu mulai tidak valid.', null, 400);
            }

            $waktuMulai->setTime(
                (int) $waktuMulai->format('H'),
                (int) $waktuMulai->format('i'),
                0
            );

            if ($waktuMulai <= new DateTime()) {
                sendResponse(false, 'Waktu jadwal harus di masa depan.', null, 400);
            }
        }

        $waktuTutup = clone $waktuMulai;
        $waktuTutup->modify("+{$durasi} minutes");

        // Membuat kode sesi 6 karakter
        do {
            $kodeSesi = str_pad(
                (string) random_int(0, 999999),
                6,
                '0',
                STR_PAD_LEFT
            );

            $cek = $db->prepare(
                "SELECT id_sesi FROM sesi WHERE kode_sesi = :kode"
            );

            $cek->execute([':kode' => $kodeSesi]);

        } while ($cek->fetch());

        // Menyimpan sesi ke database
        $sql = "
            INSERT INTO sesi (
                mata_kuliah,
                kode_sesi,
                waktu_mulai,
                waktu_tutup,
                durasi_menit,
                id_pengguna
            ) VALUES (
                :mata_kuliah,
                :kode_sesi,
                :waktu_mulai,
                :waktu_tutup,
                :durasi_menit,
                :id_pengguna
            )
        ";

        $stmt = $db->prepare($sql);

        $stmt->execute([
            ':mata_kuliah' => $mataKuliah,
            ':kode_sesi' => $kodeSesi,
            ':waktu_mulai' => $waktuMulai->format('Y-m-d H:i:s'),
            ':waktu_tutup' => $waktuTutup->format('Y-m-d H:i:s'),
            ':durasi_menit' => $durasi,
            ':id_pengguna' => $_SESSION['id_pengguna']
        ]);

        $idSesi = $db->lastInsertId();

        sendResponse(
            true,
            'Session created successfully.',
            [
                'id_sesi' => (int) $idSesi,
                'kode_sesi' => $kodeSesi
            ]
        );

    } catch (PDOException $e) {

        sendResponse(
            false,
            'Failed to create session.',
            null,
            500
        );
    }
}


// ======================================
// DETAIL SESI
// ======================================

if ($action === 'detail' && $method === 'GET') {

    $idSesi = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if (!$idSesi || $idSesi < 1) {
        sendResponse(false, 'Invalid session ID.', null, 400);
    }

    try {
        // Ambil informasi sesi
        $sql = "
            SELECT
                s.*,
                COALESCE(p.nama, 'Administrator') AS dibuat_oleh,
                TIMESTAMPDIFF(
                    SECOND,
                    s.waktu_mulai,
                    s.waktu_tutup
                ) AS detik_durasi
            FROM sesi s
            LEFT JOIN pengguna p
                ON s.id_pengguna = p.id_pengguna
            WHERE s.id_sesi = :id
            LIMIT 1
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $idSesi]);

        $sesi = $stmt->fetch();

        if (!$sesi) {
            sendResponse(false, 'Session not found.', null, 404);
        }

        // Tentukan status sesi
        $sekarang = new DateTime();
        $mulai = new DateTime($sesi['waktu_mulai']);
        $tutup = new DateTime($sesi['waktu_tutup']);

        if ($sekarang < $mulai) {
            $sesi['status'] = 'akan_datang';
        } elseif ($sekarang >= $tutup) {
            $sesi['status'] = 'selesai';
        } else {
            $sesi['status'] = 'aktif';
        }

        $sesi['detik_durasi'] = (int) $sesi['detik_durasi'];

        // Ambil seluruh mahasiswa dan data absensinya
        $sqlDaftar = "
            SELECT
                m.nim,
                m.nama,
                m.kelas,
                a.status,
                a.waktu_absen,
                a.ip_client
            FROM mahasiswa m
            LEFT JOIN absensi a
                ON a.nim = m.nim
                AND a.id_sesi = :id
            ORDER BY m.nama ASC
        ";

        $stmtDaftar = $db->prepare($sqlDaftar);
        $stmtDaftar->execute([':id' => $idSesi]);

        $daftar = $stmtDaftar->fetchAll();

        // Mahasiswa tanpa absensi diberi status belum/tidak_hadir
        foreach ($daftar as &$mahasiswa) {
            if ($mahasiswa['status'] === null) {
                $mahasiswa['status'] =
                    $sesi['status'] === 'selesai'
                    ? 'tidak_hadir'
                    : 'belum';
            }
        }

        unset($mahasiswa);

        // Ambil IP server untuk alamat akses jaringan
        $ipServer = $_SERVER['SERVER_ADDR'] ?? '127.0.0.1';

        sendResponse(true, 'Session detail retrieved successfully.', [
            'sesi' => $sesi,
            'daftar' => $daftar,
            'ip_server' => $ipServer
        ]);

    } catch (PDOException $e) {
        sendResponse(false, 'Failed to retrieve session detail.', null, 500);
    }
}


// ======================================
// TUTUP SESI ABSENSI
// ======================================

if ($action === 'tutup' && $method === 'POST') {

    $idSesi = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if (!$idSesi || $idSesi < 1) {
        sendResponse(false, 'Invalid session ID.', null, 400);
    }

    try {

        $stmt = $db->prepare(
            "SELECT id_sesi, waktu_mulai, waktu_tutup
             FROM sesi
             WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);
        $sesi = $stmt->fetch();

        if (!$sesi) {
            sendResponse(false, 'Session not found.', null, 404);
        }

        // Sesi yang sudah berakhir tidak perlu ditutup lagi
        if (new DateTime() >= new DateTime($sesi['waktu_tutup'])) {
            sendResponse(false, 'Session has already ended.', null, 400);
        }

        if (new DateTime() < new DateTime($sesi['waktu_mulai'])) {
            sendResponse(false, 'Session has not started yet.', null, 400);
        }

        // Tutup sesi pada waktu sekarang
        $stmt = $db->prepare(
            "UPDATE sesi
             SET waktu_tutup = NOW()
             WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);

        sendResponse(
            true,
            'Session closed successfully.',
            null
        );

    } catch (PDOException $e) {

        sendResponse(
            false,
            'Failed to close session.',
            null,
            500
        );
    }
}


// ======================================
// HAPUS ABSENSI MAHASISWA
// ======================================

if ($action === 'hapus_absen' && $method === 'POST') {

    $idSesi = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    $nim = trim($_POST['nim'] ?? '');

    if (!$idSesi || $idSesi < 1 || $nim === '') {
        sendResponse(false, 'Session ID and NIM are required.', null, 400);
    }

    try {

        $stmt = $db->prepare(
            "SELECT id_sesi, waktu_tutup
             FROM sesi
             WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);
        $sesi = $stmt->fetch();

        if (!$sesi) {
            sendResponse(false, 'Session not found.', null, 404);
        }

        $stmt = $db->prepare(
            "DELETE FROM absensi
             WHERE id_sesi = :id
             AND nim = :nim"
        );

        $stmt->execute([
            ':id' => $idSesi,
            ':nim' => $nim
        ]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Attendance record not found.', null, 404);
        }

        sendResponse(
            true,
            'Attendance deleted successfully.',
            null
        );

    } catch (PDOException $e) {

        sendResponse(
            false,
            'Failed to delete attendance.',
            null,
            500
        );
    }
}


// ======================================
// HAPUS SESI
// ======================================

if ($action === 'hapus' && $method === 'POST') {

    $idSesi = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);

    if (!$idSesi || $idSesi < 1) {
        sendResponse(false, 'Invalid session ID.', null, 400);
    }

    try {

        $db->beginTransaction();

        // Pastikan sesi tersedia
        $stmt = $db->prepare(
            "SELECT id_sesi FROM sesi WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);

        if (!$stmt->fetch()) {
            $db->rollBack();
            sendResponse(false, 'Session not found.', null, 404);
        }

        // Hapus catatan absensi terlebih dahulu
        $stmt = $db->prepare(
            "DELETE FROM absensi WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);

        // Hapus sesi
        $stmt = $db->prepare(
            "DELETE FROM sesi WHERE id_sesi = :id"
        );

        $stmt->execute([':id' => $idSesi]);

        $db->commit();

        sendResponse(
            true,
            'Session deleted successfully.',
            null
        );

    } catch (PDOException $e) {

        if ($db->inTransaction()) {
            $db->rollBack();
        }

        sendResponse(
            false,
            'Failed to delete session.',
            null,
            500
        );
    }
}

// ======================================
// AKSI BELUM TERSEDIA
// ======================================

sendResponse(
    false,
    'Invalid action or HTTP method.',
    null,
    400
);
