<?php
require __DIR__.'/core.php';$current=requireAdmin();$action=$_GET['action']??'list';
if($action==='list'){
 $rows=$pdo->query('SELECT u.user_id,u.username,u.full_name,COUNT(cs.session_id) session_count FROM users u LEFT JOIN class_sessions cs ON cs.user_id=u.user_id GROUP BY u.user_id ORDER BY u.full_name')->fetchAll();
 success(['users'=>$rows,'current_user_id'=>(int)$current['user_id']]);
}
if($action==='create'||$action==='update'){
 $id=(int)input('user_id',0);$name=trim((string)input('full_name',''));$username=trim((string)input('username',''));$password=(string)input('password','');
 if($name===''||!preg_match('/^[A-Za-z0-9_.-]{3,30}$/',$username))fail('Nama atau username tidak valid.');
 try{
  if($action==='create'){if(strlen($password)<6)fail('Password minimal 6 karakter.');$q=$pdo->prepare('INSERT INTO users(username,password_hash,full_name) VALUES(?,?,?)');$q->execute([$username,password_hash($password,PASSWORD_DEFAULT),$name]);}
  else {if($password!==''){if(strlen($password)<6)fail('Password minimal 6 karakter.');$q=$pdo->prepare('UPDATE users SET username=?,full_name=?,password_hash=? WHERE user_id=?');$q->execute([$username,$name,password_hash($password,PASSWORD_DEFAULT),$id]);}else{$q=$pdo->prepare('UPDATE users SET username=?,full_name=? WHERE user_id=?');$q->execute([$username,$name,$id]);}}
 }catch(PDOException $e){fail('Username sudah digunakan.',409);}
 success(null,'Pengguna disimpan.');
}
if($action==='delete'){
 $id=(int)input('user_id',0);if($id===(int)$current['user_id'])fail('Akun yang sedang digunakan tidak dapat dihapus.');
 $q=$pdo->prepare('DELETE FROM users WHERE user_id=?');$q->execute([$id]);success(null,'Pengguna dihapus.');
}
fail('Aksi tidak dikenal.',404);
