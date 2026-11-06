<?php
require __DIR__.'/core.php';
$action=$_GET['action']??'list';
if ($action==='list') {
    requireAdmin();
    $rows=$pdo->query("SELECT cs.*,u.full_name created_by FROM class_sessions cs JOIN users u ON u.user_id=cs.user_id ORDER BY cs.start_time DESC")->fetchAll();
    foreach($rows as &$s){$s=refreshSession($s);$s=array_merge($s,sessionStats($pdo,(int)$s['session_id']));}
    success($rows);
}
if ($action==='create') {
    $u=requireAdmin(); $course=trim((string)input('course_name',''));$duration=(int)input('duration', $u['duration_default']);
    $startRaw=trim((string)input('start_time',''));$start=$startRaw!==''?date('Y-m-d H:i:s',strtotime($startRaw)):date('Y-m-d H:i:s');
    if($course==='')fail('Nama mata kuliah wajib diisi.');
    if($duration<1||$duration>300)fail('Durasi harus 1–300 menit.');
    if(strtotime($start)===false)fail('Waktu mulai tidak valid.');
    do {$code=str_pad((string)random_int(0,999999),6,'0',STR_PAD_LEFT);$q=$pdo->prepare('SELECT COUNT(*) FROM class_sessions WHERE session_code=? AND end_time>NOW()');$q->execute([$code]);}while($q->fetchColumn());
    $end=date('Y-m-d H:i:s',strtotime($start)+$duration*60);
    $q=$pdo->prepare('INSERT INTO class_sessions(user_id,course_name,session_code,start_time,end_time) VALUES(?,?,?,?,?)');$q->execute([$u['user_id'],$course,$code,$start,$end]);
    success(['session_id'=>(int)$pdo->lastInsertId(),'session_code'=>$code]);
}
requireAdmin();
$id=(int)($_GET['session_id']??input('session_id',0));
if($action==='detail'){
    $s=getSession($pdo,$id);if(!$s)fail('Sesi tidak ditemukan.',404);$s=refreshSession($s);
    $q=$pdo->prepare("SELECT st.student_nim,st.student_name,st.class_name,a.checked_in_at,a.client_ip,a.status FROM students st LEFT JOIN attendances a ON a.student_nim=st.student_nim AND a.session_id=? ORDER BY st.student_name");$q->execute([$id]);$students=$q->fetchAll();
    foreach($students as &$st) if(!$st['status'])$st['status']=$s['status']==='closed'?'absent':'pending';
    if(($_GET['format']??'')==='csv'){header('Content-Type:text/csv; charset=utf-8');header('Content-Disposition:attachment; filename="attendance-session-'.$id.'.csv"');$o=fopen('php://output','w');fputcsv($o,['NIM','Nama','Kelas','Waktu','Status','IP']);foreach($students as $st)fputcsv($o,[$st['student_nim'],$st['student_name'],$st['class_name'],$st['checked_in_at'],$st['status'],$st['client_ip']]);exit;}
    success(['session'=>$s,'students'=>$students,'server_ip'=>$_SERVER['SERVER_ADDR']??'']);
}
if($action==='close'){
    $q=$pdo->prepare('UPDATE class_sessions SET closed_at=NOW(),end_time=LEAST(end_time,NOW()) WHERE session_id=?');$q->execute([$id]);success(null,'Sesi ditutup.');
}
if($action==='delete'){
    $q=$pdo->prepare('DELETE FROM class_sessions WHERE session_id=?');$q->execute([$id]);success(null,'Sesi dihapus.');
}
if($action==='delete_attendance'){
    $q=$pdo->prepare('DELETE FROM attendances WHERE session_id=? AND student_nim=?');$q->execute([$id,input('student_nim')]);success(null,'Data absensi dihapus.');
}
fail('Aksi tidak dikenal.',404);
