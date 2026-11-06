<?php
require __DIR__.'/core.php';requireAdmin();
$students=(int)$pdo->query('SELECT COUNT(*) FROM students')->fetchColumn();
$classes=(int)$pdo->query('SELECT COUNT(DISTINCT class_name) FROM students')->fetchColumn();
$today=$pdo->query("SELECT SUM(status='present') present_today,SUM(status='late') late_today FROM attendances WHERE DATE(checked_in_at)=CURDATE()")->fetch();
$q=$pdo->query('SELECT a.student_nim,s.student_name,cs.course_name,a.checked_in_at,a.status,TIMESTAMPDIFF(SECOND,a.checked_in_at,NOW()) seconds_ago FROM attendances a JOIN students s ON s.student_nim=a.student_nim JOIN class_sessions cs ON cs.session_id=a.session_id ORDER BY a.checked_in_at DESC LIMIT 8');
success(['student_count'=>$students,'class_count'=>$classes,'present_today'=>(int)($today['present_today']??0),'late_today'=>(int)($today['late_today']??0),'recent_activity'=>$q->fetchAll()]);
