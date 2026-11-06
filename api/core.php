<?php
declare(strict_types=1);
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success'=>false,'message'=>'api/config.php belum dibuat dari config.example.php']);
    exit;
}
$config = require $configFile;
date_default_timezone_set($config['timezone'] ?? 'Asia/Jakarta');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params(['httponly'=>true,'samesite'=>'Lax','secure'=>!empty($_SERVER['HTTPS'])]);
    session_start();
}
try {
    $pdo = new PDO(
        'mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4',
        $config['db_user'], $config['db_pass'],
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]
    );
} catch (Throwable $e) {
    jsonResponse(['success'=>false,'message'=>'Koneksi database gagal. Periksa api/config.php dan layanan MySQL.'],500);
}
function jsonResponse(array $payload, int $status=200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
function success(mixed $data=null, string $message='OK'): never { jsonResponse(['success'=>true,'message'=>$message,'data'=>$data]); }
function fail(string $message,int $status=400): never { jsonResponse(['success'=>false,'message'=>$message],$status); }
function input(string $key, mixed $default=null): mixed { return $_POST[$key] ?? $_GET[$key] ?? $default; }
function requireAdmin(): array {
    if (empty($_SESSION['user_id'])) fail('Silakan login terlebih dahulu.',401);
    global $pdo;
    $q=$pdo->prepare('SELECT user_id,username,full_name,on_time_minutes,duration_default FROM users WHERE user_id=?');
    $q->execute([$_SESSION['user_id']]); $u=$q->fetch();
    if (!$u) { session_destroy(); fail('Sesi login tidak valid.',401); }
    return $u;
}
function clientIp(): string { return substr($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '',0,45); }
function sessionState(array $s): string {
    $now=time(); $start=strtotime($s['start_time']); $end=strtotime($s['end_time']);
    if ($now<$start) return 'upcoming';
    if ($now<$end && empty($s['closed_at'])) return 'active';
    return 'closed';
}
function refreshSession(array $s): array {
    $s['status']=sessionState($s);
    $s['duration_seconds']=max(0,strtotime($s['end_time'])-strtotime($s['start_time']));
    $s['elapsed_seconds']=time()-strtotime($s['start_time']);
    return $s;
}
function sessionStats(PDO $pdo,int $id): array {
    $q=$pdo->prepare("SELECT SUM(a.status='present') present_count,SUM(a.status='late') late_count FROM attendances a WHERE a.session_id=?");
    $q->execute([$id]); $r=$q->fetch() ?: [];
    $total=(int)$pdo->query('SELECT COUNT(*) FROM students')->fetchColumn();
    return ['present_count'=>(int)($r['present_count']??0),'late_count'=>(int)($r['late_count']??0),'student_total'=>$total];
}
function getSession(PDO $pdo,int $id): array|false {
    $q=$pdo->prepare('SELECT cs.*,u.full_name created_by FROM class_sessions cs JOIN users u ON u.user_id=cs.user_id WHERE cs.session_id=?');
    $q->execute([$id]); return $q->fetch();
}
