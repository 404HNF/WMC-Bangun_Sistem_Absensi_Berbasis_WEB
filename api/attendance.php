<?php
require __DIR__.'/core.php';
$action=$_GET['action']??'info';
$settings=$pdo->query('SELECT on_time_minutes,duration_default FROM app_settings WHERE setting_id=1')->fetch() ?: ['on_time_minutes'=>5,'duration_default'=>10];
if($action==='info'){
    $count=(int)$pdo->query("SELECT COUNT(*) FROM class_sessions WHERE start_time<=NOW() AND end_time>NOW() AND closed_at IS NULL")->fetchColumn();
    success(['active_sessions'=>$count,'server_time'=>date('H:i:s'),'on_time_minutes'=>(int)$settings['on_time_minutes'],'default_duration'=>(int)$settings['duration_default']]);
}
if($action==='submit'){
    $nim=trim((string)input('student_nim',''));$code=trim((string)input('session_code',''));
    if(!preg_match('/^[A-Za-z0-9.-]{3,20}$/',$nim)||!preg_match('/^\d{6}$/',$code))fail('NIM atau kode sesi tidak valid.');
    $q=$pdo->prepare('SELECT * FROM students WHERE student_nim=?');$q->execute([$nim]);$student=$q->fetch();if(!$student)fail('NIM belum terdaftar. Hubungi dosen/admin.',404);
    $q=$pdo->prepare('SELECT cs.*,u.full_name created_by FROM class_sessions cs JOIN users u ON u.user_id=cs.user_id WHERE session_code=? ORDER BY session_id DESC LIMIT 1');$q->execute([$code]);$s=$q->fetch();if(!$s)fail('Kode sesi tidak ditemukan.',404);
    if(!empty($s['closed_at'])||time()<strtotime($s['start_time'])||time()>strtotime($s['end_time']))fail('Sesi belum dibuka atau sudah ditutup.');
    $q=$pdo->prepare('SELECT attendance_id FROM attendances WHERE session_id=? AND student_nim=?');$q->execute([$s['session_id'],$nim]);if($q->fetch())fail('Kamu sudah melakukan absensi pada sesi ini.',409);
    $minute=(int)floor((time()-strtotime($s['start_time']))/60);
    $status=$minute<=(int)$settings['on_time_minutes']?'present':'late';
    $q=$pdo->prepare('INSERT INTO attendances(student_nim,session_id,checked_in_at,status,client_ip) VALUES(?,?,NOW(),?,?)');$q->execute([$nim,$s['session_id'],$status,clientIp()]);
    $q=$pdo->prepare("SELECT SUM(status='present') present,SUM(status='late') late,COUNT(*) meetings FROM attendances WHERE student_nim=?");$q->execute([$nim]);$summary=$q->fetch();
    $q=$pdo->prepare("SELECT cs.start_time date, a.status, (a.session_id=?) is_current FROM attendances a JOIN class_sessions cs ON cs.session_id=a.session_id WHERE a.student_nim=? ORDER BY cs.start_time DESC");$q->execute([$s['session_id'],$nim]);$history=$q->fetchAll();
    $summary=['present'=>(int)$summary['present'],'late'=>(int)$summary['late'],'absent'=>0,'meetings'=>(int)$summary['meetings'],'history'=>$history];
    success(['student_nim'=>$nim,'student_name'=>$student['student_name'],'class_name'=>$student['class_name'],'course_name'=>$s['course_name'],'checked_in_time'=>date('H:i:s'),'minute_number'=>$minute,'status'=>$status,'summary'=>$summary,'classmates'=>[]]);
}
fail('Aksi tidak dikenal.',404);
