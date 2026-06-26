/**
 * File system helpers — ensure directories exist and clean up temp files.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Create directory recursively if it does not exist.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug('Created directory', dirPath);
  }
}

/**
 * Safely delete a file; logs warning on failure.
 * @param {string} filePath
 */
function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    logger.warn('Failed to delete file', { filePath, error: err.message });
  }
}

/**
 * Recursively remove a directory.
 * @param {string} dirPath
 */
function safeRmDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    logger.warn('Failed to remove directory', { dirPath, error: err.message });
  }
}

/**
 * Determine file category from extension and mime type.
 * @param {string} filename
 * @param {string} mimetype
 * @returns {'image' | 'pdf' | 'musicxml' | 'mxl' | 'unknown'}
 */
function classifyUpload(filename, mimetype) {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'].includes(ext) || mimetype.startsWith('image/')) {
    return 'image';
  }
  if (ext === '.pdf' || mimetype === 'application/pdf') {
    return 'pdf';
  }
  if (ext === '.mxl') {
    return 'mxl';
  }
  if (['.xml', '.musicxml'].includes(ext) || mimetype.includes('musicxml') || mimetype.includes('xml')) {
    return 'musicxml';
  }
  return 'unknown';
}

/**
 * Read file as UTF-8 string.
 * @param {string} filePath
 * @returns {string}
 */
function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
  ensureDir,
  safeUnlink,
  safeRmDir,
  classifyUpload,
  readTextFile,
};
