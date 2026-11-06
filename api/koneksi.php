<?php

// Database configuration
$DB_HOST = 'localhost';
$DB_NAME = 'db_absensi';
$DB_USER = 'root';
$DB_PASS = '';

// Application configuration
$ATTENDANCE_LIMIT = 15;
$DEFAULT_DURATION = 30;
$CSV_SEPARATOR = ',';

date_default_timezone_set('Asia/Jakarta');

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Database connection
try {
    $db = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        'sukses' => false,
        'pesan' => 'Database connection failed.',
        'data' => null
    ]);

    exit;
}

// Standard API response
function sendResponse($success, $message, $data = null, $statusCode = 200)
{
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'sukses' => $success,
        'pesan' => $message,
        'data' => $data
    ]);

    exit;
}

// Check admin login
function requireLogin()
{
    if (!isset($_SESSION['id_pengguna'])) {
        sendResponse(
            false,
            'Unauthorized. Please login first.',
            null,
            401
        );
    }
}
