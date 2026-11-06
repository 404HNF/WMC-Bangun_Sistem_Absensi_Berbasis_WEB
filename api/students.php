<?php
require __DIR__.'/core.php'; requireAdmin();
$action=$_GET['action']??'list';
if ($action==='list') success($pdo->query('SELECT student_nim,student_name,class_name,created_at FROM students ORDER BY student_name')->fetchAll());
if ($action==='create' || $action==='update') {
    $nim=trim((string)input('student_nim','')); $name=trim((string)input('student_name','')); $class=trim((string)input('class_name',''));
    if (!preg_match('/^[A-Za-z0-9.-]{3,20}$/',$nim) || $name==='' || $class==='') fail('NIM, nama, dan kelas wajib diisi dengan benar.');
    if ($action==='create') {
        try {$q=$pdo->prepare('INSERT INTO students(student_nim,student_name,class_name) VALUES(?,?,?)');$q->execute([$nim,$name,$class]);}
        catch(PDOException $e){fail('NIM sudah terdaftar.',409);}
    } else {
        $q=$pdo->prepare('UPDATE students SET student_name=?,class_name=? WHERE student_nim=?');$q->execute([$name,$class,$nim]);
        if (!$q->rowCount()) { $q=$pdo->prepare('SELECT COUNT(*) FROM students WHERE student_nim=?');$q->execute([$nim]);if(!$q->fetchColumn())fail('Mahasiswa tidak ditemukan.',404); }
    }
    success(null,'Data mahasiswa disimpan.');
}
if ($action==='delete') {
    $q=$pdo->prepare('DELETE FROM students WHERE student_nim=?');$q->execute([input('student_nim')]);
    if(!$q->rowCount())fail('Mahasiswa tidak ditemukan.',404); success(null,'Mahasiswa dihapus.');
}
fail('Aksi tidak dikenal.',404);
