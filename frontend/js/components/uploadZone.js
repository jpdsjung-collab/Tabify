/**
 * Upload zone component — drag-and-drop, file selection, and validation.
 */

import { $, show, hide, toggleClass } from '../utils/dom.js';
import { classifyFile, formatFileSize } from '../utils/format.js';
import { renderPreview, clearPreview } from './preview.js';

const MAX_SIZE = 25 * 1024 * 1024;

/** @type {((file: File, previewUrl: string|null) => void) | null} */
let onFileSelected = null;

/** @type {((message: string) => void) | null} */
let onFileError = null;

/**
 * Initialize upload zone event listeners.
 * @param {{ onFileSelected: (file: File, previewUrl: string|null) => void, onError?: (message: string) => void }} callbacks
 */
export function initUploadZone({ onFileSelected: callback, onError }) {
  onFileSelected = callback;
  onFileError = onError || null;

  const zone = $('#uploadZone');
  const input = $('#fileInput');
  const browseBtn = $('#browseBtn');

  if (!zone || !input) return;

  // Click to browse
  zone.addEventListener('click', (e) => {
    if (e.target.closest('#clearBtn')) return;
    input.click();
  });

  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
  }

  // Keyboard accessibility
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  // File input change
  input.addEventListener('change', () => {
    if (input.files?.[0]) handleFile(input.files[0]);
  });

  // Drag and drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    toggleClass(zone, 'upload-zone--dragover', true);
  });

  zone.addEventListener('dragleave', () => {
    toggleClass(zone, 'upload-zone--dragover', false);
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    toggleClass(zone, 'upload-zone--dragover', false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
}

/**
 * Validate and process a selected file.
 * @param {File} file
 */
async function handleFile(file) {
  try {
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large (${formatFileSize(file.size)}). Maximum is 25 MB.`);
    }

    const type = classifyFile(file);
    if (type === 'unknown') {
      throw new Error('Unsupported file type. Please upload an image, PDF, or MusicXML file.');
    }

    hide($('#uploadPlaceholder'));
    show($('#previewContainer'));

    const previewUrl = type === 'image' ? URL.createObjectURL(file) : null;
    await renderPreview(file, previewUrl);

    if (onFileSelected) onFileSelected(file, previewUrl);
  } catch (err) {
    if (onFileError) onFileError(err.message);
  }
}

/**
 * Reset upload zone to initial state.
 * @param {string|null} previewUrl
 */
export function resetUploadZone(previewUrl) {
  clearPreview(previewUrl);

  show($('#uploadPlaceholder'));
  hide($('#previewContainer'));

  const input = $('#fileInput');
  if (input) input.value = '';
}

/**
 * Wire clear button.
 * @param {() => void} onClear
 */
export function initClearButton(onClear) {
  const btn = $('#clearBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClear();
    });
  }
}
