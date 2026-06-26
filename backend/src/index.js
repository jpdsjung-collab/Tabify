/**
 * Tabify server entry point.
 * Starts the Express HTTP server and logs startup configuration.
 */

const { createApp } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const audiverisService = require('./services/audiverisService');

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Tabify server running`, {
    port: config.port,
    env: config.env,
    frontend: config.paths.frontendDir,
  });

  const audiveris = audiverisService.checkAvailability();
  const java = audiverisService.checkJavaRuntime();

  if (audiveris.available) {
    logger.info('Audiveris OMR ready', { path: audiveris.path });
  } else {
    logger.warn('Audiveris not configured', audiveris.message);
    if (config.audiveris.allowMockInDev) {
      logger.info('Demo/mock OMR mode enabled for development');
    }
  }

  if (!java.available) {
    logger.warn('Java runtime not detected — required for Audiveris OMR');
  }
});

// Graceful shutdown
function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
