const attendanceForm = document.getElementById('attendance_form');
const nimInput = document.getElementById('student_nim');
const codeInput = document.getElementById('session_code');
const rememberCheckbox = document.getElementById('remember_nim');
const submitButton = document.getElementById('submit_button');
const attendanceError = document.getElementById('attendance_error');
const nimError = document.getElementById('student_nim_error');
const codeError = document.getElementById('session_code_error');
const NIM_STORAGE_KEY = 'attendance_nim';

let serverSeconds = null;
let serverFetchedAt = 0;

try {
  const savedNim = localStorage.getItem(NIM_STORAGE_KEY);
  if (savedNim) nimInput.value = savedNim;
} catch (error) {
  rememberCheckbox.checked = false;
}

const codeFromUrl = new URLSearchParams(location.search).get('code');
if (codeFromUrl) codeInput.value = codeFromUrl.replace(/\D/g, '').slice(0, 6);

function setFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
  setFieldError(codeInput, codeError, '');
});
nimInput.addEventListener('input', () => setFieldError(nimInput, nimError, ''));

async function loadServerInfo() {
  const pill = document.getElementById('session_status');
  const pillText = document.getElementById('session_status_text');
  try {
    const info = await apiRequest('attendance.php?action=info');
    pill.dataset.state = info.active_sessions > 0 ? 'active' : 'idle';
    pillText.textContent = info.active_sessions > 0
      ? info.active_sessions + ' sesi sedang berlangsung'
      : 'Belum ada sesi berlangsung';

    const [hours, minutes, seconds] = info.server_time.split(':').map(Number);
    serverSeconds = hours * 3600 + minutes * 60 + seconds;
    serverFetchedAt = Date.now();
    renderServerClock();

    document.querySelectorAll('[data-fill="on_time_minutes"]').forEach(element => { element.textContent = info.on_time_minutes; });
    document.querySelectorAll('[data-fill="default_duration"]').forEach(element => { element.textContent = info.default_duration; });
  } catch (error) {
    pill.dataset.state = 'error';
    pillText.textContent = 'Server tidak terjangkau';
  }
}

function renderServerClock() {
  if (serverSeconds === null) return;
  const seconds = Math.floor(serverSeconds + (Date.now() - serverFetchedAt) / 1000) % 86400;
  document.getElementById('server_clock').textContent =
    padTwo(Math.floor(seconds / 3600)) + ':' + padTwo(Math.floor(seconds % 3600 / 60)) + ':' + padTwo(seconds % 60);
}

loadServerInfo();
setInterval(loadServerInfo, 20000);
setInterval(renderServerClock, 1000);

function validateForm() {
  let isValid = true;
  const nim = nimInput.value.trim();
  const code = codeInput.value.trim();

  if (nim === '') {
    setFieldError(nimInput, nimError, 'NIM wajib diisi.');
    isValid = false;
  } else if (!/^[A-Za-z0-9.-]{3,20}$/.test(nim)) {
    setFieldError(nimInput, nimError, 'NIM hanya berisi huruf/angka (3–20 karakter).');
    isValid = false;
  }
  if (!/^\d{6}$/.test(code)) {
    setFieldError(codeInput, codeError, 'Kode sesi harus 6 digit angka.');
    isValid = false;
  }
  return isValid;
}

attendanceForm.addEventListener('submit', async event => {
  event.preventDefault();
  attendanceError.hidden = true;
  if (!validateForm()) return;

  setButtonLoading(submitButton, true, 'Mengirim…');
  try {
    const result = await apiRequest('attendance.php?action=submit', {
      student_nim: nimInput.value.trim(),
      session_code: codeInput.value.trim(),
    });
    try {
      if (rememberCheckbox.checked) localStorage.setItem(NIM_STORAGE_KEY, result.student_nim);
      else localStorage.removeItem(NIM_STORAGE_KEY);
    } catch (error) {
      rememberCheckbox.checked = false;
    }
    setButtonLoading(submitButton, false);
    showResult(result);
    loadServerInfo();
  } catch (error) {
    attendanceError.innerHTML = icon(error.isNetworkError ? 'wifi' : 'circle-exclamation', 'mt-0.5') + `<span>${escapeHtml(error.message)}</span>`;
    attendanceError.hidden = false;
    setButtonLoading(submitButton, false);
    if (error.isNetworkError) submitButton.querySelector('span').textContent = 'Kirim Ulang';
  }
});

function showResult(result) {
  const isLate = result.status === 'late';
  const resultIcon = document.getElementById('result_icon');
  resultIcon.className = 'grid size-16 place-items-center rounded-full text-3xl md:size-24 md:text-5xl '
    + (isLate ? 'bg-amber-300/15 text-amber-300' : 'bg-blue-300/15 text-blue-300');
  resultIcon.innerHTML = icon(isLate ? 'clock' : 'circle-check');
  document.getElementById('result_title').textContent = isLate ? 'Absen Diterima (Terlambat)' : 'Absen Berhasil';
  document.getElementById('result_name').textContent = result.student_name;
  document.getElementById('result_identity').innerHTML = `<span>${escapeHtml(result.student_nim)}</span>`
    + '<span class="size-1 shrink-0 rounded-full bg-blue-200"></span>'
    + `<span>${escapeHtml(result.class_name)}</span>`;
  document.getElementById('result_course').textContent = result.course_name;
  document.getElementById('result_time').textContent = result.checked_in_time + ' WIB';
  document.getElementById('result_minute').textContent = 'menit ke-' + result.minute_number + ' sejak sesi dimulai';
  document.getElementById('result_status').innerHTML = statusBadge(result.status);

  renderMySummary(result);
  renderClassmates(result);
  selectResultTab(document.getElementById('my_attendance_tab'), false);
  openModal('result_modal');
  document.getElementById('done_button').focus({ preventScroll: true });
}

function renderMySummary(result) {
  const summary = result.summary;
  const attended = summary.present + summary.late;
  const percent = summary.meetings ? Math.round(attended / summary.meetings * 100) : 0;

  document.getElementById('summary_course').textContent = result.course_name;
  document.getElementById('summary_attended').textContent = attended;
  document.getElementById('summary_meetings').textContent = summary.meetings;
  document.getElementById('summary_present').textContent = summary.present;
  document.getElementById('summary_late').textContent = summary.late;
  document.getElementById('summary_absent').textContent = summary.absent;
  document.getElementById('summary_ring').innerHTML = progressRing(percent, 68, 8);

  document.getElementById('summary_history').innerHTML = summary.history.map(meeting => {
    const date = parseServerDate(meeting.date);
    const title = formatLongDate(meeting.date) + ' · ' + ATTENDANCE_LABELS[meeting.status] + (meeting.is_current ? ' (sesi ini)' : '');
    return `<span class="history-chip history-${meeting.status}${meeting.is_current ? ' history-current' : ''}" title="${escapeHtml(title)}">${date.getDate()}/${date.getMonth() + 1}</span>`;
  }).join('');
}

function renderClassmates(result) {
  document.getElementById('classmate_count').textContent = result.classmates.length;
  document.getElementById('classmates_note').textContent =
    `Kelas ${result.class_name} · ${result.classmates.length} mahasiswa terdaftar. Status absen anggota lain tidak ditampilkan.`;
  document.getElementById('classmate_list').innerHTML = result.classmates.map(classmate => `
    <li class="flex items-center gap-3 rounded-2xl px-3 py-2 ${classmate.is_me ? 'bg-blue-300/10' : ''}">
      <span class="avatar avatar-sm ${classmate.is_me ? 'avatar-me' : ''}">${escapeHtml(getInitials(classmate.student_name))}</span>
      <div class="flex min-w-0 flex-col">
        <b class="truncate text-sm">${escapeHtml(classmate.student_name)}${classmate.is_me ? ' <span class="ml-1 rounded-full bg-blue-300 px-2 py-0.5 text-[11px] text-gray-950">Anda</span>' : ''}</b>
        <small class="text-xs text-gray-400 tabular-nums">${escapeHtml(classmate.student_nim)}</small>
      </div>
    </li>`).join('');
}

const selectResultTab = setupTabs(document.getElementById('result_tabs'));

function resetForNextCheckIn() {
  codeInput.value = '';
  submitButton.querySelector('span').textContent = 'Kirim Absen';
}

document.getElementById('done_button').addEventListener('click', () => closeModal('result_modal'));
document.getElementById('result_modal').addEventListener('modalclose', resetForNextCheckIn);
