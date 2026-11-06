<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

$admin = requireAdmin();
$action = (string) ($_GET['action'] ?? '');

try {
    if ($action === 'list') {
        $rows = db()->query('SELECT student_nim, student_name, class_name, created_at FROM students ORDER BY class_name, student_name')->fetchAll();
        jsonResponse($rows);
    }

    requireMethod('POST');
    if ($action === 'create') {
        $nim = requiredString('student_nim', 20);
        if (!validNim($nim)) fail('Student NIM must contain 3–20 letters, numbers, dots, or hyphens.');
        $name = requiredString('student_name', 120);
        $class = requiredString('class_name', 80);
        $stmt = db()->prepare('INSERT INTO students (student_nim, student_name, class_name) VALUES (?, ?, ?)');
        try {
            $stmt->execute([$nim, $name, $class]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') fail('This student NIM already exists.');
            throw $e;
        }
        jsonResponse(['student_nim' => $nim], 201, 'Student created.');
    }

    if ($action === 'update') {
        $nim = requiredString('student_nim', 20);
        $name = requiredString('student_name', 120);
        $class = requiredString('class_name', 80);
        $stmt = db()->prepare('UPDATE students SET student_name = ?, class_name = ? WHERE student_nim = ?');
        $stmt->execute([$name, $class, $nim]);
        if (!$stmt->rowCount()) {
            $check = db()->prepare('SELECT 1 FROM students WHERE student_nim = ?');
            $check->execute([$nim]);
            if (!$check->fetchColumn()) fail('Student not found.', 404);
        }
        jsonResponse(['student_nim' => $nim], 200, 'Student updated.');
    }

    if ($action === 'delete') {
        $nim = requiredString('student_nim', 20);
        $stmt = db()->prepare('DELETE FROM students WHERE student_nim = ?');
        $stmt->execute([$nim]);
        if (!$stmt->rowCount()) fail('Student not found.', 404);
        jsonResponse(['student_nim' => $nim], 200, 'Student deleted.');
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail('A database error occurred.', 500);
}
