/**
 * Progress bar component — tracks upload and processing stages.
 */

import { $, show, hide } from '../utils/dom.js';

/**
 * Update progress bar and label.
 * @param {number} percent - 0–100
 * @param {string} label - Status text
 */
export function updateProgress(percent, label) {
  const container = $('#progressContainer');
  const bar = $('#progressBar');
  const labelEl = $('#progressLabel');

  if (!container || !bar) return;

  show(container);
  bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  container.setAttribute('aria-valuenow', String(percent));

  if (labelEl && label) {
    labelEl.textContent = label;
  }
}

/**
 * Hide progress bar and reset to zero.
 */
export function resetProgress() {
  const container = $('#progressContainer');
  const bar = $('#progressBar');

  if (bar) bar.style.width = '0%';
  if (container) {
    container.setAttribute('aria-valuenow', '0');
    hide(container);
  }
}

/**
 * Show processing spinner with custom message.
 * @param {string} message
 */
export function showProcessing(message) {
  const section = $('#processingSection');
  const text = $('#processingText');
  if (text) text.textContent = message;
  show(section);
}

/**
 * Hide processing spinner.
 */
export function hideProcessing() {
  hide($('#processingSection'));
}
