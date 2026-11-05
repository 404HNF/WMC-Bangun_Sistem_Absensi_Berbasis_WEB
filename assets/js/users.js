let allUsers = [];
let currentUserId = null;
let formMode = 'create';

const byId = id => document.getElementById(id);
const userForm = byId('user_form');

async function initUsers() {
  await setupAdminLayout();
  await loadUsers();
}

async function loadUsers() {
  const data = await apiRequest('users.php?action=list');
  allUsers = data.users;
  currentUserId = data.current_user_id;

  byId('user_rows').innerHTML = allUsers.map(user => {
    const isMe = user.user_id === currentUserId;
    return `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <span class="avatar avatar-sm ${isMe ? 'avatar-me' : ''}">${escapeHtml(getInitials(user.full_name))}</span>
            <div class="flex min-w-0 flex-col">
              <b class="truncate">${escapeHtml(user.full_name)}${isMe ? ' <span class="ml-1 rounded-full bg-blue-300 px-2 py-0.5 text-[11px] text-gray-950">Anda</span>' : ''}</b>
              <small class="text-xs text-gray-400 md:hidden">@${escapeHtml(user.username)} · ${user.session_count} sesi</small>
            </div>
          </div>
        </td>
        <td class="hidden font-mono text-gray-300 md:table-cell">@${escapeHtml(user.username)}</td>
        <td class="hidden text-right tabular-nums md:table-cell">${user.session_count}</td>
        <td>
          <div class="flex justify-end gap-1">
            <button type="button" class="icon-button size-9" title="Ubah" aria-label="Ubah ${escapeHtml(user.full_name)}" data-edit="${user.user_id}">${icon('pen')}</button>
            ${isMe ? '' : `<button type="button" class="icon-button icon-button-danger size-9" title="Hapus" aria-label="Hapus ${escapeHtml(user.full_name)}" data-delete="${user.user_id}">${icon('trash')}</button>`}
          </div>
        </td>
      </tr>`;
  }).join('');
}

byId('user_rows').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit]');
  const deleteButton = event.target.closest('[data-delete]');
  if (editButton) openUserForm(Number(editButton.dataset.edit));
  if (deleteButton) deleteUser(Number(deleteButton.dataset.delete));
});

function setPasswordVisible(isVisible) {
  byId('password').type = isVisible ? 'text' : 'password';
  byId('toggle_password').innerHTML = icon(isVisible ? 'eye-slash' : 'eye');
  byId('toggle_password').setAttribute('aria-label', isVisible ? 'Sembunyikan password' : 'Tampilkan password');
}

function openUserForm(userId = null) {
  userForm.reset();
  byId('user_form_error').hidden = true;
  setPasswordVisible(false);
  const user = allUsers.find(item => item.user_id === userId);
  formMode = user ? 'update' : 'create';

  byId('user_modal_title').textContent = user ? 'Ubah Pengguna' : 'Tambah Pengguna';
  byId('password_hint').textContent = user ? 'kosongkan jika tidak diganti' : 'minimal 6 karakter';
  byId('user_id').value = user ? user.user_id : '';
  if (user) {
    byId('full_name').value = user.full_name;
    byId('username').value = user.username;
  }
  openModal('user_modal');
}

byId('toggle_password').addEventListener('click', () => setPasswordVisible(byId('password').type === 'password'));

userForm.addEventListener('submit', async event => {
  event.preventDefault();
  const formError = byId('user_form_error');
  const saveButton = byId('save_user_button');
  formError.hidden = true;

  const password = byId('password').value;
  if (!byId('full_name').value.trim() || !byId('username').value.trim()) return showFormError(formError, 'Nama dan username wajib diisi.');
  if (formMode === 'create' && !password) return showFormError(formError, 'Password wajib diisi.');
  if (password && password.length < 6) return showFormError(formError, 'Password minimal 6 karakter.');

  setButtonLoading(saveButton, true, 'Menyimpan…');
  try {
    await apiRequest('users.php?action=' + formMode, new FormData(userForm));
    closeModal('user_modal');
    showToast(formMode === 'create' ? 'Akun berhasil ditambahkan.' : 'Akun berhasil diperbarui.');
    await loadUsers();
    if (Number(byId('user_id').value) === currentUserId) fillUserChip(await apiRequest('auth.php?action=check'));
  } catch (error) {
    showFormError(formError, error.message);
  }
  setButtonLoading(saveButton, false);
});

async function deleteUser(userId) {
  const user = allUsers.find(item => item.user_id === userId);
  const confirmed = await confirmAction({
    title: 'Hapus akun?',
    message: `Akun ${user.full_name} (@${user.username}) akan dihapus dan tidak bisa login lagi.`,
    confirmLabel: 'Hapus akun',
  });
  if (!confirmed) return;
  try {
    await apiRequest('users.php?action=delete', { user_id: user.user_id });
    showToast('Akun ' + user.full_name + ' dihapus.');
    await loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

byId('add_user_button').addEventListener('click', () => openUserForm());

initUsers().catch(error => showToast(error.message, 'error'));
