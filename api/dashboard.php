<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

requireAdmin();

try {
    $pdo = db();
    $studentCount = (int) $pdo->query('SELECT COUNT(*) FROM students')->fetchColumn();
    $classCount = (int) $pdo->query('SELECT COUNT(DISTINCT class_name) FROM students')->fetchColumn();

    $todayStmt = $pdo->prepare("SELECT
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_today,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_today
        FROM attendances a WHERE DATE(a.checked_in_at) = CURDATE()");
    $todayStmt->execute();
    $today = $todayStmt->fetch() ?: [];

    $activityStmt = $pdo->query("SELECT a.student_nim, s.student_name, s.class_name,
                a.status, a.checked_in_at, cs.course_name
            FROM attendances a
            INNER JOIN students s ON s.student_nim = a.student_nim
            INNER JOIN class_sessions cs ON cs.session_id = a.session_id
            ORDER BY a.checked_in_at DESC LIMIT 8");
    $activity = $activityStmt->fetchAll();

    jsonResponse([
        'student_count' => $studentCount,
        'class_count' => $classCount,
        'present_today' => (int) ($today['present_today'] ?? 0),
        'late_today' => (int) ($today['late_today'] ?? 0),
        'recent_activity' => $activity,
    ]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail('A database error occurred.', 500);
}
