/**
 * Express application factory — middleware, routes, static frontend.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const { ensureDir } = require('./utils/fileUtils');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const convertRoutes = require('./routes/convert');
const exportRoutes = require('./routes/export');
const logger = require('./utils/logger');

// Ensure runtime directories exist
ensureDir(config.paths.uploadDir);
ensureDir(config.paths.outputDir);

/**
 * Create and configure the Express application.
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  // Security & performance middleware
  app.use(helmet({
    contentSecurityPolicy: config.isDev ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
    methods: ['GET', 'POST'],
  }));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  // API routes
  app.use('/api', convertRoutes);
  app.use('/api/export', exportRoutes);

  // Serve frontend static assets
  const frontendPath = config.paths.frontendDir;
  app.use(express.static(frontendPath, {
    maxAge: config.isDev ? 0 : '1d',
    etag: true,
  }));

  // SPA fallback — serve index.html for non-API routes
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
