let recapView = 'students';

const byId = id => document.getElementById(id);

async function initRecap() {
  await setupAdminLayout();
  const filters = await apiRequest('recap.php?action=filters');
  byId('course_filter').innerHTML += filters.courses.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  byId('class_filter').innerHTML += filters.classes.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  await loadRecap();
}

function filterQuery() {
  return 'course_name=' + encodeURIComponent(byId('course_filter').value) + '&class_name=' + encodeURIComponent(byId('class_filter').value);
}

async function loadRecap() {
  byId('recap_rows').innerHTML = '<tr><td colspan="7"><div class="skeleton h-10"></div></td></tr>';
  try {
    const [perSession, perStudent] = await Promise.all([
      apiRequest('recap.php?action=sessions&' + filterQuery()),
      recapView === 'students' ? apiRequest('recap.php?action=students&' + filterQuery()) : null,
    ]);
    renderSummary(perSession);
    if (recapView === 'students') renderPerStudent(perStudent);
    else renderPerSession(perSession);
  } catch (error) {
    showToast(error.message, 'error');
    byId('recap_rows').innerHTML = `<tr><td colspan="7">${emptyState('circle-exclamation', 'Gagal memuat rekap', escapeHtml(error.message))}</td></tr>`;
  }
}

function renderSummary(perSession) {
  const closedSessions = perSession.filter(session => session.status === 'closed');
  const runningCount = perSession.length - closedSessions.length;
  let attended = 0;
  let expected = 0;
  let lateTotal = 0;
  let absentTotal = 0;
  closedSessions.forEach(session => {
    attended += session.present_count + session.late_count;
    expected += session.student_total;
  });
  perSession.forEach(session => {
    lateTotal += session.late_count;
    absentTotal += session.absent_count;
  });

  byId('counted_sessions').innerHTML = closedSessions.length + (runningCount ? ` <small class="text-xs font-semibold text-blue-200">+${runningCount} berlangsung</small>` : '');
  byId('average_attendance').textContent = expected ? Math.round(attended / expected * 100) + '%' : '–';
  byId('total_late').textContent = lateTotal;
  byId('total_absent').textContent = absentTotal;
}

function emptyRow(message) {
  return `<tr><td colspan="7">${emptyState('chart-column', 'Belum ada data', message)}</td></tr>`;
}

function renderPerStudent(rows) {
  byId('recap_head').innerHTML = `<tr>
    <th class="hidden md:table-cell">No</th><th>Mahasiswa</th><th class="hidden md:table-cell">Kelas</th>
    <th class="hidden text-right md:table-cell">Hadir</th><th class="hidden text-right md:table-cell">Terlambat</th>
    <th class="hidden text-right md:table-cell">Tidak hadir</th><th>Kehadiran</th></tr>`;
  if (!rows.length) {
    byId('recap_rows').innerHTML = emptyRow('Tidak ada mahasiswa pada filter ini.');
    return;
  }
  byId('recap_rows').innerHTML = rows.map((row, index) => `
    <tr>
      <td class="hidden text-gray-500 tabular-nums md:table-cell">${index + 1}</td>
      <td>
        <div class="flex items-center gap-3">
          <span class="avatar avatar-sm">${escapeHtml(getInitials(row.student_name))}</span>
          <div class="flex min-w-0 flex-col">
            <b class="truncate">${escapeHtml(row.student_name)}</b>
            <small class="text-xs text-gray-400 tabular-nums">${escapeHtml(row.student_nim)}<span class="md:hidden"> · ${escapeHtml(row.class_name)}</span></small>
            <span class="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-400 md:hidden">
              <span>Hadir <b class="text-white">${row.present_count}</b></span>
              <span>Terlambat <b class="text-white">${row.late_count}</b></span>
              <span>Tidak <b class="text-white">${row.absent_count}</b></span>
            </span>
          </div>
        </div>
      </td>
      <td class="hidden md:table-cell"><span class="chip">${escapeHtml(row.class_name)}</span></td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.present_count}</td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.late_count}</td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.absent_count}</td>
      <td>${percentBar(row.attendance_percent)}</td>
    </tr>`).join('');
}

function renderPerSession(rows) {
  byId('recap_head').innerHTML = `<tr>
    <th>Sesi</th><th class="hidden text-right md:table-cell">Hadir</th><th class="hidden text-right md:table-cell">Terlambat</th>
    <th class="hidden text-right md:table-cell">Tidak hadir</th><th class="hidden text-right md:table-cell">Total</th><th>Kehadiran</th></tr>`;
  if (!rows.length) {
    byId('recap_rows').innerHTML = emptyRow('Belum ada sesi yang dimulai pada filter ini.');
    return;
  }
  byId('recap_rows').innerHTML = rows.map(row => `
    <tr class="cursor-pointer" data-session-id="${row.session_id}" title="Buka detail sesi">
      <td>
        <div class="flex flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2"><b>${escapeHtml(row.course_name)}</b>${row.status === 'active' ? statusBadge('active') : ''}</span>
          <small class="text-xs text-gray-400">${formatShortDate(row.start_time)} · ${formatClock(row.start_time)} WIB · kode ${formatSessionCode(row.session_code)}</small>
          <span class="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-400 md:hidden">
            <span>Hadir <b class="text-white">${row.present_count}</b></span>
            <span>Terlambat <b class="text-white">${row.late_count}</b></span>
            <span>Tidak <b class="text-white">${row.absent_count}</b></span>
            <span>dari <b class="text-white">${row.student_total}</b></span>
          </span>
        </div>
      </td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.present_count}</td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.late_count}</td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.absent_count}</td>
      <td class="hidden text-right tabular-nums md:table-cell">${row.student_total}</td>
      <td>${percentBar(row.attendance_percent)}</td>
    </tr>`).join('');
}

byId('recap_rows').addEventListener('click', event => {
  const row = event.target.closest('tr[data-session-id]');
  if (row) location.href = 'session-detail.html?session_id=' + row.dataset.sessionId;
});

setupToggleGroup(byId('recap_view'), value => {
  recapView = value;
  loadRecap();
});
byId('course_filter').addEventListener('change', loadRecap);
byId('class_filter').addEventListener('change', loadRecap);
byId('csv_button').addEventListener('click', () => downloadFromApi(`recap.php?action=${recapView}&${filterQuery()}&format=csv`));

initRecap().catch(error => showToast(error.message, 'error'));
