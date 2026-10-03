/* ==========================================================
   eSaka Shared Shell Behavior (v2)
   ========================================================== */

const ESAKA_ROLES = {
  admin: { label: 'System Administrator', short: 'System Admin', dashboard: 'system-admin.html' },
  darfo: { label: 'DA-RFO Officer', short: 'DA RFO', dashboard: 'da.html' },
  provincial: { label: 'Provincial Coordinator', short: 'Provincial Coordinator', dashboard: 'provincial.html' },
  municipal: { label: 'Municipal Coordinator', short: 'Municipal Coordinator', dashboard: 'municipal.html' },
  aew: { label: 'Agricultural Extension Worker', short: 'AEW', dashboard: 'aew.html' },
  farmer: { label: 'Farmer', short: 'Farmer', dashboard: null },
  coop: { label: 'Cooperative', short: 'Cooperative', dashboard: null },
  lgu: { label: 'LGU Agricultural Officer', short: 'LGU', dashboard: null }
};

function resolveRole(roleValue) {
  if (!roleValue) return { label: 'Unknown Role', short: 'Unknown', dashboard: null };
  const key = String(roleValue).toLowerCase()
    .replace(/\s?officer$|\s?coordinator$/, '')
    .replace(/[\s-]/g, '');
  const aliasMap = { da: 'darfo', darfoofficer: 'darfo' };
  const resolvedKey = ESAKA_ROLES[key] ? key : (aliasMap[key] || key);
  return ESAKA_ROLES[resolvedKey] || { label: String(roleValue), short: String(roleValue), dashboard: null };
}

function getDashboardByRole(roleValue) {
  return resolveRole(roleValue).dashboard;
}

function initIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function initNotifDropdown() {
  const bellBtn = document.getElementById('bellBtn');
  const dropdown = document.getElementById('notifDropdown');
  if (!bellBtn || !dropdown) return;
  bellBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    dropdown.classList.toggle('show');
  });
  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target) && event.target !== bellBtn) dropdown.classList.remove('show');
  });
}

function ensureToastStack() {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, variant = '', duration = 3500) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast ${variant}`.trim();
  toast.innerHTML = `<span class="msg"></span><button class="close" aria-label="Dismiss">&times;</button>`;
  toast.querySelector('.msg').textContent = message;
  stack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const remove = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  };
  toast.querySelector('.close').addEventListener('click', remove);
  if (duration) setTimeout(remove, duration);
}

function openDialog(dialogId) {
  document.getElementById(dialogId)?.classList.add('show');
}
function closeDialog(dialogId) {
  document.getElementById(dialogId)?.classList.remove('show');
}
function initDialogListeners() {
  document.querySelectorAll('.dialog-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.classList.remove('show');
    });
  });
  document.querySelectorAll('[data-dialog-cancel]').forEach((button) => {
    button.addEventListener('click', () => button.closest('.dialog-overlay')?.classList.remove('show'));
  });
}

function openDrawer(drawerId) {
  document.getElementById(drawerId)?.classList.add('open');
  document.getElementById(`${drawerId}Overlay`)?.classList.add('show');
}
function closeDrawer(drawerId) {
  document.getElementById(drawerId)?.classList.remove('open');
  document.getElementById(`${drawerId}Overlay`)?.classList.remove('show');
}
function initDrawerListeners() {
  document.querySelectorAll('.drawer-overlay').forEach((overlay) => {
    overlay.addEventListener('click', () => {
      overlay.classList.remove('show');
      overlay.previousElementSibling?.classList.remove('open');
    });
  });
  document.querySelectorAll('.drawer-close').forEach((button) => {
    button.addEventListener('click', () => button.closest('.drawer')?.classList.remove('open'));
  });
}

function swapSkeleton(sectionKey) {
  document.getElementById(`${sectionKey}-skeleton`)?.classList.add('hidden-element');
  document.getElementById(`${sectionKey}-content`)?.classList.remove('hidden-element');
}
function showErrorState(sectionKey, message = 'Something went wrong loading this data.') {
  document.getElementById(`${sectionKey}-skeleton`)?.classList.add('hidden-element');
  const errorElement = document.getElementById(`${sectionKey}-error`);
  if (!errorElement) return;
  errorElement.classList.remove('hidden-element');
  const messageElement = errorElement.querySelector('.error-message');
  if (messageElement) messageElement.textContent = message;
}

const initShellIcons = initIcons;
const initShellSidebar = initSidebar;
const initShellNotifDropdown = initNotifDropdown;
const initShellDialogListeners = initDialogListeners;
const initShellDrawerListeners = initDrawerListeners;

document.addEventListener('DOMContentLoaded', () => {
  initShellIcons();
  initShellSidebar();
  initShellNotifDropdown();
  initShellDialogListeners();
  initShellDrawerListeners();
});
