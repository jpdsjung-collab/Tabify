/**
 * Guitar fingering service.
 * v0.2 upgrade: generates all possible string/fret positions and chooses the
 * easiest path using beginner-friendly scoring plus previous-position context.
 */

const config = require('../config');
const { midiToName } = require('../utils/pitch');
const logger = require('../utils/logger');

function buildFretboardMap(maxFret = 12) {
  const { tuning } = config.guitar;
  const map = new Map();

  for (const stringInfo of tuning) {
    for (let fret = 0; fret <= maxFret; fret += 1) {
      const midi = stringInfo.midi + fret;
      const entry = {
        string: stringInfo.string,
        fret,
        midi,
        noteName: midiToName(midi),
        playable: true,
      };

      if (!map.has(midi)) map.set(midi, []);
      map.get(midi).push(entry);
    }
  }

  return map;
}

function getModeSettings(mode = 'beginner') {
  if (mode === 'advanced') {
    return { maxFret: 18, preferredMaxFret: 12, openBonus: -2, movementWeight: 1.2 };
  }
  if (mode === 'intermediate') {
    return { maxFret: 12, preferredMaxFret: 9, openBonus: -5, movementWeight: 1.6 };
  }
  return { maxFret: 12, preferredMaxFret: 5, openBonus: -8, movementWeight: 2.2 };
}

function getAllPositions(midi, mode = 'beginner') {
  const settings = getModeSettings(mode);
  const map = buildFretboardMap(settings.maxFret);
  return map.get(midi) || [];
}

function scorePosition(pos, previous = null, mode = 'beginner') {
  const settings = getModeSettings(mode);
  let score = 0;

  if (pos.fret === 0) score += settings.openBonus;
  score += pos.fret * 1.4;

  if (pos.fret > settings.preferredMaxFret) {
    score += (pos.fret - settings.preferredMaxFret) * 4;
  }

  // Melody-friendly beginner preference: high strings are easy to read and play.
  score += Math.abs(pos.string - 2) * 0.45;

  if (previous && previous.playable) {
    score += Math.abs(pos.fret - previous.fret) * settings.movementWeight;
    score += Math.abs(pos.string - previous.string) * 0.8;

    // Staying in nearby hand position is usually easier for beginners.
    const prevPosition = previous.fret === 0 ? 0 : Math.floor((previous.fret - 1) / 4);
    const currentPosition = pos.fret === 0 ? 0 : Math.floor((pos.fret - 1) / 4);
    if (prevPosition !== currentPosition) score += 3;
  }

  return score;
}

function findBestPosition(midi, previous = null, mode = 'beginner') {
  const candidates = getAllPositions(midi, mode);

  if (candidates.length > 0) {
    return [...candidates].sort(
      (a, b) => scorePosition(a, previous, mode) - scorePosition(b, previous, mode)
    )[0];
  }

  logger.warn('No fingering found for MIDI note', { midi, name: midiToName(midi) });
  return {
    string: null,
    fret: null,
    midi,
    noteName: midiToName(midi),
    playable: false,
    hint: 'Note out of standard guitar range',
  };
}

function convertNotesToFingering(notes, options = {}) {
  const mode = options.mode || 'beginner';
  let previousPlayable = null;

  return notes.map((note) => {
    if (note.isRest || note.midi < 0) {
      return {
        ...note,
        fingering: {
          string: null,
          fret: null,
          midi: -1,
          noteName: 'rest',
          playable: false,
          hint: 'Rest',
        },
      };
    }

    const fingering = findBestPosition(note.midi, previousPlayable, mode);
    if (fingering.playable) previousPlayable = fingering;

    return { ...note, fingering };
  });
}

module.exports = {
  findBestPosition,
  convertNotesToFingering,
  buildFretboardMap,
  getAllPositions,
  scorePosition,
};
