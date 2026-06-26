/**
 * Conversion pipeline — orchestrates the full sheet music → TAB workflow.
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { classifyUpload, ensureDir } = require('../utils/fileUtils');
const audiverisService = require('./audiverisService');
const musicXmlService = require('./musicXmlService');
const fingeringService = require('./fingeringService');
const tabService = require('./tabService');
const difficultyService = require('./difficultyService');
const logger = require('../utils/logger');

/** In-memory job store for export lookups (production would use Redis/DB) */
const jobStore = new Map();

/**
 * @typedef {object} ConversionResult
 * @property {string} jobId
 * @property {string} ascii
 * @property {string[]} lines
 * @property {string[]} legend
 * @property {object} meta
 * @property {Array} notes
 * @property {boolean} usedMockOmr
 * @property {string} sourceType
 */

/**
 * Run the complete conversion pipeline for an uploaded file.
 * @param {string} filePath - Path to uploaded file on disk
 * @param {string} originalName - Original filename from client
 * @param {string} mimetype - MIME type from multer
 * @returns {Promise<ConversionResult>}
 */
async function convertUploadedFile(filePath, originalName, mimetype) {
  const jobId = uuidv4();
  const sourceType = classifyUpload(originalName, mimetype);
  ensureDir(path.join(config.paths.outputDir, jobId));

  logger.info('Starting conversion pipeline', { jobId, sourceType, file: originalName });

  let musicXmlPath = filePath;
  let usedMockOmr = false;

  // Step 1: OMR for images and PDFs
  if (sourceType === 'image' || sourceType === 'pdf') {
    const omrResult = await audiverisService.runAudiveris(filePath, jobId);
    musicXmlPath = omrResult.musicXmlPath;
    usedMockOmr = omrResult.mock;
  } else if (sourceType === 'mxl' || sourceType === 'musicxml') {
    // Direct MusicXML — copy reference to job output folder
    musicXmlPath = filePath;
  } else {
    const err = new Error(`Unsupported file type for conversion: ${sourceType}`);
    err.status = 400;
    err.code = 'UNSUPPORTED_TYPE';
    throw err;
  }

  // Step 2: Parse MusicXML
  const { notes, meta } = await musicXmlService.parseMusicXmlFile(musicXmlPath);

  if (notes.filter((n) => !n.isRest).length === 0) {
    const err = new Error('No playable notes found in the sheet music');
    err.status = 422;
    err.code = 'NO_NOTES';
    throw err;
  }

  // Step 3: Convert to beginner guitar fingering
  const notesWithFingering = fingeringService.convertNotesToFingering(notes, { mode: 'beginner' });

  // Step 4: Analyze beginner difficulty
  const difficulty = difficultyService.analyzeDifficulty(notesWithFingering);

  // Step 5: Generate measure-aware ASCII TAB
  const tab = tabService.generateTab(notesWithFingering, { ...meta, difficulty });

  const result = {
    jobId,
    ascii: tab.ascii,
    lines: tab.lines,
    legend: tab.legend,
    meta: {
      ...tab.meta,
      sourceFile: originalName,
      sourceType,
      difficulty,
    },
    notes: notesWithFingering.filter((n) => !n.isRest).map((n) => ({
      name: n.name,
      midi: n.midi,
      measure: n.measure,
      beat: n.beat,
      duration: n.durationType,
      string: n.fingering.string,
      fret: n.fingering.fret,
      playable: n.fingering.playable,
      hint: n.fingering.hint,
    })),
    usedMockOmr,
    sourceType,
  };

  // Cache for export endpoints
  jobStore.set(jobId, {
    ascii: tab.ascii,
    meta: tab.meta,
    createdAt: Date.now(),
  });

  logger.info('Conversion complete', { jobId, noteCount: result.notes.length });

  return result;
}

/**
 * Retrieve cached job data for export.
 * @param {string} jobId
 * @returns {object|null}
 */
function getJob(jobId) {
  return jobStore.get(jobId) || null;
}

/**
 * Get system status (Audiveris, Java, etc.)
 */
function getSystemStatus() {
  const audiveris = audiverisService.checkAvailability();
  const java = audiverisService.checkJavaRuntime();

  return {
    audiveris,
    java,
    mockModeAvailable: config.audiveris.allowMockInDev,
  };
}

module.exports = {
  convertUploadedFile,
  getJob,
  getSystemStatus,
};
