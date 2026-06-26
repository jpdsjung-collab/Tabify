/**
 * Formatting utilities for display labels and file sizes.
 */

/**
 * Format byte count as human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determine file category from MIME type and extension.
 * @param {File} file
 * @returns {'image' | 'pdf' | 'musicxml' | 'unknown'}
 */
export function classifyFile(file) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    name.endsWith('.xml') ||
    name.endsWith('.musicxml') ||
    name.endsWith('.mxl') ||
    file.type.includes('xml') ||
    file.type.includes('musicxml')
  ) {
    return 'musicxml';
  }
  return 'unknown';
}

/**
 * Truncate filename for display.
 * @param {string} name
 * @param {number} maxLen
 * @returns {string}
 */
export function truncateFilename(name, maxLen = 32) {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, name.length - ext.length);
  return `${base.slice(0, maxLen - ext.length - 3)}...${ext}`;
}
