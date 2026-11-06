<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

requireAdmin();
$action = (string) ($_GET['action'] ?? '');
$course = trim((string) ($_GET['course_name'] ?? ''));
$className = trim((string) ($_GET['class_name'] ?? ''));

try {
    $pdo = db();

    if ($action === 'filters') {
        $courses = $pdo->query('SELECT DISTINCT course_name FROM class_sessions ORDER BY course_name')->fetchAll(PDO::FETCH_COLUMN);
        $classes = $pdo->query('SELECT DISTINCT class_name FROM students ORDER BY class_name')->fetchAll(PDO::FETCH_COLUMN);
        jsonResponse(['courses' => $courses, 'classes' => $classes]);
    }

    if ($action === 'sessions' || $action === 'students') {
        $params = [];
        $where = [];
        if ($course !== '') { $where[] = 'cs.course_name = ?'; $params[] = $course; }
        if ($className !== '') { $where[] = 'EXISTS (SELECT 1 FROM students sf WHERE sf.class_name = ?)'; $params[] = $className; }
        $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

        if ($action === 'sessions') {
            if ($className !== '') {
                $sql = "SELECT cs.session_id, cs.user_id, cs.course_name, cs.session_code,
                               cs.start_time, cs.end_time, u.full_name AS created_by,
                               (SELECT COUNT(*) FROM students sx WHERE sx.class_name = ?) AS student_total,
                               (SELECT COUNT(*) FROM attendances a
                                  INNER JOIN students sp ON sp.student_nim = a.student_nim
                                  WHERE a.session_id = cs.session_id AND a.status = 'present' AND sp.class_name = ?) AS present_count,
                               (SELECT COUNT(*) FROM attendances a
                                  INNER JOIN students sl ON sl.student_nim = a.student_nim
                                  WHERE a.session_id = cs.session_id AND a.status = 'late' AND sl.class_name = ?) AS late_count
                        FROM class_sessions cs
                        INNER JOIN users u ON u.user_id = cs.user_id" . $whereSql . ' ORDER BY cs.start_time DESC';
                $params = array_merge([$className, $className, $className], $params);
            } else {
                $sql = sessionSelectSql() . $whereSql . ' ORDER BY cs.start_time DESC';
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = array_map('sessionComputedFields', $stmt->fetchAll());

            if (($_GET['format'] ?? '') === 'csv') {
                $csvRows = [];
                foreach ($rows as $r) $csvRows[] = [$r['session_id'], $r['course_name'], $r['session_code'], $r['start_time'], $r['end_time'], $r['status'], $r['present_count'], $r['late_count'], $r['absent_count'], $r['student_total'], $r['attendance_percent']];
                csvOutput('attendance-sessions.csv', ['Session ID','Course','Session Code','Start','End','Status','Present','Late','Absent','Students','Attendance %'], $csvRows);
            }
            jsonResponse($rows);
        }

        $studentWhere = [];
        $studentParams = [];
        if ($course !== '') { $studentWhere[] = 'cs.course_name = ?'; $studentParams[] = $course; }
        if ($className !== '') { $studentWhere[] = 's.class_name = ?'; $studentParams[] = $className; }
        $studentWhereSql = $studentWhere ? ' AND ' . implode(' AND ', $studentWhere) : '';
        $sql = "SELECT s.student_nim, s.student_name, s.class_name,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
                    SUM(CASE WHEN cs.end_time <= NOW() AND a.attendance_id IS NULL THEN 1 ELSE 0 END) AS absent_count,
                    COUNT(DISTINCT CASE WHEN cs.end_time <= NOW() THEN cs.session_id END) AS completed_sessions
                FROM students s
                LEFT JOIN class_sessions cs ON cs.start_time <= NOW()
                LEFT JOIN attendances a ON a.session_id = cs.session_id AND a.student_nim = s.student_nim
                WHERE 1=1 $studentWhereSql
                GROUP BY s.student_nim, s.student_name, s.class_name
                ORDER BY s.class_name, s.student_name";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($studentParams);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['present_count'] = (int) $row['present_count'];
            $row['late_count'] = (int) $row['late_count'];
            $row['absent_count'] = (int) $row['absent_count'];
            $total = (int) $row['completed_sessions'];
            $attended = $row['present_count'] + $row['late_count'];
            $row['attendance_percent'] = $total > 0 ? (int) round($attended / $total * 100) : null;
        }
        unset($row);

        if (($_GET['format'] ?? '') === 'csv') {
            $csvRows = [];
            foreach ($rows as $r) $csvRows[] = [$r['student_nim'], $r['student_name'], $r['class_name'], $r['present_count'], $r['late_count'], $r['absent_count'], $r['attendance_percent']];
            csvOutput('attendance-students.csv', ['NIM','Student Name','Class','Present','Late','Absent','Attendance %'], $csvRows);
        }
        jsonResponse($rows);
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail('A database error occurred.', 500);
}
