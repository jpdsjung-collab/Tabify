/**
 * Central configuration for the Tabify backend.
 * Loads environment variables and exposes typed, validated defaults.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const backendRoot = path.join(__dirname, '../..');

/** @type {import('./index').TabifyConfig} */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isDev: (process.env.NODE_ENV || 'development') !== 'production',

  paths: {
    backendRoot,
    uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || 'uploads'),
    outputDir: path.resolve(backendRoot, process.env.OUTPUT_DIR || 'output'),
    frontendDir: path.resolve(backendRoot, '../frontend'),
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(25 * 1024 * 1024), 10),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'application/pdf',
      'application/xml',
      'text/xml',
      'application/vnd.recordare.musicxml+xml',
      'application/vnd.recordare.musicxml',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.pdf', '.xml', '.musicxml', '.mxl'],
  },

  audiveris: {
    bin: process.env.AUDIVERIS_BIN || '',
    timeoutMs: parseInt(process.env.AUDIVERIS_TIMEOUT_MS || '120000', 10),
    /** When Audiveris is unavailable, allow demo/mock mode outside production */
    allowMockInDev: process.env.AUDIVERIS_MOCK === 'true' || (process.env.NODE_ENV || 'development') !== 'production',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  /** Beginner fingering constraints */
  guitar: {
    maxFret: 5,
    tuning: [
      { string: 6, note: 'E', octave: 2, midi: 40 },
      { string: 5, note: 'A', octave: 2, midi: 45 },
      { string: 4, note: 'D', octave: 3, midi: 50 },
      { string: 3, note: 'G', octave: 3, midi: 55 },
      { string: 2, note: 'B', octave: 3, midi: 59 },
      { string: 1, note: 'E', octave: 4, midi: 64 },
    ],
  },
};

module.exports = config;
