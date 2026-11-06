<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

$action = (string) ($_GET['action'] ?? '');

try {
    if ($action === 'info') {
        $active = db()->query("SELECT COUNT(*) FROM class_sessions WHERE start_time <= NOW() AND end_time > NOW()")->fetchColumn();
        jsonResponse([
            'active_sessions' => (int) $active,
            'server_time' => date('H:i:s'),
            'on_time_minutes' => ON_TIME_MINUTES,
            'default_duration' => DEFAULT_SESSION_DURATION,
        ]);
    }

    if ($action === 'submit') {
        requireMethod('POST');
        $nim = trim((string) input('student_nim', ''));
        $code = trim((string) input('session_code', ''));
        if (!validNim($nim)) fail('Enter a valid student NIM.');
        if (!preg_match('/^\d{6}$/', $code)) fail('Session code must contain exactly 6 digits.');

        $pdo = db();
        $stmt = $pdo->prepare("SELECT cs.session_id, cs.course_name, cs.start_time, cs.end_time,
                                      s.student_nim, s.student_name, s.class_name
                               FROM class_sessions cs
                               INNER JOIN students s ON s.student_nim = ?
                               WHERE cs.session_code = ? LIMIT 1");
        $stmt->execute([$nim, $code]);
        $row = $stmt->fetch();
        if (!$row) fail('Student NIM or session code was not found.', 404);

        $now = time();
        $start = strtotime($row['start_time']);
        $end = strtotime($row['end_time']);
        if ($now < $start) fail('This session has not started yet.');
        if ($now >= $end) fail('This session is already closed.');

        $existing = $pdo->prepare('SELECT attendance_id FROM attendances WHERE session_id = ? AND student_nim = ?');
        $existing->execute([$row['session_id'], $nim]);
        if ($existing->fetchColumn()) fail('Attendance has already been submitted for this session.', 409);

        $minuteNumber = max(0, (int) floor(($now - $start) / 60));
        $status = ($now - $start) <= ON_TIME_MINUTES * 60 ? 'present' : 'late';
        $checkedInAt = date('Y-m-d H:i:s');
        $insert = $pdo->prepare('INSERT INTO attendances (student_nim, session_id, checked_in_at, status, client_ip) VALUES (?, ?, ?, ?, ?)');
        $insert->execute([$nim, $row['session_id'], $checkedInAt, $status, clientIp()]);

        $summaryStmt = $pdo->prepare("SELECT
                COUNT(DISTINCT cs.session_id) AS meetings,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count
            FROM class_sessions cs
            LEFT JOIN attendances a ON a.session_id = cs.session_id AND a.student_nim = ?
            WHERE cs.course_name = ? AND cs.start_time <= NOW()");
        $summaryStmt->execute([$nim, $row['course_name']]);
        $summary = $summaryStmt->fetch() ?: [];
        $meetings = (int) ($summary['meetings'] ?? 0);
        $present = (int) ($summary['present_count'] ?? 0);
        $late = (int) ($summary['late_count'] ?? 0);

        $historyStmt = $pdo->prepare("SELECT DATE_FORMAT(cs.start_time, '%Y-%m-%d') AS date,
                    COALESCE(a.status, CASE WHEN cs.end_time <= NOW() THEN 'absent' ELSE 'pending' END) AS status,
                    cs.session_id = ? AS is_current
                FROM class_sessions cs
                LEFT JOIN attendances a ON a.session_id = cs.session_id AND a.student_nim = ?
                WHERE cs.course_name = ? AND cs.start_time <= NOW()
                ORDER BY cs.start_time DESC");
        $historyStmt->execute([$row['session_id'], $nim, $row['course_name']]);
        $history = $historyStmt->fetchAll();
        $absent = max(0, $meetings - $present - $late);

        $classmatesStmt = $pdo->prepare('SELECT student_nim, student_name, (student_nim = ?) AS is_me FROM students WHERE class_name = ? ORDER BY student_name');
        $classmatesStmt->execute([$nim, $row['class_name']]);
        $classmates = $classmatesStmt->fetchAll();
        foreach ($classmates as &$classmate) $classmate['is_me'] = (bool) $classmate['is_me'];
        unset($classmate);

        jsonResponse([
            'student_nim' => $nim,
            'student_name' => $row['student_name'],
            'class_name' => $row['class_name'],
            'course_name' => $row['course_name'],
            'checked_in_time' => date('H:i:s'),
            'checked_in_at' => $checkedInAt,
            'minute_number' => $minuteNumber,
            'status' => $status,
            'summary' => [
                'meetings' => $meetings,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'history' => $history,
            ],
            'classmates' => $classmates,
        ], 201, 'Attendance submitted.');
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    if ($e->getCode() === '23000') fail('Attendance has already been submitted for this session.', 409);
    fail('A database error occurred.', 500);
}
