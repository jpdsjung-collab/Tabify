/**
 * Global Express error handler — returns consistent JSON error responses.
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
}

/**
 * Central error middleware.
 * @param {Error & { status?: number, code?: string }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  logger.error('Request failed', {
    method: req.method,
    path: req.path,
    status,
    message: err.message,
    stack: config.isDev ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    error: err.code || (status >= 500 ? 'Internal Server Error' : 'Bad Request'),
    message: err.message || 'An unexpected error occurred',
    ...(config.isDev && err.stack ? { stack: err.stack } : {}),
  });
}

/**
 * Wrap async route handlers to forward errors to errorHandler.
 * @param {Function} fn
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
