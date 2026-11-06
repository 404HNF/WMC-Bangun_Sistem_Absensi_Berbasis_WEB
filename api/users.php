<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

$admin = requireAdmin();
$action = (string) ($_GET['action'] ?? '');

try {
    if ($action === 'list') {
        $rows = db()->query("SELECT u.user_id, u.username, u.full_name,
                    (SELECT COUNT(*) FROM class_sessions cs WHERE cs.user_id = u.user_id) AS session_count
                FROM users u ORDER BY u.full_name")->fetchAll();
        foreach ($rows as &$row) {
            $row['user_id'] = (int) $row['user_id'];
            $row['session_count'] = (int) $row['session_count'];
        }
        unset($row);
        jsonResponse(['users' => $rows, 'current_user_id' => $admin['user_id']]);
    }

    requireMethod('POST');
    if ($action === 'create') {
        $fullName = requiredString('full_name', 120);
        $username = requiredString('username', 60);
        $password = (string) input('password', '');
        if (strlen($password) < 6) fail('Password must contain at least 6 characters.');
        $stmt = db()->prepare('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)');
        try {
            $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $fullName]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') fail('Username is already in use.');
            throw $e;
        }
        jsonResponse(['user_id' => (int) db()->lastInsertId()], 201, 'User created.');
    }

    if ($action === 'update') {
        $id = filter_var(input('user_id'), FILTER_VALIDATE_INT);
        if (!$id) fail('A valid user_id is required.');
        $fullName = requiredString('full_name', 120);
        $username = requiredString('username', 60);
        $password = (string) input('password', '');
        if ($password !== '' && strlen($password) < 6) fail('Password must contain at least 6 characters.');

        if ($password !== '') {
            $stmt = db()->prepare('UPDATE users SET full_name = ?, username = ?, password_hash = ? WHERE user_id = ?');
            $stmt->execute([$fullName, $username, password_hash($password, PASSWORD_DEFAULT), $id]);
        } else {
            $stmt = db()->prepare('UPDATE users SET full_name = ?, username = ? WHERE user_id = ?');
            $stmt->execute([$fullName, $username, $id]);
        }
        jsonResponse(['user_id' => (int) $id], 200, 'User updated.');
    }

    if ($action === 'delete') {
        $id = filter_var(input('user_id'), FILTER_VALIDATE_INT);
        if (!$id) fail('A valid user_id is required.');
        if ((int) $id === $admin['user_id']) fail('You cannot delete the account currently in use.');
        $stmt = db()->prepare('DELETE FROM users WHERE user_id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) fail('User not found.', 404);
        jsonResponse(['user_id' => (int) $id], 200, 'User deleted.');
    }

    fail('Unknown action.', 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    if ($e->getCode() === '23000') fail('This username is already in use or the user is referenced by existing data.');
    fail('A database error occurred.', 500);
}
