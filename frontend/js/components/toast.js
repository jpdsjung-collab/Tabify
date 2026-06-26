/**
 * Toast notification component.
 */

import { $, show, hide } from '../utils/dom.js';

let toastTimer = null;

/**
 * Show a toast message.
 * @param {string} message
 * @param {'default' | 'success' | 'error'} [type='default']
 * @param {number} [durationMs=4000]
 */
export function showToast(message, type = 'default', durationMs = 4000) {
  const toast = $('#toast');
  const msgEl = $('#toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('toast--success', 'toast--error');
  if (type === 'success') toast.classList.add('toast--success');
  if (type === 'error') toast.classList.add('toast--error');

  show(toast);

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(toast), durationMs);
}

/**
 * Hide toast immediately.
 */
export function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  hide($('#toast'));
}

/**
 * Wire toast close button.
 */
export function initToast() {
  const closeBtn = $('#toastClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideToast);
  }
}
