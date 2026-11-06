
<?php

require_once __DIR__ . '/koneksi.php';

// ======================================
// INFORMASI SESI ABSENSI
// ======================================

if (
    ($_GET['aksi'] ?? '') === 'info' &&
    $_SERVER['REQUEST_METHOD'] === 'GET'
) {

    try {

        // Hitung sesi yang sedang berlangsung
        $sql = "
            SELECT COUNT(*)
            FROM sesi
            WHERE waktu_mulai <= NOW()
            AND waktu_tutup > NOW()
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute();

        $jumlahSesiAktif = (int) $stmt->fetchColumn();

        // Ambil jam server
        $jamServer = date('H:i:s');

        sendResponse(
            true,
            'Attendance information retrieved successfully.',
            [
                'sesi_aktif' => $jumlahSesiAktif,
                'jam_server' => $jamServer,
                'batas_hadir' => $ATTENDANCE_LIMIT,
                'durasi_default' => $DEFAULT_DURATION
            ]
        );

    } catch (PDOException $e) {

        sendResponse(
            false,
            'Failed to retrieve attendance information.',
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
