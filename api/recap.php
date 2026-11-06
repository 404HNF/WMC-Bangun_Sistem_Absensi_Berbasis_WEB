<?php
require __DIR__.'/core.php';requireAdmin();
$course=trim((string)($_GET['course_name']??''));$class=trim((string)($_GET['class_name']??''));
if(($_GET['action']??'')==='filters'){
 success(['courses'=>$pdo->query('SELECT DISTINCT course_name FROM class_sessions ORDER BY course_name')->fetchAll(PDO::FETCH_COLUMN),'classes'=>$pdo->query('SELECT DISTINCT class_name FROM students ORDER BY class_name')->fetchAll(PDO::FETCH_COLUMN)]);
}
$where=' WHERE 1=1 ';$params=[];
if($course!==''){$where.=' AND cs.course_name=?';$params[]=$course;}
if($class!==''){$where.=' AND st.class_name=?';$params[]=$class;}
if(($_GET['action']??'')==='students'){
 $sql="SELECT st.student_nim,st.student_name,st.class_name,SUM(a.status='present') present_count,SUM(a.status='late') late_count,SUM(CASE WHEN cs.session_id IS NOT NULL AND cs.end_time<NOW() THEN 1 ELSE 0 END)-COUNT(a.attendance_id) absent_count,ROUND((COUNT(a.attendance_id)/NULLIF(COUNT(cs.session_id),0))*100) attendance_percent FROM students st CROSS JOIN class_sessions cs LEFT JOIN attendances a ON a.session_id=cs.session_id AND a.student_nim=st.student_nim $where GROUP BY st.student_nim ORDER BY st.student_name";
 $q=$pdo->prepare($sql);$q->execute($params);success($q->fetchAll());
}
$sql="SELECT cs.session_id,cs.course_name,cs.session_code,cs.start_time,cs.end_time,cs.closed_at,SUM(a.status='present') present_count,SUM(a.status='late') late_count,GREATEST(0,(SELECT COUNT(*) FROM students)-COUNT(a.attendance_id)) absent_count,(SELECT COUNT(*) FROM students) student_total FROM class_sessions cs LEFT JOIN attendances a ON a.session_id=cs.session_id WHERE (?='' OR cs.course_name=?) GROUP BY cs.session_id ORDER BY cs.start_time DESC";
$q=$pdo->prepare($sql);$q->execute([$course,$course]);$rows=$q->fetchAll();
foreach($rows as &$r){$r['status']=sessionState($r);$r['present_count']=(int)$r['present_count'];$r['late_count']=(int)$r['late_count'];$r['absent_count']=(int)$r['absent_count'];$r['student_total']=(int)$r['student_total'];$r['attendance_percent']=$r['student_total']?round(($r['present_count']+$r['late_count'])/$r['student_total']*100):0;}
success($rows);
