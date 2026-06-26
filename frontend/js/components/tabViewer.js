/**
 * TAB viewer component — displays ASCII tablature and note fingering list.
 */

import { $, show, hide, clearChildren } from '../utils/dom.js';

/**
 * Render conversion results into the results section.
 * @param {object} data - Conversion result from API
 */
export function renderResults(data) {
  const section = $('#resultsSection');
  const meta = $('#resultsMeta');
  const tabDisplay = $('#tabDisplay');
  const notesList = $('#notesList');
  const notesCard = $('#notesCard');

  if (!section || !tabDisplay) return;

  // Meta line
  if (meta) {
    const parts = [
      data.meta?.title || 'Untitled',
      data.meta?.composer || null,
      `${data.notes?.length || 0} notes`,
      data.meta?.difficulty ? `Difficulty ${'★'.repeat(data.meta.difficulty.stars)}${'☆'.repeat(5 - data.meta.difficulty.stars)} · ${data.meta.difficulty.label}` : null,
      data.usedMockOmr ? '(demo OMR)' : null,
    ].filter(Boolean);
    meta.textContent = parts.join(' · ');
  }

  // TAB content — strip comment header for cleaner display, keep tab lines
  const displayTab = extractTabLines(data.ascii);
  tabDisplay.textContent = displayTab;

  // Notes list
  if (notesList && data.notes?.length) {
    clearChildren(notesList);
    data.notes.forEach((note, i) => {
      const li = document.createElement('li');
      li.className = 'notes-list__item';
      const fretLabel = note.fret === 0 ? 'open' : `fret ${note.fret}`;
      li.innerHTML = `
        <span class="notes-list__note">${note.name}</span>
        <span class="notes-list__fret">m.${note.measure || '-'} b.${note.beat || '-'} · ${note.duration || 'note'} → str ${note.string} (${fretLabel})</span>
      `;
      li.title = note.hint || '';
      notesList.appendChild(li);
    });
    show(notesCard);
  }

  show(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Extract tab lines from full ASCII output (skip comment headers).
 * @param {string} ascii
 * @returns {string}
 */
function extractTabLines(ascii) {
  const lines = ascii.split('\n');
  const tabStart = lines.findIndex((l) => /^[eBGDAE]\|/.test(l));
  if (tabStart === -1) return ascii;
  return lines.slice(tabStart).join('\n');
}

/**
 * Hide results section.
 */
export function hideResults() {
  hide($('#resultsSection'));
  hide($('#notesCard'));
}

/**
 * Copy TAB text to clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyTabToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
