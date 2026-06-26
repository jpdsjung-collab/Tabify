/**
 * Structured console logger with timestamps and severity levels.
 */

const config = require('../config');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = config.isDev ? LEVELS.debug : LEVELS.info;

function formatMessage(level, message, meta) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    return `${prefix} ${message} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

function log(level, message, meta) {
  if (LEVELS[level] < currentLevel) return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(formatMessage(level, message, meta));
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
