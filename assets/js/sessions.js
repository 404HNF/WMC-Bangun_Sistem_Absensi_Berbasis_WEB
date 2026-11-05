let allSessions = [];
let statusFilter = 'all';
let startMode = 'now';

const sessionForm = document.getElementById('session_form');
const startTimeInput = document.getElementById('start_time');
const durationInput = document.getElementById('duration');
const STATUS_ORDER = { active: 0, upcoming: 1, closed: 2 };

async function initSessions() {
  await setupAdminLayout();
  await startPolling(loadSessions, 10000);
  if (new URLSearchParams(location.search).get('create')) openSessionForm();
}

async function loadSessions() {
  allSessions = await apiRequest('sessions.php?action=list');
  renderSessions();
}

function renderSessions() {
  const countBy = status => allSessions.filter(session => status === 'all' || session.status === status).length;
  document.getElementById('count_all').textContent = countBy('all');
  document.getElementById('count_active').textContent = countBy('active');
  document.getElementById('count_upcoming').textContent = countBy('upcoming');
  document.getElementById('count_closed').textContent = countBy('closed');

  const keyword = document.getElementById('session_search').value.trim().toLowerCase();
  const visibleSessions = allSessions
    .filter(session => statusFilter === 'all' || session.status === statusFilter)
    .filter(session => session.course_name.toLowerCase().includes(keyword) || session.session_code.includes(keyword))
    .sort((first, second) => STATUS_ORDER[first.status] - STATUS_ORDER[second.status]);

  const container = document.getElementById('session_list');
  if (!allSessions.length) {
    container.innerHTML = `<div class="col-span-full">${emptyState('calendar-plus', 'Belum ada sesi',
      'Buat sesi pertama untuk mendapatkan kode absen 6 digit.',
      `<button type="button" class="btn btn-primary btn-sm" data-open-session-form>${icon('plus')}Buat Sesi</button>`)}</div>`;
    return;
  }
  if (!visibleSessions.length) {
    container.innerHTML = `<div class="col-span-full">${emptyState('magnifying-glass', 'Tidak ada sesi yang cocok', 'Coba ubah filter atau kata pencarian.')}</div>`;
    return;
  }
  container.innerHTML = visibleSessions.map(renderSessionCard).join('');
}

function renderSessionCard(session) {
  const percent = session.student_total ? Math.round((session.present_count + session.late_count) / session.student_total * 100) : 0;
  const activeBorder = session.status === 'active' ? 'border-blue-300/60' : 'border-gray-800';
  return `
    <a class="flex flex-col gap-4 rounded-2xl border-2 ${activeBorder} bg-gray-950/40 p-5 transition-all hover:-translate-y-1 hover:border-blue-300/60" href="session-detail.html?session_id=${session.session_id}">
      <div class="flex items-center justify-between gap-3">
        ${statusBadge(session.status)}
        <span class="text-xs font-semibold text-gray-400">${formatShortDate(session.start_time)}</span>
      </div>
      <div class="min-w-0">
        <h3 class="truncate text-lg font-bold">${escapeHtml(session.course_name)}</h3>
        <p class="truncate text-sm text-gray-400">${formatClock(session.start_time)}–${formatClock(session.end_time)} WIB · oleh ${escapeHtml(session.created_by)}</p>
      </div>
      <div class="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3">
        <small class="text-xs font-bold tracking-wider text-gray-400 uppercase">Kode sesi</small>
        <b class="font-display text-2xl font-extrabold tracking-wider text-blue-300 tabular-nums">${formatSessionCode(session.session_code)}</b>
      </div>
      <div class="flex flex-col gap-2">
        ${stackedBar(session.present_count, session.late_count, session.student_total, session.status === 'closed')}
        <div class="flex justify-between gap-3 text-xs text-gray-400">
          <span><b class="text-white">${session.present_count}</b> hadir · <b class="text-white">${session.late_count}</b> terlambat</span>
          <span><b class="text-white">${percent}%</b> dari ${session.student_total}</span>
        </div>
      </div>
    </a>`;
}

setupToggleGroup(document.getElementById('status_filter'), value => {
  statusFilter = value;
  renderSessions();
});
document.getElementById('session_search').addEventListener('input', renderSessions);
document.getElementById('session_list').addEventListener('click', event => {
  if (event.target.closest('[data-open-session-form]')) openSessionForm();
});

function openSessionForm() {
  sessionForm.reset();
  durationInput.value = CURRENT_USER.default_duration;
  startTimeInput.value = '';
  setStartMode('now');

  const courseNames = [...new Set(allSessions.map(session => session.course_name))];
  document.getElementById('course_suggestions').innerHTML = courseNames.map(name => `<option value="${escapeHtml(name)}">`).join('');
  document.getElementById('session_form_error').hidden = true;
  openModal('session_modal');
}

function setStartMode(mode) {
  startMode = mode;
  const isScheduled = mode === 'scheduled';
  document.querySelectorAll('#start_mode button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.value === mode)));
  startTimeInput.hidden = !isScheduled;
  startTimeInput.disabled = !isScheduled;

  if (isScheduled && !startTimeInput.value) {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    startTimeInput.value = toDatetimeLocal(nextHour);
  }
  document.getElementById('start_help').textContent = isScheduled
    ? 'Mahasiswa baru bisa absen ketika waktu mulai tiba.'
    : 'Memakai jam server saat tombol ditekan.';
  updateRulePreview();
}

function toDatetimeLocal(date) {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}T${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

function updateRulePreview() {
  const duration = Math.max(0, Number(durationInput.value) || 0);
  const onTimeLimit = Math.min(CURRENT_USER.on_time_minutes, duration);
  document.querySelectorAll('#duration_chips button').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.minutes) === duration)));

  const startsAt = (startMode === 'scheduled' && startTimeInput.value) ? new Date(startTimeInput.value) : new Date();
  const clockAt = minutes => {
    const date = new Date(startsAt.getTime() + minutes * 60000);
    return padTwo(date.getHours()) + ':' + padTwo(date.getMinutes());
  };

  document.getElementById('rule_preview').innerHTML = `
    <div class="flex flex-wrap items-center gap-2">${statusBadge('present')} menit <b class="text-white">0–${onTimeLimit}</b> <span class="text-gray-500">(${clockAt(0)}–${clockAt(onTimeLimit)})</span></div>
    ${duration > onTimeLimit ? `<div class="flex flex-wrap items-center gap-2">${statusBadge('late')} menit <b class="text-white">${onTimeLimit}–${duration}</b> <span class="text-gray-500">(${clockAt(onTimeLimit)}–${clockAt(duration)})</span></div>` : ''}
    <div class="flex flex-wrap items-center gap-2">${statusBadge('absent')} ditolak setelah menit <b class="text-white">${duration}</b> <span class="text-gray-500">(${clockAt(duration)})</span></div>`;
}

document.getElementById('create_session_button').addEventListener('click', openSessionForm);
document.querySelectorAll('#start_mode button').forEach(button => button.addEventListener('click', () => setStartMode(button.dataset.value)));
document.querySelectorAll('#duration_chips button').forEach(button => button.addEventListener('click', () => {
  durationInput.value = button.dataset.minutes;
  updateRulePreview();
}));
durationInput.addEventListener('input', updateRulePreview);
startTimeInput.addEventListener('input', updateRulePreview);

sessionForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formError = document.getElementById('session_form_error');
  const saveButton = document.getElementById('save_session_button');
  formError.hidden = true;

  const duration = Number(durationInput.value);
  if (!sessionForm.course_name.value.trim()) return showFormError(formError, 'Nama mata kuliah wajib diisi.');
  if (!(duration >= 1 && duration <= 300)) return showFormError(formError, 'Batas waktu absen harus 1–300 menit.');
  if (startMode === 'scheduled' && !startTimeInput.value) return showFormError(formError, 'Isi tanggal dan jam mulai sesi.');

  setButtonLoading(saveButton, true, 'Membuat sesi…');
  try {
    const created = await apiRequest('sessions.php?action=create', new FormData(sessionForm));
    location.href = 'session-detail.html?session_id=' + created.session_id + '&created=1';
  } catch (error) {
    showFormError(formError, error.message);
    setButtonLoading(saveButton, false);
  }
});

initSessions().catch(error => showToast(error.message, 'error'));
