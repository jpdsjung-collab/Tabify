/**
 * Tabify — main application entry point.
 * Wires together upload, preview, conversion, and export flows.
 */

import { $, show, hide } from './utils/dom.js';
import { setState, getState, resetState } from './state.js';
import { fetchStatus, convertFile, downloadExport } from './api.js';
import { initUploadZone, resetUploadZone, initClearButton } from './components/uploadZone.js';
import { updateProgress, resetProgress, showProcessing, hideProcessing } from './components/progressBar.js';
import { renderResults, hideResults, copyTabToClipboard } from './components/tabViewer.js';
import { showToast, initToast } from './components/toast.js';

/**
 * Bootstrap the application.
 */
async function init() {
  initToast();
  await loadSystemStatus();
  wireUploadFlow();
  wireActionButtons();
}

/**
 * Fetch and display server/Audiveris status.
 */
async function loadSystemStatus() {
  const badge = $('#statusBadge');
  try {
    const status = await fetchStatus();
    setState({ systemStatus: status });

    if (badge) {
      if (status.audiveris?.available) {
        badge.textContent = 'OMR Ready';
        badge.classList.remove('header__badge--warning');
      } else if (status.mockModeAvailable) {
        badge.textContent = 'Demo Mode';
        badge.classList.add('header__badge--warning');
      } else {
        badge.textContent = 'OMR Offline';
        badge.classList.add('header__badge--warning');
      }
    }
  } catch {
    if (badge) {
      badge.textContent = 'Offline';
      badge.classList.add('header__badge--warning');
    }
  }
}

/**
 * Wire file selection and conversion flow.
 */
function wireUploadFlow() {
  initUploadZone({
    onFileSelected: (file, previewUrl) => {
      setState({ selectedFile: file, previewUrl });
      show($('#convertBtn'));
    },
    onError: (message) => showToast(message, 'error'),
  });

  initClearButton(() => {
    const { previewUrl } = getState();
    resetState();
    resetUploadZone(previewUrl);
    resetProgress();
    hideResults();
    hide($('#convertBtn'));
  });

  const convertBtn = $('#convertBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', handleConvert);
  }
}

/**
 * Run conversion pipeline when user clicks Convert.
 */
async function handleConvert() {
  const { selectedFile } = getState();
  if (!selectedFile) return;

  const convertBtn = $('#convertBtn');
  if (convertBtn) convertBtn.disabled = true;

  hideResults();
  showProcessing('Uploading sheet music…');

  try {
    const result = await convertFile(selectedFile, {
      onProgress: (percent, stage) => {
        updateProgress(percent, stage);
        showProcessing(stage);
      },
    });

    setState({ jobId: result.jobId, tabResult: result });
    hideProcessing();
    resetProgress();
    renderResults(result);
    showToast('Tablature generated successfully!', 'success');
  } catch (err) {
    hideProcessing();
    resetProgress();
    showToast(err.message || 'Conversion failed', 'error', 6000);
  } finally {
    if (convertBtn) convertBtn.disabled = false;
  }
}

/**
 * Wire export, copy, and reset action buttons.
 */
function wireActionButtons() {
  const copyBtn = $('#copyTabBtn');
  const pdfBtn = $('#downloadPdfBtn');
  const pngBtn = $('#downloadPngBtn');
  const newBtn = $('#newConversionBtn');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const { tabResult } = getState();
      if (!tabResult?.ascii) return;
      try {
        await copyTabToClipboard(tabResult.ascii);
        showToast('TAB copied to clipboard', 'success', 2000);
      } catch {
        showToast('Failed to copy', 'error');
      }
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => handleExport('pdf'));
  }

  if (pngBtn) {
    pngBtn.addEventListener('click', () => handleExport('png'));
  }

  if (newBtn) {
    newBtn.addEventListener('click', () => {
      const { previewUrl } = getState();
      resetState();
      resetUploadZone(previewUrl);
      resetProgress();
      hideResults();
      hide($('#convertBtn'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/**
 * Download TAB as PDF or PNG.
 * @param {'pdf' | 'png'} format
 */
async function handleExport(format) {
  const { jobId, tabResult } = getState();
  if (!jobId) {
    showToast('No conversion to export', 'error');
    return;
  }

  const title = tabResult?.meta?.title || 'tabify-tab';
  const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'tabify-tab'}.${format}`;

  try {
    showToast(`Generating ${format.toUpperCase()}…`, 'default', 2000);
    await downloadExport(jobId, format, filename);
    showToast(`${format.toUpperCase()} downloaded`, 'success', 2000);
  } catch (err) {
    showToast(err.message || 'Export failed', 'error');
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
