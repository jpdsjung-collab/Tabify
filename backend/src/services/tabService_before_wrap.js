const STRING_LABELS = {
  1: 'e|',
  2: 'B|',
  3: 'G|',
  4: 'D|',
  5: 'A|',
  6: 'E|',
};

const COLUMN_WIDTH = 3;

function formatFretCell(fret) {
  if (fret === 0) {
    return '0--';
  }

  const str = String(fret);

  if (str.length === 1) {
    return '-' + str + '-';
  }

  return str + '-';
}

function emptyCell() {
  return '---';
}

function generateTab(notesWithFingering, meta = {}) {
  const lines = {};

  for (let s = 1; s <= 6; s++) {
    lines[s] = STRING_LABELS[s];
  }

  const legend = [];
  let currentMeasure = null;

  notesWithFingering.forEach((note) => {
    const measure = note.measure || 1;

    if (currentMeasure !== null && measure !== currentMeasure) {
      for (let s = 1; s <= 6; s++) {
        lines[s] += '|';
      }
    }

    currentMeasure = measure;

    const fingering = note.fingering;

    for (let s = 1; s <= 6; s++) {
      if (fingering && fingering.playable && fingering.string === s) {
        lines[s] += formatFretCell(fingering.fret);
      } else {
        lines[s] += emptyCell();
      }
    }

    if (!note.isRest && fingering && fingering.playable) {
      const fretLabel = fingering.fret === 0 ? 'open' : 'fret ' + fingering.fret;
      const legendEntry =
        legend.length +
        1 +
        '. ' +
        note.name +
        ' → string ' +
        fingering.string +
        ' (' +
        fretLabel +
        ')';

      legend.push(legendEntry);
    }
  });

  for (let s = 1; s <= 6; s++) {
    lines[s] += '|';
  }

  const orderedLines = [1, 2, 3, 4, 5, 6].map((s) => lines[s]);
  const header = buildHeader(meta);

  let legendBlock = '';
  if (legend.length > 0) {
    legendBlock = '\n\n/* Fingering Guide */\n' + legend.join('\n');
  }

  return {
    ascii: header + '\n' + orderedLines.join('\n') + legendBlock,
    lines: orderedLines,
    legend,
    meta: {
      title: meta.title || 'Untitled',
      composer: meta.composer || '',
      noteCount: notesWithFingering.length,
      difficulty: meta.difficulty || null,
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
  COLUMN_WIDTH,
};
