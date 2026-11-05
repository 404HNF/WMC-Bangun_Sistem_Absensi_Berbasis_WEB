let sessions = [];
let fetchedAt = 0;
let knownActivityKeys = null;

async function initDashboard() {
  await setupAdminLayout();
  document.getElementById('greeting').textContent = getGreeting();
  document.getElementById('greeting_name').textContent = CURRENT_USER.full_name;
  document.getElementById('today_label').textContent = formatTodayLong();

  startPolling(loadDashboard, 5000);
  setInterval(updateCountdowns, 1000);
}

async function loadDashboard() {
  const [overview, sessionList] = await Promise.all([
    apiRequest('dashboard.php'),
    apiRequest('sessions.php?action=list'),
  ]);
  sessions = sessionList;
  fetchedAt = performance.now();

  renderSummary(overview, sessionList);
  renderActiveSessions(sessionList.filter(session => session.status === 'active'));
  renderActivity(overview.recent_activity);
  renderChart(sessionList.filter(session => session.status !== 'upcoming').slice(0, 8).reverse());
}

function renderSummary(overview, sessionList) {
  const activeCount = sessionList.filter(session => session.status === 'active').length;
  const upcomingCount = sessionList.filter(session => session.status === 'upcoming').length;
  const closedSessions = sessionList.filter(session => session.status === 'closed');

  document.getElementById('student_count_value').textContent = overview.student_count;
  document.getElementById('student_count_note').textContent = overview.class_count + ' kelas';
  document.getElementById('active_count_value').textContent = activeCount;
  document.getElementById('active_count_note').textContent = upcomingCount ? upcomingCount + ' sesi terjadwal' : 'Tidak ada sesi terjadwal';
  document.getElementById('today_count_value').textContent = overview.present_today + overview.late_today;
  document.getElementById('today_count_note').textContent = overview.present_today + ' hadir · ' + overview.late_today + ' terlambat';

  let attended = 0;
  let expected = 0;
  closedSessions.forEach(session => {
    attended += session.present_count + session.late_count;
    expected += session.student_total;
  });
  document.getElementById('average_value').textContent = expected ? Math.round(attended / expected * 100) + '%' : '–';
  document.getElementById('average_note').textContent = 'dari ' + closedSessions.length + ' sesi selesai';
}

function renderActiveSessions(activeSessions) {
  const container = document.getElementById('active_session_list');
  if (!activeSessions.length) {
    container.innerHTML = emptyState('calendar-plus', 'Belum ada sesi berlangsung',
      'Buat sesi untuk mendapatkan kode absen, lalu tampilkan kodenya di kelas.',
      `<a class="btn btn-primary btn-sm" href="sessions.html?create=1">${icon('plus')}Buat Sesi</a>`);
    return;
  }
  container.innerHTML = activeSessions.map(session => `
    <a class="flex flex-col gap-3 rounded-2xl border-2 border-gray-800 bg-gray-950/40 p-4 transition-all hover:border-blue-300/60" href="session-detail.html?session_id=${session.session_id}">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h3 class="truncate text-lg font-bold">${escapeHtml(session.course_name)}</h3>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            <span>${icon('clock', 'mr-1')}${formatClock(session.start_time)}–${formatClock(session.end_time)} WIB</span>
            <span><b class="text-white">${session.present_count + session.late_count}</b> / ${session.student_total} sudah absen</span>
            <span data-countdown="${session.session_id}"></span>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <small class="text-xs font-bold tracking-wider text-gray-400 uppercase">Kode</small>
          <p class="font-display text-2xl font-extrabold tracking-wider text-blue-300 tabular-nums">${formatSessionCode(session.session_code)}</p>
        </div>
      </div>
      ${stackedBar(session.present_count, session.late_count, session.student_total)}
    </a>`).join('');
  updateCountdowns();
}

function updateCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach(element => {
    const session = sessions.find(item => String(item.session_id) === element.dataset.countdown);
    if (!session) return;
    const phase = getSessionPhase(session, fetchedAt, CURRENT_USER.on_time_minutes);
    if (phase.phase === 'present') element.innerHTML = `Tepat waktu · <b class="text-emerald-300 tabular-nums">${formatCountdown(phase.remaining)}</b> lagi`;
    else if (phase.phase === 'late') element.innerHTML = `Ditutup dalam <b class="text-amber-200 tabular-nums">${formatCountdown(phase.remaining)}</b>`;
    else element.textContent = 'Absen ditutup';
  });
}

function renderActivity(activities) {
  const container = document.getElementById('activity_feed');
  if (!activities.length) {
    container.innerHTML = emptyState('user-check', 'Belum ada absen', 'Kehadiran yang masuk akan tampil di sini.');
    return;
  }
  const keyOf = activity => activity.student_nim + activity.checked_in_at;
  container.innerHTML = activities.map(activity => `
    <div class="flex items-center gap-3 rounded-2xl px-3 py-2.5 ${knownActivityKeys && !knownActivityKeys.has(keyOf(activity)) ? 'animate-flash' : ''}">
      <span class="avatar avatar-sm">${escapeHtml(getInitials(activity.student_name))}</span>
      <div class="flex min-w-0 flex-1 flex-col">
        <b class="truncate text-sm">${escapeHtml(activity.student_name)}</b>
        <small class="truncate text-xs text-gray-400">${escapeHtml(activity.course_name)} · ${formatTimeAgo(activity.seconds_ago)}</small>
      </div>
      ${statusBadge(activity.status)}
    </div>`).join('');
  knownActivityKeys = new Set(activities.map(keyOf));
}

function renderChart(chartSessions) {
  const container = document.getElementById('attendance_chart');
  if (!chartSessions.length) {
    container.innerHTML = '<p class="w-full self-center text-center text-sm text-gray-400">Grafik muncul setelah ada sesi.</p>';
    return;
  }
  container.innerHTML = chartSessions.map(session => {
    const total = session.student_total;
    const present = session.present_count;
    const late = session.late_count;
    const absent = session.status === 'closed' ? Math.max(0, total - present - late) : 0;
    const percent = total ? Math.round((present + late) / total * 100) : 0;
    const height = count => (total ? count / total * 100 : 0) + '%';
    const title = `${session.course_name} · ${formatLongDate(session.start_time)}\n${present} hadir, ${late} terlambat, ${absent} tidak hadir`;
    return `
      <a class="group flex h-full min-w-12 flex-1 flex-col items-center gap-2" href="session-detail.html?session_id=${session.session_id}" title="${escapeHtml(title)}">
        <span class="text-xs font-bold text-gray-300">${percent}%</span>
        <span class="flex w-full max-w-12 flex-1 flex-col-reverse overflow-hidden rounded-xl bg-gray-800/60 transition-opacity group-hover:opacity-80">
          <span class="seg-present" style="height:${height(present)}"></span>
          <span class="seg-late" style="height:${height(late)}"></span>
          <span class="seg-absent" style="height:${height(absent)}"></span>
        </span>
        <span class="flex flex-col items-center text-[11px] leading-tight text-gray-400"><b class="text-gray-200">${escapeHtml(getCourseAbbreviation(session.course_name))}</b>${formatDayMonth(session.start_time)}</span>
      </a>`;
  }).join('');
}

initDashboard().catch(error => showToast(error.message, 'error'));
