<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

$action = (string) ($_GET['action'] ?? '');
startAppSession();

try {
    if ($action === 'check') {
        $user = requireAdmin();
        jsonResponse($user);
    }

    if ($action === 'login') {
        requireMethod('POST');
        $username = trim((string) input('username', ''));
        $password = (string) input('password', '');
        if ($username === '' || $password === '') fail('Username and password are required.');

        $stmt = db()->prepare('SELECT user_id, username, password_hash, full_name FROM users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            fail('Invalid username or password.', 401);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['user_id'];
        jsonResponse([
            'user_id' => (int) $user['user_id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'on_time_minutes' => ON_TIME_MINUTES,
            'default_duration' => DEFAULT_SESSION_DURATION,
        ], 200, 'Login successful.');
    }

    if ($action === 'logout') {
        requireMethod('POST');
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
        }
        session_destroy();
        jsonResponse([], 200, 'Logout successful.');
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail('A database error occurred.', 500);
}
