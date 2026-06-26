/**
 * File preview component — renders image, PDF, or MusicXML badge.
 */

import { $, clearChildren } from '../utils/dom.js';
import { classifyFile } from '../utils/format.js';

/** Configure PDF.js worker */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Render a preview for the given file into the preview body container.
 * @param {File} file
 * @param {string} [objectUrl] - Pre-created object URL for images
 */
export async function renderPreview(file, objectUrl) {
  const body = $('#previewBody');
  const filename = $('#previewFilename');
  if (!body) return;

  clearChildren(body);
  if (filename) filename.textContent = file.name;

  const type = classifyFile(file);

  if (type === 'image') {
    renderImagePreview(body, objectUrl || URL.createObjectURL(file));
  } else if (type === 'pdf') {
    await renderPdfPreview(body, file);
  } else if (type === 'musicxml') {
    renderMusicXmlBadge(body, file.name);
  } else {
    renderUnknownBadge(body, file.name);
  }
}

/**
 * Render image preview using an object URL.
 * @param {HTMLElement} container
 * @param {string} url
 */
function renderImagePreview(container, url) {
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Sheet music preview';
  img.loading = 'lazy';
  container.appendChild(img);
}

/**
 * Render first page of PDF using PDF.js.
 * @param {HTMLElement} container
 * @param {File} file
 */
async function renderPdfPreview(container, file) {
  if (!window.pdfjsLib) {
    renderPdfFallback(container, file.name);
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    container.appendChild(canvas);

    if (pdf.numPages > 1) {
      const badge = document.createElement('p');
      badge.style.cssText = 'font-size:12px;color:var(--color-text-secondary);padding:8px;text-align:center;';
      badge.textContent = `Page 1 of ${pdf.numPages}`;
      container.appendChild(badge);
    }
  } catch (err) {
    console.error('PDF preview error:', err);
    renderPdfFallback(container, file.name);
  }
}

/**
 * Fallback when PDF.js fails to load.
 * @param {HTMLElement} container
 * @param {string} name
 */
function renderPdfFallback(container, name) {
  const badge = document.createElement('div');
  badge.className = 'preview__xml-badge';
  badge.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" stroke-width="2"/>
      <path d="M16 16h16M16 24h16M16 32h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <strong>${name}</strong>
    <span>PDF ready for conversion</span>
  `;
  container.appendChild(badge);
}

/**
 * Render MusicXML file badge (no visual preview needed).
 * @param {HTMLElement} container
 * @param {string} name
 */
function renderMusicXmlBadge(container, name) {
  const badge = document.createElement('div');
  badge.className = 'preview__xml-badge';
  badge.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M12 8l12 4 12-4v28l-12 4-12-4V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M24 12v28M12 16l12 4 12-4" stroke="currentColor" stroke-width="2"/>
    </svg>
    <strong>${name}</strong>
    <span>MusicXML — ready for conversion</span>
  `;
  container.appendChild(badge);
}

/**
 * Unknown file type badge.
 * @param {HTMLElement} container
 * @param {string} name
 */
function renderUnknownBadge(container, name) {
  const badge = document.createElement('div');
  badge.className = 'preview__xml-badge';
  badge.innerHTML = `<strong>${name}</strong><span>File selected</span>`;
  container.appendChild(badge);
}

/**
 * Clear preview and revoke object URLs.
 * @param {string|null} objectUrl
 */
export function clearPreview(objectUrl) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  clearChildren($('#previewBody'));
}
