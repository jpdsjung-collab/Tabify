/**
 * Pitch and MIDI utilities for guitar note mapping.
 * Standard tuning: E2 A2 D3 G3 B3 E4 (strings 6→1).
 */

const STEP_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Convert MusicXML step + alter + octave to MIDI note number.
 * @param {string} step - Pitch letter (C–B)
 * @param {number} alter - Sharps (+1) or flats (-1), default 0
 * @param {number} octave - Octave number per MusicXML convention
 * @returns {number} MIDI note number (0–127)
 */
function pitchToMidi(step, alter = 0, octave = 4) {
  const semitone = STEP_TO_SEMITONE[step.toUpperCase()];
  if (semitone === undefined) {
    throw new Error(`Invalid pitch step: ${step}`);
  }
  // MusicXML octave: C4 = MIDI 60
  return (octave + 1) * 12 + semitone + alter;
}

/**
 * Convert MIDI number to display name (e.g. 60 → "C4").
 * @param {number} midi
 * @returns {string}
 */
function midiToName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

/**
 * Parse MusicXML pitch object from xml2js structure.
 * @param {object} pitchNode - pitch[0] from xml2js
 * @returns {{ step: string, alter: number, octave: number, midi: number, name: string }}
 */
function parsePitchNode(pitchNode) {
  const step = pitchNode.step?.[0] || 'C';
  const alter = pitchNode.alter ? parseInt(pitchNode.alter[0], 10) : 0;
  const octave = parseInt(pitchNode.octave?.[0] || '4', 10);
  const midi = pitchToMidi(step, alter, octave);
  return { step, alter, octave, midi, name: midiToName(midi) };
}

/**
 * Parse MusicXML unpitched percussion (not used for guitar but handled gracefully).
 */
function parseUnpitchedNode(unpitchedNode) {
  return {
    step: 'X',
    alter: 0,
    octave: 0,
    midi: 0,
    name: 'Unpitched',
    displayStep: unpitchedNode.displayStep?.[0],
  };
}

module.exports = {
  pitchToMidi,
  midiToName,
  parsePitchNode,
  parseUnpitchedNode,
  STEP_TO_SEMITONE,
};
