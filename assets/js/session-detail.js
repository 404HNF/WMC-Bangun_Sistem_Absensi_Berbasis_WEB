const SESSION_ID = new URLSearchParams(location.search).get('session_id');
let currentSession = null;
let sessionStudents = [];
let serverIp = '';
let fetchedAt = 0;
let attendanceFilter = 'all';
let previouslyCheckedIn = null;
let isReloading = false;
let sessionMissing = false;

const byId = id => document.getElementById(id);

async function initSessionDetail() {
  if (!SESSION_ID) {
    location.href = 'sessions.html';
    return;
  }
  await setupAdminLayout();
  document.querySelectorAll('[data-fill="on_time_minutes"]').forEach(element => { element.textContent = CURRENT_USER.on_time_minutes; });

  await startPolling(loadSession, 5000);
  setInterval(updateTiming, 1000);

  if (new URLSearchParams(location.search).get('created') && currentSession) {
    showToast('Sesi dibuat. Tampilkan kode ' + formatSessionCode(currentSession.session_code) + ' kepada mahasiswa.');
    history.replaceState(null, '', 'session-detail.html?session_id=' + SESSION_ID);
  }
}

async function loadSession(force = false) {
  if (sessionMissing) return;
  if (currentSession && currentSession.status === 'closed' && force !== true) return;

  let data;
  try {
    data = await apiRequest('sessions.php?action=detail&session_id=' + encodeURIComponent(SESSION_ID));
  } catch (error) {
    if (error.status === 404) {
      renderNotFound();
      return;
    }
    throw error;
  }
  currentSession = data.session;
  sessionStudents = data.students;
  serverIp = data.server_ip;
  fetchedAt = performance.now();

  renderSessionInfo();
  fillClassFilter();
  renderAttendanceList();
  updateTiming();
  if (!byId('projector').hidden) fillProjector();
}

function getAttendanceAddress() {
  const url = new URL(APP_BASE);
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (isLocal && serverIp && !serverIp.startsWith('127.') && serverIp.includes('.')) url.hostname = serverIp;
  return (url.host + url.pathname).replace(/\/$/, '');
}

function clockAfter(startText, seconds) {
  const date = new Date(parseServerDate(startText).getTime() + seconds * 1000);
  return padTwo(date.getHours()) + ':' + padTwo(date.getMinutes());
}

function renderSessionInfo() {
  document.title = currentSession.course_name + ' · Absensi UBBG';
  byId('course_title').textContent = currentSession.course_name;
  byId('session_meta').textContent = `${formatLongDate(currentSession.start_time)} · ${formatClock(currentSession.start_time)}–${formatClock(currentSession.end_time)} WIB · dibuat oleh ${currentSession.created_by}`;
  byId('session_badge').innerHTML = statusBadge(currentSession.status);
  byId('big_code').textContent = formatSessionCode(currentSession.session_code);
  byId('attendance_address').textContent = getAttendanceAddress();

  const duration = Number(currentSession.duration_seconds);
  const onTimeLimit = Math.min(CURRENT_USER.on_time_minutes * 60, duration);
  const ratio = duration > 0 ? onTimeLimit / duration : 1;
  byId('present_zone').style.width = (ratio * 100) + '%';
  byId('late_zone').style.left = (ratio * 100) + '%';
  byId('timeline_limit').style.left = (ratio * 100) + '%';
  byId('timeline_start').textContent = 'Mulai ' + formatClock(currentSession.start_time);
  byId('timeline_limit').textContent = 'Batas hadir ' + clockAfter(currentSession.start_time, onTimeLimit);
  byId('timeline_limit').hidden = ratio < 0.25 || ratio > 0.75;
  byId('timeline_end').textContent = 'Tutup ' + formatClock(currentSession.end_time);

  byId('close_session_button').hidden = currentSession.status !== 'active';
  byId('live_badge').hidden = currentSession.status === 'closed';
  byId('refresh_info').textContent = currentSession.status === 'closed'
    ? 'Sesi selesai. Mahasiswa tanpa data absen tercatat tidak hadir.'
    : 'Diperbarui otomatis setiap 5 detik.';
}

function updateTiming() {
  if (!currentSession) return;
  const phase = getSessionPhase(currentSession, fetchedAt, CURRENT_USER.on_time_minutes);
  const progress = Math.min(100, Math.max(0, phase.progress * 100));
  byId('timeline_progress').style.width = progress + '%';
  byId('timeline_marker').style.left = progress + '%';

  let message;
  let projectorMessage;
  if (phase.phase === 'upcoming') {
    message = `${icon('hourglass-half', 'text-violet-300')} Absen dibuka dalam <b class="tabular-nums">${formatCountdown(phase.remaining)}</b>`;
    projectorMessage = `Absen dibuka dalam <b class="tabular-nums">${formatCountdown(phase.remaining)}</b>`;
  } else if (phase.phase === 'present') {
    message = `${icon('circle-check', 'text-emerald-300')} Masih tepat waktu · <b class="tabular-nums">${formatCountdown(phase.remaining)}</b> lagi`;
    projectorMessage = `Tepat waktu: <b class="tabular-nums">${formatCountdown(phase.remaining)}</b> lagi`;
  } else if (phase.phase === 'late') {
    message = `${icon('circle-exclamation', 'text-amber-300')} Lewat batas hadir · ditutup dalam <b class="tabular-nums">${formatCountdown(phase.remaining)}</b>`;
    projectorMessage = `Ditutup dalam <b class="tabular-nums">${formatCountdown(phase.remaining)}</b>`;
  } else {
    message = `${icon('lock', 'text-gray-400')} Absen sudah ditutup pukul ${formatClock(currentSession.end_time)} WIB`;
    projectorMessage = 'Absen sudah ditutup';
  }
  byId('countdown').innerHTML = message;
  byId('projector_time').innerHTML = projectorMessage;

  const expectedStatus = phase.phase === 'upcoming' ? 'upcoming' : (phase.phase === 'closed' ? 'closed' : 'active');
  if (expectedStatus !== currentSession.status && !isReloading) {
    isReloading = true;
    setTimeout(() => loadSession(true).catch(() => null).finally(() => { isReloading = false; }), 1200);
  }
}

function fillClassFilter() {
  const select = byId('class_filter');
  const selected = select.value;
  const classNames = [...new Set(sessionStudents.map(student => student.class_name))].sort();
  select.innerHTML = '<option value="">Semua kelas</option>'
    + classNames.map(name => `<option value="${escapeHtml(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
}

function renderAttendanceList() {
  const className = byId('class_filter').value;
  const keyword = byId('student_search').value.trim().toLowerCase();
  const inClass = sessionStudents.filter(student => !className || student.class_name === className);

  const presentCount = inClass.filter(student => student.status === 'present').length;
  const lateCount = inClass.filter(student => student.status === 'late').length;
  const remainingCount = inClass.length - presentCount - lateCount;
  const percent = inClass.length ? Math.round((presentCount + lateCount) / inClass.length * 100) : 0;
  const remainingLabel = currentSession.status === 'closed' ? 'Tidak hadir' : 'Belum absen';

  byId('present_value').textContent = presentCount;
  byId('late_value').textContent = lateCount;
  byId('remaining_value').textContent = remainingCount;
  byId('remaining_label').textContent = remainingLabel;
  byId('filter_remaining_label').textContent = remainingLabel;
  byId('remaining_note').textContent = { closed: 'tanpa data absen', active: 'masih bisa absen', upcoming: 'sesi belum dimulai' }[currentSession.status];
  byId('attendance_ring').innerHTML = progressRing(percent, 48, 6);
  byId('attended_value').textContent = presentCount + lateCount;
  byId('student_total_value').textContent = inClass.length;
  byId('filter_all_count').textContent = inClass.length;
  byId('filter_present_count').textContent = presentCount;
  byId('filter_late_count').textContent = lateCount;
  byId('filter_remaining_count').textContent = remainingCount;

  const ipCounts = {};
  sessionStudents.forEach(student => {
    if (student.client_ip) ipCounts[student.client_ip] = (ipCounts[student.client_ip] || 0) + 1;
  });

  const rows = inClass
    .filter(student => attendanceFilter === 'all'
      || (attendanceFilter === 'remaining' ? (student.status === 'pending' || student.status === 'absent') : student.status === attendanceFilter))
    .filter(student => student.student_nim.toLowerCase().includes(keyword) || student.student_name.toLowerCase().includes(keyword));

  if (!rows.length) {
    byId('attendance_rows').innerHTML = `<tr><td colspan="7">${emptyState('users', 'Tidak ada data',
      sessionStudents.length ? 'Tidak ada mahasiswa yang cocok dengan filter.' : 'Belum ada mahasiswa terdaftar.')}</td></tr>`;
  } else {
    byId('attendance_rows').innerHTML = rows.map((student, index) => {
      const time = student.checked_in_at ? student.checked_in_at.slice(11) : '–';
      const sharedIp = student.client_ip && ipCounts[student.client_ip] > 1
        ? `<span class="ip-flag" title="Alamat IP ini dipakai ${ipCounts[student.client_ip]} NIM pada sesi ini">IP ×${ipCounts[student.client_ip]}</span>` : '';
      const isNew = previouslyCheckedIn && student.checked_in_at && !previouslyCheckedIn.has(student.student_nim);
      return `
        <tr class="${isNew ? 'animate-flash' : ''}">
          <td class="hidden text-gray-500 tabular-nums md:table-cell">${index + 1}</td>
          <td>
            <div class="flex items-center gap-3">
              <span class="avatar avatar-sm">${escapeHtml(getInitials(student.student_name))}</span>
              <div class="flex min-w-0 flex-col">
                <b class="truncate">${escapeHtml(student.student_name)}</b>
                <small class="text-xs text-gray-400 tabular-nums">${escapeHtml(student.student_nim)}<span class="md:hidden"> · ${escapeHtml(student.class_name)}${student.checked_in_at ? ' · ' + time : ''}</span></small>
                ${sharedIp ? `<span class="lg:hidden">${sharedIp.replace('ip-flag', 'ip-flag ml-0')}</span>` : ''}
              </div>
            </div>
          </td>
          <td class="hidden md:table-cell"><span class="chip">${escapeHtml(student.class_name)}</span></td>
          <td class="hidden tabular-nums md:table-cell">${time}</td>
          <td>${statusBadge(student.status)}</td>
          <td class="hidden lg:table-cell"><span class="font-mono text-xs text-gray-400">${escapeHtml(student.client_ip || '–')}</span>${sharedIp}</td>
          <td class="text-right">${student.checked_in_at ? `<button type="button" class="icon-button icon-button-danger size-9" data-delete-attendance="${escapeHtml(student.student_nim)}"
              title="Hapus absen" aria-label="Hapus absen ${escapeHtml(student.student_name)}">${icon('user-xmark')}</button>` : ''}</td>
        </tr>`;
    }).join('');
  }
  previouslyCheckedIn = new Set(sessionStudents.filter(student => student.checked_in_at).map(student => student.student_nim));
}

function renderNotFound() {
  sessionMissing = true;
  currentSession = null;
  byId('course_title').textContent = 'Sesi tidak ditemukan';
  byId('session_meta').textContent = 'Sesi mungkin sudah dihapus.';
  byId('header_actions').hidden = true;
  [...byId('session_main').children].slice(1).forEach(section => section.remove());
  const notice = document.createElement('section');
  notice.className = 'card';
  notice.innerHTML = emptyState('calendar-xmark', 'Sesi tidak ditemukan', 'Sesi ini tidak ada atau sudah dihapus.',
    `<a class="btn btn-primary btn-sm" href="sessions.html">${icon('arrow-left')}Kembali ke daftar sesi</a>`);
  byId('session_main').appendChild(notice);
}

setupToggleGroup(byId('attendance_filter'), value => {
  attendanceFilter = value;
  renderAttendanceList();
});
byId('class_filter').addEventListener('change', renderAttendanceList);
byId('student_search').addEventListener('input', renderAttendanceList);

byId('attendance_rows').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-attendance]');
  if (!button) return;
  const student = sessionStudents.find(item => item.student_nim === button.dataset.deleteAttendance);
  const stillRunning = currentSession.status === 'active';

  const confirmed = await confirmAction({
    title: 'Hapus absen mahasiswa ini?',
    message: `Absen ${student.student_name} (${student.student_nim}) pukul ${student.checked_in_at.slice(11, 16)} akan dihapus dan tercatat `
      + (stillRunning ? 'belum absen. Selama sesi masih berlangsung, NIM ini masih bisa absen lagi.' : 'tidak hadir.'),
    confirmLabel: 'Hapus absen',
  });
  if (!confirmed) return;

  try {
    await apiRequest('sessions.php?action=delete_attendance', { session_id: SESSION_ID, student_nim: student.student_nim });
    showToast('Absen ' + student.student_name + ' dihapus.');
    await loadSession(true);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

byId('copy_button').addEventListener('click', async () => {
  if (!currentSession) return;
  await copyToClipboard(currentSession.session_code);
  showToast('Kode ' + formatSessionCode(currentSession.session_code) + ' disalin.');
});

byId('csv_button').addEventListener('click', () => {
  downloadFromApi('sessions.php?action=detail&session_id=' + encodeURIComponent(SESSION_ID) + '&format=csv');
});

byId('close_session_button').addEventListener('click', async () => {
  const confirmed = await confirmAction({
    title: 'Tutup absen sekarang?',
    message: 'Mahasiswa tidak bisa absen lagi pada sesi ini. Yang belum absen akan tercatat tidak hadir.',
    confirmLabel: 'Tutup absen',
  });
  if (!confirmed) return;
  try {
    await apiRequest('sessions.php?action=close', { session_id: SESSION_ID });
    showToast('Absen ditutup.');
    await loadSession(true);
  } catch (error) {
    showToast(error.message, 'error');
  }
});

byId('delete_session_button').addEventListener('click', async () => {
  const confirmed = await confirmAction({
    title: 'Hapus sesi ini?',
    message: `Sesi "${currentSession.course_name}" beserta semua data absensinya akan dihapus permanen.`,
    confirmLabel: 'Hapus sesi',
  });
  if (!confirmed) return;
  try {
    await apiRequest('sessions.php?action=delete', { session_id: SESSION_ID });
    location.href = 'sessions.html';
  } catch (error) {
    showToast(error.message, 'error');
  }
});

function fillProjector() {
  byId('projector_course').textContent = currentSession.course_name;
  byId('projector_address').textContent = getAttendanceAddress();
  byId('projector_code').textContent = formatSessionCode(currentSession.session_code);
  byId('projector_count').textContent = sessionStudents.filter(student => student.checked_in_at).length;
}

function openProjector() {
  if (!currentSession) return;
  fillProjector();
  updateTiming();
  byId('projector').hidden = false;
  if (byId('projector').requestFullscreen) byId('projector').requestFullscreen().catch(() => null);
}

function closeProjector() {
  byId('projector').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
}

byId('projector_button').addEventListener('click', openProjector);
byId('close_projector_button').addEventListener('click', closeProjector);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !byId('projector').hidden) closeProjector();
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && !byId('projector').hidden) byId('projector').hidden = true;
});

initSessionDetail().catch(error => showToast(error.message, 'error'));
