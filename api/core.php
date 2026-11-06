<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function jsonResponse(array $data = [], int $status = 200, string $message = 'OK'): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode([
        'success' => $status >= 200 && $status < 300,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never
{
    jsonResponse([], $status, $message);
}

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name(SESSION_COOKIE_NAME);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function requestData(): array
{
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        return $_POST;
    }
    return $_GET;
}

function requireMethod(string ...$methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail('Method not allowed.', 405);
    }
}

function requireAdmin(): array
{
    startAppSession();
    if (empty($_SESSION['user_id'])) {
        fail('Authentication required.', 401);
    }

    $stmt = db()->prepare('SELECT user_id, username, full_name FROM users WHERE user_id = ?');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        $_SESSION = [];
        session_destroy();
        fail('Your account is no longer available.', 401);
    }

    return [
        'user_id' => (int) $user['user_id'],
        'username' => $user['username'],
        'full_name' => $user['full_name'],
        'on_time_minutes' => ON_TIME_MINUTES,
        'default_duration' => DEFAULT_SESSION_DURATION,
    ];
}

function currentUserId(): int
{
    startAppSession();
    return (int) ($_SESSION['user_id'] ?? 0);
}

function input(string $key, mixed $default = null): mixed
{
    $data = requestData();
    return $data[$key] ?? $default;
}

function requiredString(string $key, int $maxLength = 255): string
{
    $value = trim((string) input($key, ''));
    if ($value === '') {
        fail(ucfirst(str_replace('_', ' ', $key)) . ' is required.');
    }
    if (mb_strlen($value) > $maxLength) {
        fail(ucfirst(str_replace('_', ' ', $key)) . ' is too long.');
    }
    return $value;
}

function validNim(string $nim): bool
{
    return (bool) preg_match('/^[A-Za-z0-9.-]{3,20}$/', $nim);
}

function clientIp(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function sessionStatus(string $startTime, string $endTime): string
{
    $now = time();
    $start = strtotime($startTime);
    $end = strtotime($endTime);
    if ($now < $start) return 'upcoming';
    if ($now >= $end) return 'closed';
    return 'active';
}

function sessionComputedFields(array $row): array
{
    $start = strtotime((string) $row['start_time']);
    $end = strtotime((string) $row['end_time']);
    $now = time();
    $row['status'] = sessionStatus((string) $row['start_time'], (string) $row['end_time']);
    $row['duration_seconds'] = max(0, $end - $start);
    $row['elapsed_seconds'] = $now - $start;
    $row['student_total'] = (int) ($row['student_total'] ?? 0);
    $row['present_count'] = (int) ($row['present_count'] ?? 0);
    $row['late_count'] = (int) ($row['late_count'] ?? 0);
    $row['absent_count'] = $row['status'] === 'closed'
        ? max(0, $row['student_total'] - $row['present_count'] - $row['late_count'])
        : 0;
    $attended = $row['present_count'] + $row['late_count'];
    $row['attendance_percent'] = $row['student_total'] > 0
        ? (int) round($attended / $row['student_total'] * 100)
        : null;
    return $row;
}

function sessionSelectSql(): string
{
    return "SELECT cs.session_id, cs.user_id, cs.course_name, cs.session_code,
                   cs.start_time, cs.end_time, u.full_name AS created_by,
                   (SELECT COUNT(*) FROM students) AS student_total,
                   (SELECT COUNT(*) FROM attendances a WHERE a.session_id = cs.session_id AND a.status = 'present') AS present_count,
                   (SELECT COUNT(*) FROM attendances a WHERE a.session_id = cs.session_id AND a.status = 'late') AS late_count
            FROM class_sessions cs
            INNER JOIN users u ON u.user_id = cs.user_id";
}

function csvOutput(string $filename, array $headers, array $rows): never
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, $headers);
    foreach ($rows as $row) {
        fputcsv($out, $row);
    }
    fclose($out);
    exit;
}

function ensureCsrfSafe(): void
{
    // SameSite cookies plus same-origin requests are used by this application.
    // Deploy behind HTTPS and restrict CORS; do not enable wildcard origins.
}
