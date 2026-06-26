/**
 * Multer upload configuration — disk storage with type validation.
 */

const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { ensureDir } = require('../utils/fileUtils');

ensureDir(config.paths.uploadDir);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, config.paths.uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * Reject files that are not supported sheet music formats.
 */
function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = config.upload.allowedMimeTypes.includes(file.mimetype);
  const extOk = config.upload.allowedExtensions.includes(ext);

  // Some browsers send application/octet-stream for MusicXML
  const fallbackOk = ext === '.xml' || ext === '.musicxml' || ext === '.mxl';

  if (mimeOk || extOk || fallbackOk) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file type: ${file.mimetype} (${ext}). Allowed: images, PDF, MusicXML.`
    );
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
});

module.exports = upload;
