<?php
require __DIR__.'/core.php';
$action=$_GET['action']??'';
if ($action==='check') {
    $u=requireAdmin(); success($u);
}
if ($action==='login') {
    $username=trim((string)input('username','')); $password=(string)input('password','');
    $q=$pdo->prepare('SELECT * FROM users WHERE username=?'); $q->execute([$username]); $u=$q->fetch();
    if (!$u || !password_verify($password,$u['password_hash'])) fail('Username atau password salah.',401);
    session_regenerate_id(true); $_SESSION['user_id']=(int)$u['user_id'];
    success(['user_id'=>(int)$u['user_id'],'username'=>$u['username'],'full_name'=>$u['full_name'],'on_time_minutes'=>(int)$u['on_time_minutes'],'duration_default'=>(int)$u['duration_default']]);
}
if ($action==='logout') { $_SESSION=[]; session_destroy(); success(null,'Berhasil keluar.'); }
fail('Aksi tidak dikenal.',404);
