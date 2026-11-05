const APP_BASE = document.currentScript.src.replace(/assets\/js\/app\.js.*$/, '');

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ATTENDANCE_LABELS = { present: 'Hadir', late: 'Terlambat', absent: 'Tidak hadir', pending: 'Belum absen' };
const SESSION_LABELS = { active: 'Berlangsung', upcoming: 'Terjadwal', closed: 'Selesai' };

function icon(name, extraClass = '') {
  return `<i class="fa-solid fa-${name} ${extraClass}" aria-hidden="true"></i>`;
}

async function apiRequest(path, payload = null) {
  const options = { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (payload) {
    options.method = 'POST';
    if (payload instanceof FormData) {
      options.body = payload;
    } else {
      options.body = new FormData();
      Object.entries(payload).forEach(([key, value]) => options.body.append(key, value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  options.signal = controller.signal;

  let response;
  try {
    response = await fetch(APP_BASE + 'api/' + path, options);
  } catch (error) {
    const networkError = new Error(error.name === 'AbortError'
      ? 'Server terlalu lama merespons. Periksa koneksi internet, lalu coba lagi.'
      : 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.');
    networkError.isNetworkError = true;
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error('Balasan server tidak valid (HTTP ' + response.status + '). Pastikan Apache dan MySQL berjalan.');
  }

  if (response.status === 401 && document.body.dataset.area === 'admin') {
    location.href = 'login.html';
  }
  if (!body.success) {
    const requestError = new Error(body.message || 'Terjadi kesalahan.');
    requestError.status = response.status;
    throw requestError;
  }
  return body.data;
}

function parseServerDate(text) {
  const [datePart, timePart = '00:00:00'] = String(text).split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, second || 0);
}

function formatLongDate(text) {
  const date = parseServerDate(text);
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(text) {
  const date = parseServerDate(text);
  return `${DAY_NAMES[date.getDay()].slice(0, 3)}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function formatDayMonth(text) {
  const date = parseServerDate(text);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

function formatTodayLong() {
  const today = new Date();
  return `${DAY_NAMES[today.getDay()]}, ${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
}

function formatClock(text) {
  return String(text).slice(11, 16);
}

function padTwo(number) {
  return String(number).padStart(2, '0');
}

function formatCountdown(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return (hours > 0 ? hours + ':' + padTwo(minutes) : padTwo(minutes)) + ':' + padTwo(seconds % 60);
}

function formatTimeAgo(seconds) {
  if (seconds < 60) return 'baru saja';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' mnt lalu';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' jam lalu';
  return Math.floor(seconds / 86400) + ' hari lalu';
}

function formatSessionCode(code) {
  return String(code).slice(0, 3) + ' ' + String(code).slice(3);
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function getInitials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function getCourseAbbreviation(courseName) {
  if (courseName.length <= 12) return courseName;
  return courseName.split(/[\s/-]+/).filter(Boolean).map(word => word[0]).join('').toUpperCase().slice(0, 5);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 4) return 'Selamat malam';
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function statusBadge(status) {
  const label = ATTENDANCE_LABELS[status] || SESSION_LABELS[status] || status;
  const dot = status === 'active' ? '<span class="size-1.5 animate-pulse rounded-full bg-current"></span>' : '';
  return `<span class="badge badge-${status}">${dot}${label}</span>`;
}

function percentBar(percent) {
  if (percent === null || percent === undefined) return '<span class="text-gray-500">–</span>';
  const value = Number(percent);
  const color = value >= 75 ? 'bg-emerald-400' : (value >= 50 ? 'bg-amber-300' : 'bg-red-400');
  return `<div class="flex flex-col items-end gap-1.5 sm:min-w-32 sm:flex-row sm:items-center sm:gap-3">
    <b class="text-sm tabular-nums sm:order-2 sm:w-10 sm:shrink-0 sm:text-right">${value}%</b>
    <div class="bar-track w-16 sm:order-1 sm:w-full"><div class="h-full rounded-full ${color}" style="width:${value}%"></div></div>
  </div>`;
}

function stackedBar(present, late, total, showAbsent = false) {
  const presentCount = Number(present);
  const lateCount = Number(late);
  const totalCount = Number(total) || 1;
  const remaining = Math.max(0, totalCount - presentCount - lateCount);
  return `<div class="stack-bar" role="img" aria-label="${presentCount} hadir, ${lateCount} terlambat dari ${Number(total)}">
    <span class="seg-present" style="width:${presentCount / totalCount * 100}%"></span>
    <span class="seg-late" style="width:${lateCount / totalCount * 100}%"></span>
    ${showAbsent ? `<span class="seg-absent" style="width:${remaining / totalCount * 100}%"></span>` : ''}
  </div>`;
}

function progressRing(percent, size = 72, strokeWidth = 8) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const center = size / 2;
  return `<span class="relative inline-grid shrink-0 place-items-center" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke-width="${strokeWidth}" class="stroke-gray-800"></circle>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke-width="${strokeWidth}" stroke-linecap="round"
        class="stroke-blue-300 transition-[stroke-dashoffset] duration-700" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <b class="relative text-sm">${value}%</b>
  </span>`;
}

function getSessionPhase(session, fetchedAt, onTimeMinutes) {
  const elapsed = Number(session.elapsed_seconds) + (performance.now() - fetchedAt) / 1000;
  const duration = Number(session.duration_seconds);
  const onTimeLimit = Math.min(onTimeMinutes * 60, duration);
  if (elapsed < 0) return { phase: 'upcoming', remaining: -elapsed, progress: 0 };
  if (elapsed <= onTimeLimit) return { phase: 'present', remaining: onTimeLimit - elapsed, progress: elapsed / duration };
  if (elapsed <= duration) return { phase: 'late', remaining: duration - elapsed, progress: elapsed / duration };
  return { phase: 'closed', remaining: 0, progress: 1 };
}

function emptyState(iconName, title, message, actionHtml = '') {
  return `<div class="empty-state">
    <span class="empty-icon">${icon(iconName)}</span>
    <h3 class="text-lg font-bold">${title}</h3>
    <p class="max-w-sm text-sm text-gray-400">${message}</p>
    ${actionHtml}
  </div>`;
}

function showToast(message, type = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  toast.innerHTML = (type === 'error' ? icon('circle-exclamation', 'text-red-300') : icon('circle-check', 'text-emerald-300'))
    + `<span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.hidden = false;
  document.body.classList.add('overflow-hidden');
  const firstField = modal.querySelector('input:not([type=hidden]):not([readonly]), select');
  if (firstField && window.innerWidth > 720) setTimeout(() => firstField.focus(), 60);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal.hidden) return;
  modal.hidden = true;
  if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('overflow-hidden');
  modal.dispatchEvent(new Event('modalclose'));
}

document.addEventListener('click', event => {
  const closer = event.target.closest('[data-close]');
  if (closer && closer.closest('.modal')) closeModal(closer.closest('.modal').id);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(modal => closeModal(modal.id));
});

function confirmAction({ title, message, confirmLabel = 'Ya, lanjutkan', danger = true }) {
  let modal = document.getElementById('confirm_modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm_modal';
    modal.className = 'modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal-panel max-w-md" role="alertdialog" aria-modal="true" aria-labelledby="confirm_title" aria-describedby="confirm_message">
        <div class="flex flex-col gap-3 px-6 pt-6">
          <span id="confirm_icon" class="grid size-12 place-items-center rounded-2xl text-xl"></span>
          <h2 id="confirm_title" class="font-display text-xl font-extrabold"></h2>
          <p id="confirm_message" class="text-sm leading-relaxed text-gray-300"></p>
        </div>
        <div class="flex flex-wrap justify-end gap-3 px-6 py-5">
          <button type="button" class="btn btn-outline" id="confirm_cancel_button">Batal</button>
          <button type="button" class="btn" id="confirm_ok_button"></button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  const iconBox = modal.querySelector('#confirm_icon');
  iconBox.className = 'grid size-12 place-items-center rounded-2xl text-xl ' + (danger ? 'bg-red-400/15 text-red-300' : 'bg-blue-300/15 text-blue-300');
  iconBox.innerHTML = icon(danger ? 'triangle-exclamation' : 'circle-info');
  modal.querySelector('#confirm_title').textContent = title;
  modal.querySelector('#confirm_message').textContent = message;
  const okButton = modal.querySelector('#confirm_ok_button');
  const cancelButton = modal.querySelector('#confirm_cancel_button');
  okButton.textContent = confirmLabel;
  okButton.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  openModal('confirm_modal');
  okButton.focus();

  return new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      okButton.onclick = null;
      cancelButton.onclick = null;
      modal.removeEventListener('modalclose', onClose);
      closeModal('confirm_modal');
      resolve(result);
    };
    const onClose = () => finish(false);
    okButton.onclick = () => finish(true);
    cancelButton.onclick = () => finish(false);
    modal.addEventListener('modalclose', onClose);
  });
}

function startPolling(task, intervalMs) {
  let busy = false;
  let failing = false;
  const run = async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      await task();
      failing = false;
    } catch (error) {
      if (!failing) showToast(error.message, 'error');
      failing = true;
    } finally {
      busy = false;
    }
  };
  setInterval(run, intervalMs);
  document.addEventListener('visibilitychange', run);
  return run();
}

function setButtonLoading(button, isLoading, label = 'Memproses…') {
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span><span>${escapeHtml(label)}</span>`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

function showFormError(element, message) {
  element.innerHTML = icon('circle-exclamation', 'mt-0.5') + `<span>${escapeHtml(message)}</span>`;
  element.hidden = false;
}

function downloadFromApi(path) {
  const link = document.createElement('a');
  link.href = APP_BASE + 'api/' + path;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function setupTabs(tabList, onChange = null) {
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const selectTab = (tab, notify = true) => {
    tabs.forEach(item => {
      const isSelected = item === tab;
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !isSelected;
    });
    if (notify && onChange) onChange(tab);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const step = event.key === 'ArrowRight' ? 1 : tabs.length - 1;
      const nextTab = tabs[(index + step) % tabs.length];
      nextTab.focus();
      selectTab(nextTab);
    });
  });
  return selectTab;
}

function setupToggleGroup(group, onChange) {
  const buttons = [...group.querySelectorAll('button[data-value]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    onChange(button.dataset.value);
  }));
}

function setupHashTabs() {
  document.querySelectorAll('[data-tabs]').forEach(tabList => {
    const selectTab = setupTabs(tabList, tab => history.replaceState(null, '', '#' + tab.dataset.hash));
    const fromHash = tabList.querySelector(`[data-hash="${CSS.escape(location.hash.slice(1))}"]`);
    if (fromHash) selectTab(fromHash, false);
  });
}

function setupStaffFilter() {
  document.querySelectorAll('[data-filter-target]').forEach(group => {
    const cards = [...document.querySelectorAll(group.dataset.filterTarget + ' [data-roles]')];
    setupToggleGroup(group, value => {
      cards.forEach(card => { card.hidden = value !== 'all' && !card.dataset.roles.split(' ').includes(value); });
    });
  });
}

function setupLogoFallback() {
  document.querySelectorAll('img[data-logo]').forEach(image => {
    const useText = () => {
      const wordmark = document.createElement('span');
      wordmark.className = 'font-display text-lg font-extrabold tracking-tight text-white';
      wordmark.textContent = "Han's Projects";
      image.replaceWith(wordmark);
    };
    if (image.complete && image.naturalWidth === 0) useText();
    else image.addEventListener('error', useText);
  });
}

function setupPublicHeader() {
  const menuButton = document.getElementById('menu_button');
  const mobileMenu = document.getElementById('mobile_menu');
  if (!menuButton || !mobileMenu) return;
  const setMenuOpen = isOpen => {
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
    menuButton.querySelector('i').className = 'fa-solid ' + (isOpen ? 'fa-xmark' : 'fa-bars');
    mobileMenu.hidden = !isOpen;
  };
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) setMenuOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenuOpen(false); });
  document.addEventListener('click', event => {
    const path = event.composedPath();
    if (!mobileMenu.hidden && !path.includes(mobileMenu) && !path.includes(menuButton)) setMenuOpen(false);
  });
}

function setupScrollTopButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scroll-top';
  button.setAttribute('aria-label', 'Kembali ke atas');
  button.innerHTML = icon('arrow-up');
  button.addEventListener('click', () => window.scrollTo({ top: 0 }));
  document.body.appendChild(button);
  const update = () => { button.dataset.visible = String(window.scrollY > 400); };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

const ADMIN_MENU = [
  { page: 'dashboard', label: 'Beranda', href: 'index.html', icon: 'house' },
  { page: 'sessions', label: 'Sesi', href: 'sessions.html', icon: 'calendar-days' },
  { page: 'students', label: 'Mahasiswa', href: 'students.html', icon: 'user-graduate' },
  { page: 'recap', label: 'Rekap', href: 'recap.html', icon: 'chart-column' },
  { page: 'users', label: 'Pengguna', href: 'users.html', icon: 'user-shield' },
];

let CURRENT_USER = null;

function fillUserChip(user) {
  document.getElementById('user_full_name').textContent = user.full_name;
  document.getElementById('user_username').textContent = '@' + user.username;
  document.getElementById('user_avatar').textContent = getInitials(user.full_name);
}

async function setupAdminLayout() {
  const activePage = document.body.dataset.page;
  const currentAttribute = page => (page === activePage ? 'aria-current="page"' : '');

  document.getElementById('admin_header').innerHTML = `
    <nav class="admin-width flex h-15 items-center gap-3 rounded-full bg-blue-300/10 px-3 backdrop-blur-3xl sm:px-5" aria-label="Menu admin">
      <a href="index.html" class="flex shrink-0 items-center">
        <img data-logo draggable="false" class="h-8 select-none" src="../src/hans_projects_logo.png" alt="Han's Projects">
      </a>
      <ul class="hidden flex-1 items-center justify-center gap-8 lg:flex">
        ${ADMIN_MENU.map(item => `<li><a class="nav-link" href="${item.href}" ${currentAttribute(item.page)}>${item.label}</a></li>`).join('')}
      </ul>
      <div class="ml-auto flex items-center gap-1.5 lg:ml-0">
        <a href="../index.html" target="_blank" rel="noopener" class="icon-button hidden sm:inline-grid" title="Buka halaman absen" aria-label="Buka halaman absen">${icon('arrow-up-right-from-square')}</a>
        <div class="flex items-center gap-2 rounded-full bg-gray-950/40 p-1 sm:pr-4" title="Akun yang sedang login">
          <span class="avatar avatar-sm avatar-me" id="user_avatar">··</span>
          <span class="hidden flex-col leading-tight sm:flex">
            <b id="user_full_name" class="max-w-36 truncate text-sm">Memuat…</b>
            <small id="user_username" class="text-xs text-gray-400">&nbsp;</small>
          </span>
        </div>
        <button type="button" class="icon-button" id="logout_button" title="Keluar" aria-label="Keluar">${icon('right-from-bracket')}</button>
      </div>
    </nav>`;

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'bottom-nav';
  bottomNav.setAttribute('aria-label', 'Menu utama');
  bottomNav.innerHTML = ADMIN_MENU.map(item =>
    `<a class="bottom-nav-link" href="${item.href}" ${currentAttribute(item.page)}>${icon(item.icon, 'text-base')}<span>${item.label}</span></a>`).join('');
  document.body.appendChild(bottomNav);
  document.getElementById('logout_button').addEventListener('click', logout);
  setupLogoFallback();

  CURRENT_USER = await apiRequest('auth.php?action=check');
  fillUserChip(CURRENT_USER);
  return CURRENT_USER;
}

async function logout() {
  const confirmed = await confirmAction({
    title: 'Keluar dari panel?',
    message: 'Anda perlu login kembali untuk mengelola sesi dan rekap.',
    confirmLabel: 'Keluar',
    danger: false,
  });
  if (!confirmed) return;
  await apiRequest('auth.php?action=logout', {}).catch(() => null);
  location.href = 'login.html';
}

setupLogoFallback();
setupPublicHeader();
setupHashTabs();
setupStaffFilter();
setupScrollTopButton();

if (location.protocol === 'file:') {
  setTimeout(() => showToast('Buka aplikasi lewat http://localhost/absensi (bukan klik dua kali file HTML) agar PHP bisa berjalan.', 'error'), 400);
}
