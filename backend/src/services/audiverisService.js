/**
 * Audiveris OMR integration service.
 * Invokes Audiveris CLI to convert images/PDFs into MusicXML.
 *
 * Prerequisites:
 *   - Java 17+ installed
 *   - Audiveris installed and AUDIVERIS_BIN configured in .env
 *
 * @see https://github.com/Audiveris/audiveris
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { ensureDir, safeRmDir } = require('../utils/fileUtils');
const logger = require('../utils/logger');

/**
 * @typedef {object} AudiverisResult
 * @property {string} musicXmlPath - Path to generated MusicXML file
 * @property {string} outputDir - Working output directory
 * @property {boolean} mock - Whether mock/demo data was used
 */

/**
 * Check whether Audiveris binary is configured and reachable.
 * @returns {{ available: boolean, path: string, message: string }}
 */
function checkAvailability() {
  const bin = config.audiveris.bin;

  if (!bin) {
    return {
      available: false,
      path: '',
      message: 'AUDIVERIS_BIN is not configured. Set it in backend/.env',
    };
  }

  if (!fs.existsSync(bin)) {
    return {
      available: false,
      path: bin,
      message: `Audiveris binary not found at: ${bin}`,
    };
  }

  return { available: true, path: bin, message: 'Audiveris is configured' };
}

/**
 * Run Audiveris in batch mode on an input file.
 * @param {string} inputPath - Path to image or PDF
 * @param {string} jobId - Unique job identifier for output isolation
 * @returns {Promise<AudiverisResult>}
 */
async function runAudiveris(inputPath, jobId) {
  const availability = checkAvailability();

  if (!availability.available) {
    if (config.audiveris.allowMockInDev) {
      logger.warn('Audiveris unavailable — using demo MusicXML', availability.message);
      return generateMockResult(jobId);
    }
    const err = new Error(availability.message);
    err.status = 503;
    err.code = 'AUDIVERIS_UNAVAILABLE';
    throw err;
  }

  const outputDir = path.join(config.paths.outputDir, jobId);
  ensureDir(outputDir);

  const args = [
    '-batch',
    '-export',
    '-output', outputDir,
    inputPath,
  ];

  logger.info('Starting Audiveris OMR', { input: inputPath, outputDir, bin: config.audiveris.bin });

  await executeAudiveris(config.audiveris.bin, args, config.audiveris.timeoutMs);

  const musicXmlPath = findMusicXmlOutput(outputDir, inputPath);

  if (!musicXmlPath) {
    safeRmDir(outputDir);
    const err = new Error('Audiveris completed but no MusicXML output was found');
    err.status = 500;
    err.code = 'OMR_NO_OUTPUT';
    throw err;
  }

  logger.info('Audiveris OMR complete', { musicXmlPath });

  return {
    musicXmlPath,
    outputDir,
    mock: false,
  };
}

/**
 * Spawn Audiveris process with timeout.
 * @param {string} bin
 * @param {string[]} args
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function executeAudiveris(bin, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(Object.assign(new Error(`Audiveris timed out after ${timeoutMs}ms`), {
        status: 504,
        code: 'OMR_TIMEOUT',
      }));
    }, timeoutMs);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(Object.assign(new Error(`Failed to start Audiveris: ${err.message}`), {
        status: 503,
        code: 'OMR_SPAWN_ERROR',
      }));
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      logger.debug('Audiveris exit', { code, stdout: stdout.slice(0, 500), stderr: stderr.slice(0, 500) });

      if (code !== 0) {
        reject(Object.assign(
          new Error(`Audiveris exited with code ${code}: ${stderr || stdout}`),
          { status: 500, code: 'OMR_FAILED' }
        ));
        return;
      }
      resolve();
    });
  });
}

/**
 * Locate MusicXML file in Audiveris output directory.
 * Audiveris may emit .xml, .mxl, or place files in subdirectories.
 * @param {string} outputDir
 * @param {string} inputPath
 * @returns {string|null}
 */
function findMusicXmlOutput(outputDir, inputPath) {
  const candidates = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(xml|mxl|musicxml)$/i.test(entry.name)) {
        candidates.push(fullPath);
      }
    }
  }

  walk(outputDir);

  // Also check alongside input file (Audiveris default behavior)
  const inputBase = path.basename(inputPath, path.extname(inputPath));
  const siblingXml = path.join(path.dirname(inputPath), `${inputBase}.xml`);
  if (fs.existsSync(siblingXml)) {
    candidates.push(siblingXml);
  }

  if (candidates.length === 0) return null;

  // Prefer .xml over .mxl, prefer shortest path (usually root output)
  candidates.sort((a, b) => {
    const extA = path.extname(a) === '.xml' ? 0 : 1;
    const extB = path.extname(b) === '.xml' ? 0 : 1;
    if (extA !== extB) return extA - extB;
    return a.length - b.length;
  });

  return candidates[0];
}

/**
 * Generate a demo MusicXML file for development when Audiveris is not installed.
 * Produces a simple C major scale.
 * @param {string} jobId
 * @returns {Promise<AudiverisResult>}
 */
async function generateMockResult(jobId) {
  const outputDir = path.join(config.paths.outputDir, jobId);
  ensureDir(outputDir);

  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>Demo Scale (Audiveris Mock)</work-title></work>
  <identification><creator type="composer">Tabify Demo</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

  const musicXmlPath = path.join(outputDir, 'demo-output.xml');
  fs.writeFileSync(musicXmlPath, mockXml, 'utf8');

  return { musicXmlPath, outputDir, mock: true };
}

/**
 * Attempt to detect Java runtime (Audiveris dependency).
 * @returns {{ available: boolean, version: string }}
 */
function checkJavaRuntime() {
  try {
    const version = execSync('java -version 2>&1', { encoding: 'utf8' });
    return { available: true, version: version.split('\n')[0] };
  } catch {
    return { available: false, version: '' };
  }
}

module.exports = {
  checkAvailability,
  checkJavaRuntime,
  runAudiveris,
  findMusicXmlOutput,
  generateMockResult,
};
