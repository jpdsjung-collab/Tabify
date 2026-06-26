/**
 * MusicXML parsing service.
 * v0.2 upgrade: returns structured, measure-aware note events rather than
 * plain note names. This is the data foundation for measure bars, rhythm
 * spacing, chord rendering, difficulty analysis, and future capo suggestions.
 */

const path = require('path');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');
const { parsePitchNode } = require('../utils/pitch');
const { readTextFile } = require('../utils/fileUtils');
const logger = require('../utils/logger');

const parser = new xml2js.Parser({
  explicitArray: true,
  mergeAttrs: false,
  trim: true,
});

/**
 * Load MusicXML content from a file path (.xml, .musicxml or .mxl).
 * @param {string} filePath
 * @returns {Promise<string>} Raw XML string
 */
async function loadMusicXmlContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.mxl') {
    return extractXmlFromMxl(filePath);
  }

  return readTextFile(filePath);
}

/**
 * Extract the primary MusicXML file from a compressed MXL archive.
 * @param {string} mxlPath
 * @returns {string}
 */
function extractXmlFromMxl(mxlPath) {
  const zip = new AdmZip(mxlPath);
  const entries = zip.getEntries();

  const containerEntry = entries.find((e) => e.entryName === 'META-INF/container.xml');
  if (containerEntry) {
    const containerXml = containerEntry.getData().toString('utf8');
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (rootfileMatch) {
      const rootEntry = entries.find((e) => e.entryName === rootfileMatch[1]);
      if (rootEntry) return rootEntry.getData().toString('utf8');
    }
  }

  const xmlEntry = entries.find(
    (e) => e.entryName.endsWith('.xml') && !e.entryName.includes('container')
  );

  if (!xmlEntry) throw new Error('No MusicXML content found inside MXL archive');
  return xmlEntry.getData().toString('utf8');
}

/**
 * Parse MusicXML string into structured note/rest events.
 * @param {string} xmlContent
 * @returns {Promise<{ notes: Array, meta: object }>}
 */
async function parseMusicXml(xmlContent) {
  const result = await parser.parseStringPromise(xmlContent);
  const score = result['score-partwise'] || result['score-timewise'];

  if (!score) {
    throw new Error('Invalid MusicXML: missing score-partwise or score-timewise root');
  }

  const parts = normalizeToArray(score.part);
  const notes = [];
  const measureMeta = [];
  let globalIndex = 0;

  const workTitle = score.work?.[0]?.['work-title']?.[0] || score['movement-title']?.[0] || 'Untitled';
  const composer = extractComposer(score);

  let divisions = 1;
  let currentTimeSignature = { beats: 4, beatType: 4 };
  let currentKeySignature = { fifths: 0, mode: null };
  let currentTempo = null;

  for (const part of parts) {
    const measures = normalizeToArray(part.measure);

    for (const measure of measures) {
      const measureNumber = parseInt(measure.$?.number || String(measureMeta.length + 1), 10);
      let position = 0;
      let lastEventStart = 0;

      const attributes = measure.attributes?.[0];
      if (attributes) {
        if (attributes.divisions?.[0]) divisions = parseInt(attributes.divisions[0], 10) || divisions;
        if (attributes.time?.[0]) currentTimeSignature = parseTimeSignature(attributes.time[0], currentTimeSignature);
        if (attributes.key?.[0]) currentKeySignature = parseKeySignature(attributes.key[0], currentKeySignature);
      }

      const measureTempo = extractTempo(measure);
      if (measureTempo) currentTempo = measureTempo;

      const repeats = extractRepeatMarks(measure);
      const events = collectMeasureEvents(measure);
      const measureStartIndex = notes.length;

      for (const event of events) {
        if (event.type === 'backup') {
          position = Math.max(0, position - event.duration);
          continue;
        }

        if (event.type === 'forward') {
          position += event.duration;
          continue;
        }

        if (event.type !== 'note') continue;

        const noteNode = event.node;
        const duration = parseInt(noteNode.duration?.[0] || '0', 10) || 0;
        const isChord = Boolean(noteNode.chord);
        const isRest = Boolean(noteNode.rest);
        const eventStart = isChord ? lastEventStart : position;
        const voice = noteNode.voice?.[0] || '1';
        const staff = noteNode.staff?.[0] || '1';
        const type = noteNode.type?.[0] || durationToType(duration, divisions);
        const accidental = noteNode.accidental?.[0] || null;
        const tieInfo = parseTieInfo(noteNode);
        const slur = hasSlur(noteNode);

        const base = {
          index: globalIndex,
          measure: measureNumber,
          beat: toBeat(eventStart, divisions),
          tick: eventStart,
          duration,
          durationBeats: duration / divisions,
          durationType: type,
          voice,
          staff,
          isChord,
          chord: isChord,
          isRest,
          rest: isRest,
          tieStart: tieInfo.start,
          tieStop: tieInfo.stop,
          slur,
          accidental,
          divisions,
          timeSignature: currentTimeSignature,
          keySignature: currentKeySignature,
          tempo: currentTempo,
        };

        if (isRest) {
          notes.push({
            ...base,
            name: 'rest',
            pitch: null,
            octave: null,
            alter: 0,
            midi: -1,
          });
          globalIndex += 1;
        } else if (noteNode.pitch) {
          const pitch = parsePitchNode(noteNode.pitch[0]);
          notes.push({
            ...base,
            name: pitch.name,
            pitch: pitch.step,
            octave: pitch.octave,
            alter: pitch.alter,
            midi: pitch.midi,
          });
          globalIndex += 1;
        }

        if (!isChord) {
          lastEventStart = eventStart;
          position += duration;
        }
      }

      measureMeta.push({
        number: measureNumber,
        startIndex: measureStartIndex,
        endIndex: notes.length - 1,
        divisions,
        timeSignature: currentTimeSignature,
        keySignature: currentKeySignature,
        tempo: currentTempo,
        repeats,
        durationTicks: position,
      });
    }
  }

  logger.info('Parsed MusicXML', { noteCount: notes.length, title: workTitle });

  return {
    notes,
    meta: {
      title: workTitle,
      composer,
      divisions,
      totalNotes: notes.filter((n) => !n.isRest).length,
      totalEvents: notes.length,
      measures: measureMeta,
      timeSignature: measureMeta[0]?.timeSignature || currentTimeSignature,
      keySignature: measureMeta[0]?.keySignature || currentKeySignature,
      tempo: measureMeta.find((m) => m.tempo)?.tempo || currentTempo,
    },
  };
}

function normalizeToArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractComposer(score) {
  const creators = normalizeToArray(score.identification?.[0]?.creator);
  const composer = creators.find((c) => c.$?.type === 'composer') || creators[0];
  if (!composer) return '';
  return typeof composer === 'string' ? composer : composer._ || '';
}

function parseTimeSignature(timeNode, fallback) {
  const beats = parseInt(timeNode.beats?.[0] || String(fallback.beats), 10);
  const beatType = parseInt(timeNode['beat-type']?.[0] || String(fallback.beatType), 10);
  return { beats, beatType };
}

function parseKeySignature(keyNode, fallback) {
  const fifths = parseInt(keyNode.fifths?.[0] || String(fallback.fifths), 10);
  const mode = keyNode.mode?.[0] || fallback.mode || null;
  return { fifths, mode };
}

function extractTempo(measure) {
  const directions = normalizeToArray(measure.direction);
  for (const direction of directions) {
    const soundTempo = direction.sound?.[0]?.$?.tempo;
    if (soundTempo) return parseFloat(soundTempo);

    const perMinute = direction['direction-type']?.[0]?.metronome?.[0]?.['per-minute']?.[0];
    if (perMinute) return parseFloat(perMinute);
  }
  return null;
}

function extractRepeatMarks(measure) {
  const barlines = normalizeToArray(measure.barline);
  const repeats = [];

  for (const barline of barlines) {
    const repeat = barline.repeat?.[0];
    if (repeat?.$?.direction) repeats.push(repeat.$.direction);
    if (barline.ending?.[0]?.$) {
      repeats.push(`ending-${barline.ending[0].$.number || ''}-${barline.ending[0].$.type || ''}`);
    }
  }

  return repeats;
}

function parseTieInfo(noteNode) {
  const ties = normalizeToArray(noteNode.tie);
  return {
    start: ties.some((t) => t.$?.type === 'start'),
    stop: ties.some((t) => t.$?.type === 'stop'),
  };
}

function hasSlur(noteNode) {
  const notations = normalizeToArray(noteNode.notations);
  return notations.some((notation) => notation.slur);
}

function toBeat(tick, divisions) {
  return Number((tick / divisions + 1).toFixed(3));
}

function durationToType(duration, divisions) {
  if (!duration || !divisions) return 'unknown';
  const beats = duration / divisions;
  if (beats >= 4) return 'whole';
  if (beats >= 2) return 'half';
  if (beats >= 1) return 'quarter';
  if (beats >= 0.5) return 'eighth';
  if (beats >= 0.25) return '16th';
  return 'short';
}

function collectMeasureEvents(measure) {
  const events = [];
  const keys = Object.keys(measure).filter((k) => k !== '$');

  for (const key of keys) {
    const items = normalizeToArray(measure[key]);
    for (const item of items) {
      if (key === 'note') {
        events.push({ type: 'note', node: item, order: events.length });
      } else if (key === 'backup') {
        events.push({ type: 'backup', duration: parseInt(item.duration?.[0] || '0', 10), order: events.length });
      } else if (key === 'forward') {
        events.push({ type: 'forward', duration: parseInt(item.duration?.[0] || '0', 10), order: events.length });
      }
    }
  }

  return events;
}

async function parseMusicXmlFile(filePath) {
  const content = await loadMusicXmlContent(filePath);
  return parseMusicXml(content);
}

module.exports = {
  loadMusicXmlContent,
  parseMusicXml,
  parseMusicXmlFile,
  extractXmlFromMxl,
};
