let allStudents = [];
let formMode = 'create';

const byId = id => document.getElementById(id);
const studentForm = byId('student_form');

async function initStudents() {
  await setupAdminLayout();
  await loadStudents();
}

async function loadStudents() {
  allStudents = await apiRequest('students.php?action=list');
  const classNames = [...new Set(allStudents.map(student => student.class_name))].sort();

  const selected = byId('class_filter').value;
  byId('class_filter').innerHTML = '<option value="">Semua kelas</option>'
    + classNames.map(name => `<option value="${escapeHtml(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
  byId('class_suggestions').innerHTML = classNames.map(name => `<option value="${escapeHtml(name)}">`).join('');
  byId('students_summary').textContent = `${allStudents.length} mahasiswa terdaftar dalam ${classNames.length} kelas. Hanya NIM yang terdaftar yang dapat melakukan absen.`;
  renderStudents();
}

function renderStudents() {
  const keyword = byId('student_search').value.trim().toLowerCase();
  const className = byId('class_filter').value;
  const rows = allStudents.filter(student =>
    (!className || student.class_name === className)
    && (student.student_nim.toLowerCase().includes(keyword) || student.student_name.toLowerCase().includes(keyword)));

  byId('student_count_info').textContent = `Menampilkan ${rows.length} dari ${allStudents.length}`;

  if (!rows.length) {
    byId('student_rows').innerHTML = `<tr><td colspan="5">${allStudents.length
      ? emptyState('magnifying-glass', 'Tidak ada yang cocok', 'Coba kata pencarian atau kelas lain.')
      : emptyState('user-graduate', 'Belum ada mahasiswa', 'Tambahkan mahasiswa agar mereka bisa melakukan absen.')}</td></tr>`;
    return;
  }

  byId('student_rows').innerHTML = rows.map(student => `
    <tr>
      <td>
        <div class="flex items-center gap-3">
          <span class="avatar avatar-sm">${escapeHtml(getInitials(student.student_name))}</span>
          <div class="flex min-w-0 flex-col">
            <b class="truncate">${escapeHtml(student.student_name)}</b>
            <small class="text-xs text-gray-400 tabular-nums md:hidden">${escapeHtml(student.student_nim)} · ${escapeHtml(student.class_name)}</small>
          </div>
        </div>
      </td>
      <td class="hidden font-mono text-gray-300 md:table-cell">${escapeHtml(student.student_nim)}</td>
      <td class="hidden md:table-cell"><span class="chip">${escapeHtml(student.class_name)}</span></td>
      <td class="hidden text-gray-400 md:table-cell">${formatShortDate(student.created_at)}</td>
      <td>
        <div class="flex justify-end gap-1">
          <button type="button" class="icon-button size-9" title="Ubah" aria-label="Ubah ${escapeHtml(student.student_name)}" data-edit="${escapeHtml(student.student_nim)}">${icon('pen')}</button>
          <button type="button" class="icon-button icon-button-danger size-9" title="Hapus" aria-label="Hapus ${escapeHtml(student.student_name)}" data-delete="${escapeHtml(student.student_nim)}">${icon('trash')}</button>
        </div>
      </td>
    </tr>`).join('');
}

byId('student_search').addEventListener('input', renderStudents);
byId('class_filter').addEventListener('change', renderStudents);

byId('student_rows').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  if (editButton) openStudentForm(editButton.dataset.edit);
  if (deleteButton) deleteStudent(deleteButton.dataset.delete);
});

function openStudentForm(studentNim = null) {
  studentForm.reset();
  byId('student_form_error').hidden = true;
  const student = allStudents.find(item => item.student_nim === studentNim);
  formMode = student ? 'update' : 'create';

  byId('student_modal_title').textContent = student ? 'Ubah Data Mahasiswa' : 'Tambah Mahasiswa';
  byId('student_modal_subtitle').textContent = student
    ? 'NIM tidak dapat diubah karena menjadi kunci data absensi.'
    : 'NIM dipakai mahasiswa untuk absen.';
  byId('student_nim').readOnly = Boolean(student);
  if (student) {
    byId('student_nim').value = student.student_nim;
    byId('student_name').value = student.student_name;
    byId('class_name').value = student.class_name;
  } else if (byId('class_filter').value) {
    byId('class_name').value = byId('class_filter').value;
  }
  openModal('student_modal');
}

studentForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formError = byId('student_form_error');
  const saveButton = byId('save_student_button');
  formError.hidden = true;

  const studentNim = byId('student_nim').value.trim();
  const studentName = byId('student_name').value.trim();
  if (!studentNim || !studentName || !byId('class_name').value.trim()) {
    return showFormError(formError, 'NIM, nama, dan kelas wajib diisi.');
  }
  if (!/^[A-Za-z0-9.-]{3,20}$/.test(studentNim)) {
    return showFormError(formError, 'NIM hanya boleh berisi huruf/angka (3–20 karakter).');
  }

  setButtonLoading(saveButton, true, 'Menyimpan…');
  try {
    await apiRequest('students.php?action=' + formMode, new FormData(studentForm));
    closeModal('student_modal');
    showToast(formMode === 'create' ? studentName + ' berhasil ditambahkan.' : 'Data ' + studentName + ' diperbarui.');
    await loadStudents();
  } catch (error) {
    showFormError(formError, error.message);
  }
  setButtonLoading(saveButton, false);
});

async function deleteStudent(studentNim) {
  const student = allStudents.find(item => item.student_nim === studentNim);
  const confirmed = await confirmAction({
    title: 'Hapus mahasiswa?',
    message: `${student.student_name} (${student.student_nim}) akan dihapus beserta seluruh data absensinya.`,
    confirmLabel: 'Hapus',
  });
  if (!confirmed) return;
  try {
    await apiRequest('students.php?action=delete', { student_nim: student.student_nim });
    showToast(student.student_name + ' telah dihapus.');
    await loadStudents();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

byId('add_student_button').addEventListener('click', () => openStudentForm());

initStudents().catch(error => showToast(error.message, 'error'));
