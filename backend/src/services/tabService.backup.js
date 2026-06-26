const STRING_LABELS = {
1: 'e|',
2: 'B|',
3: 'G|',
4: 'D|',
5: 'A|',
6: 'E|',
};

const BASE_CELL_WIDTH = 3;

function getDurationUnits(note) {
const duration = Number(note.duration || note.durationValue || 1);

if (!Number.isFinite(duration) || duration <= 0) {
return 1;
}

return Math.max(1, Math.round(duration));
}

function formatFretCell(fret, width) {
const fretText = String(fret);

if (fret === 0) {
return '0' + '-'.repeat(Math.max(0, width - 1));
}

if (fretText.length >= width) {
return fretText;
}

const left = Math.floor((width - fretText.length) / 2);
const right = width - fretText.length - left;

return '-'.repeat(left) + fretText + '-'.repeat(right);
}

function emptyCell(width) {
return '-'.repeat(width);
}

function generateTab(notesWithFingering, meta = {}) {
const lines = {};

for (let stringNumber = 1; stringNumber <= 6; stringNumber++) {
lines[stringNumber] = STRING_LABELS[stringNumber];
}

const legend = [];
let currentMeasure = null;

notesWithFingering.forEach((note) => {
const measure = note.measure || 1;
const durationUnits = getDurationUnits(note);
const width = BASE_CELL_WIDTH * durationUnits;

```
if (currentMeasure !== null && measure !== currentMeasure) {
  for (let stringNumber = 1; stringNumber <= 6; stringNumber++) {
    lines[stringNumber] += '|';
  }
}

currentMeasure = measure;

const fingering = note.fingering || note;

for (let stringNumber = 1; stringNumber <= 6; stringNumber++) {
  if (
    fingering &&
    fingering.playable !== false &&
    fingering.string === stringNumber &&
    fingering.fret !== undefined
  ) {
    lines[stringNumber] += formatFretCell(fingering.fret, width);
  } else {
    lines[stringNumber] += emptyCell(width);
  }
}

if (
  !note.isRest &&
  fingering &&
  fingering.playable !== false &&
  fingering.string &&
  fingering.fret !== undefined
) {
  const fretLabel = fingering.fret === 0 ? 'open' : 'fret ' + fingering.fret;

  legend.push(
    legend.length + 1 +
      '. ' +
      note.name +
      ' → string ' +
      fingering.string +
      ' (' +
      fretLabel +
      ', duration ' +
      durationUnits +
      ')'
  );
}
```

});

for (let stringNumber = 1; stringNumber <= 6; stringNumber++) {
lines[stringNumber] += '|';
}

const orderedLines = [1, 2, 3, 4, 5, 6].map((stringNumber) => {
return lines[stringNumber];
});

const header = buildHeader(meta);

const legendBlock =
legend.length > 0
? '\n\n/* Fingering Guide */\n' + legend.join('\n')
: '';

return {
ascii: header + '\n' + orderedLines.join('\n') + legendBlock,
lines: orderedLines,
legend,
meta: {
title: meta.title || 'Untitled',
composer: meta.composer || '',
noteCount: notesWithFingering.length,
difficulty: meta.difficulty || null,
rhythmAware: true,
measureAware: true,
},
fingering: notesWithFingering,
};
}

function buildHeader(meta) {
const title = meta.title || 'Untitled';
const composer = meta.composer ? ' — ' + meta.composer : '';
const date = new Date().toISOString().split('T')[0];

const header = [
'/* Tabify — Beginner Guitar TAB */',
'/* Measure-aware rendering: ON */',
'/* Rhythm-aware spacing: ON */',
'/* ' + title + composer + ' */',
];

if (meta.difficulty && meta.difficulty.stars) {
header.push(
'/* Difficulty: ' +
'★'.repeat(meta.difficulty.stars) +
'☆'.repeat(5 - meta.difficulty.stars) +
' */'
);
}

header.push('/* Generated: ' + date + ' */');
header.push('');

return header.join('\n');
}

module.exports = {
generateTab,
formatFretCell,
STRING_LABELS,
BASE_CELL_WIDTH,
};

