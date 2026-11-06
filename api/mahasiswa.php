
<?php

require_once __DIR__ . '/koneksi.php';

// Get requested action
$action = $_GET['aksi'] ?? '';

// All actions require admin login
requireLogin();

// Only allow GET and POST requests
$method = $_SERVER['REQUEST_METHOD'];

try {

    // GET: Retrieve all students
    if ($action === 'daftar' && $method === 'GET') {

        $sql = "SELECT nim, nama, kelas, dibuat_pada
                FROM mahasiswa
                ORDER BY nama ASC";

        $stmt = $db->query($sql);

        sendResponse(
            true,
            'Student data retrieved successfully.',
            $stmt->fetchAll()
        );
    }

    // POST: Add a new student
    if ($action === 'tambah' && $method === 'POST') {

        $nim = trim($_POST['nim'] ?? '');
        $name = trim($_POST['nama'] ?? '');
        $class = trim($_POST['kelas'] ?? '');

        if ($nim === '' || $name === '' || $class === '') {
            sendResponse(false, 'All fields are required.', null, 400);
        }

        if (!preg_match('/^[A-Za-z0-9.\-]{3,20}$/', $nim)) {
            sendResponse(false, 'Invalid student ID.', null, 400);
        }

        $sql = "INSERT INTO mahasiswa (nim, nama, kelas)
                VALUES (:nim, :nama, :kelas)";

        $stmt = $db->prepare($sql);

        $stmt->execute([
            ':nim' => $nim,
            ':nama' => $name,
            ':kelas' => $class
        ]);

        sendResponse(true, 'Student added successfully.');
    }

    // POST: Update student information
    if ($action === 'ubah' && $method === 'POST') {

        $nim = trim($_POST['nim'] ?? '');
        $name = trim($_POST['nama'] ?? '');
        $class = trim($_POST['kelas'] ?? '');

        if ($nim === '' || $name === '' || $class === '') {
            sendResponse(false, 'All fields are required.', null, 400);
        }

        $sql = "UPDATE mahasiswa
                SET nama = :nama, kelas = :kelas
                WHERE nim = :nim";

        $stmt = $db->prepare($sql);

        $stmt->execute([
            ':nama' => $name,
            ':kelas' => $class,
            ':nim' => $nim
        ]);

        if ($stmt->rowCount() === 0) {
            $check = $db->prepare(
                "SELECT nim FROM mahasiswa WHERE nim = :nim"
            );
            $check->execute([':nim' => $nim]);

            if (!$check->fetch()) {
                sendResponse(false, 'Student not found.', null, 404);
            }
        }

        sendResponse(true, 'Student updated successfully.');
    }

    // POST: Delete a student
    if ($action === 'hapus' && $method === 'POST') {

        $nim = trim($_POST['nim'] ?? '');

        if ($nim === '') {
            sendResponse(false, 'Student ID is required.', null, 400);
        }

        $sql = "DELETE FROM mahasiswa WHERE nim = :nim";

        $stmt = $db->prepare($sql);
        $stmt->execute([':nim' => $nim]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Student not found.', null, 404);
        }

        sendResponse(true, 'Student deleted successfully.');
    }

    sendResponse(false, 'Invalid action or HTTP method.', null, 400);

} catch (PDOException $e) {

    if ($e->getCode() === '23000') {
        sendResponse(false, 'Student ID already exists.', null, 409);
    }

    sendResponse(false, 'A database error occurred.', null, 500);
}
