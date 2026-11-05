const loginForm = document.getElementById('login_form');
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('toggle_password');

apiRequest('auth.php?action=check')
  .then(() => { location.href = 'index.html'; })
  .catch(() => null);

togglePasswordButton.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordButton.innerHTML = icon(isHidden ? 'eye-slash' : 'eye');
  togglePasswordButton.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const loginError = document.getElementById('login_error');
  const loginButton = document.getElementById('login_button');
  loginError.hidden = true;

  if (!loginForm.username.value.trim() || !loginForm.password.value) {
    showFormError(loginError, 'Username dan password wajib diisi.');
    return;
  }

  setButtonLoading(loginButton, true, 'Memeriksa…');
  try {
    await apiRequest('auth.php?action=login', new FormData(loginForm));
    location.href = 'index.html';
  } catch (error) {
    showFormError(loginError, error.message);
    setButtonLoading(loginButton, false);
  }
});
