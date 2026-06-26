/**
 * Difficulty analysis service.
 * Produces a simple 1–5 star beginner difficulty score with reasons.
 */

function analyzeDifficulty(notesWithFingering) {
  const playable = notesWithFingering.filter((n) => !n.isRest && n.fingering?.playable);
  if (playable.length === 0) {
    return { stars: 1, label: 'Easy', reasons: ['No difficult playable notes detected'] };
  }

  const highFrets = playable.filter((n) => n.fingering.fret > 5).length;
  const veryHighFrets = playable.filter((n) => n.fingering.fret > 9).length;
  const openStrings = playable.filter((n) => n.fingering.fret === 0).length;
  let largeShifts = 0;
  let maxShift = 0;

  for (let i = 1; i < playable.length; i += 1) {
    const prev = playable[i - 1].fingering;
    const current = playable[i].fingering;
    const shift = Math.abs(current.fret - prev.fret) + Math.abs(current.string - prev.string);
    maxShift = Math.max(maxShift, shift);
    if (shift >= 5) largeShifts += 1;
  }

  let points = 1;
  if (highFrets / playable.length > 0.2) points += 1;
  if (veryHighFrets > 0) points += 1;
  if (largeShifts >= 3 || maxShift >= 8) points += 1;
  if (openStrings / playable.length < 0.1 && playable.length > 12) points += 1;

  const stars = Math.min(5, Math.max(1, points));
  const labels = ['Easy', 'Easy', 'Medium', 'Hard', 'Very hard'];
  const reasons = [];

  if (highFrets > 0) reasons.push(`${highFrets} notes above fret 5`);
  if (veryHighFrets > 0) reasons.push(`${veryHighFrets} notes above fret 9`);
  if (largeShifts > 0) reasons.push(`${largeShifts} larger hand shifts`);
  if (openStrings > 0) reasons.push(`${openStrings} open-string notes make it easier`);
  if (reasons.length === 0) reasons.push('Mostly first-position notes with small movements');

  return {
    stars,
    label: labels[stars - 1],
    reasons,
  };
}

module.exports = { analyzeDifficulty };
