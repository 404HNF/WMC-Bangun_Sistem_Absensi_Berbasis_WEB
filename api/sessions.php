<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

$admin = requireAdmin();
$action = (string) ($_GET['action'] ?? '');

try {
    if ($action === 'list') {
        $rows = db()->query(sessionSelectSql() . ' ORDER BY cs.start_time DESC')->fetchAll();
        jsonResponse(array_map('sessionComputedFields', $rows));
    }

    if ($action === 'detail') {
        $id = filter_var($_GET['session_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) fail('A valid session_id is required.');
        $stmt = db()->prepare(sessionSelectSql() . ' WHERE cs.session_id = ?');
        $stmt->execute([$id]);
        $session = $stmt->fetch();
        if (!$session) fail('Session not found.', 404);
        $session = sessionComputedFields($session);

        $studentSql = "SELECT s.student_nim, s.student_name, s.class_name,
                              a.checked_in_at, a.status, a.client_ip
                       FROM students s
                       LEFT JOIN attendances a
                         ON a.student_nim = s.student_nim AND a.session_id = ?
                       ORDER BY s.class_name, s.student_name";
        $studentStmt = db()->prepare($studentSql);
        $studentStmt->execute([$id]);
        $students = $studentStmt->fetchAll();
        foreach ($students as &$student) {
            $student['status'] = $student['status'] ?: ($session['status'] === 'closed' ? 'absent' : 'pending');
        }
        unset($student);

        jsonResponse([
            'session' => $session,
            'students' => $students,
            'server_ip' => (string) gethostbyname(gethostname()),
        ]);
    }

    requireMethod('POST');
    if ($action === 'create') {
        $course = requiredString('course_name', 150);
        $duration = filter_var(input('duration', DEFAULT_SESSION_DURATION), FILTER_VALIDATE_INT);
        if (!$duration || $duration < 1 || $duration > 300) fail('Session duration must be between 1 and 300 minutes.');

        $startInput = trim((string) input('start_time', ''));
        $startTimestamp = $startInput !== '' ? strtotime($startInput) : time();
        if ($startTimestamp === false) fail('Invalid session start time.');
        $endTimestamp = $startTimestamp + ($duration * 60);
        $start = date('Y-m-d H:i:s', $startTimestamp);
        $end = date('Y-m-d H:i:s', $endTimestamp);

        $pdo = db();
        $code = '';
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $candidate = (string) random_int(100000, 999999);
            $check = $pdo->prepare('SELECT 1 FROM class_sessions WHERE session_code = ? AND end_time > NOW() LIMIT 1');
            $check->execute([$candidate]);
            if (!$check->fetchColumn()) { $code = $candidate; break; }
        }
        if ($code === '') fail('Could not generate a unique session code. Please try again.', 500);

        $stmt = $pdo->prepare('INSERT INTO class_sessions (user_id, course_name, session_code, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$admin['user_id'], $course, $code, $start, $end]);
        jsonResponse(['session_id' => (int) $pdo->lastInsertId(), 'session_code' => $code], 201, 'Session created.');
    }

    if ($action === 'close') {
        $id = filter_var(input('session_id'), FILTER_VALIDATE_INT);
        if (!$id) fail('A valid session_id is required.');
        $stmt = db()->prepare('UPDATE class_sessions SET end_time = LEAST(end_time, NOW()) WHERE session_id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) {
            $check = db()->prepare('SELECT 1 FROM class_sessions WHERE session_id = ?');
            $check->execute([$id]);
            if (!$check->fetchColumn()) fail('Session not found.', 404);
        }
        jsonResponse(['session_id' => (int) $id], 200, 'Session closed.');
    }

    if ($action === 'delete_attendance') {
        $id = filter_var(input('session_id'), FILTER_VALIDATE_INT);
        $nim = requiredString('student_nim', 20);
        if (!$id) fail('A valid session_id is required.');
        $stmt = db()->prepare('DELETE FROM attendances WHERE session_id = ? AND student_nim = ?');
        $stmt->execute([$id, $nim]);
        if (!$stmt->rowCount()) fail('Attendance record not found.', 404);
        jsonResponse([], 200, 'Attendance record deleted.');
    }

    if ($action === 'delete') {
        $id = filter_var(input('session_id'), FILTER_VALIDATE_INT);
        if (!$id) fail('A valid session_id is required.');
        $stmt = db()->prepare('DELETE FROM class_sessions WHERE session_id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) fail('Session not found.', 404);
        jsonResponse(['session_id' => (int) $id], 200, 'Session deleted.');
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail('A database error occurred.', 500);
}
