// Repeatable randomness: typing, reading and sending never reshuffle old notes.
function randomFor(id, channel) {
  let hash = 2166136261;
  for (const char of `${id}:${channel}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

export function wishNoteLayout(id, boardWidth, boardHeight, columns, contentHeight = 84) {
  const width = Math.max(1, boardWidth);
  const cell = width / columns;
  const paperWidth = Math.max(1, Math.min(width - 32, (cell - 20) * (.91 + randomFor(id, 'width') * .13)));
  const paperHeight = Math.min(Math.max(84, contentHeight), Math.max(84, boardHeight - 40));
  // Scatter over a fixed canvas; quantity affects stacking, never board height.
  // Margins accommodate the rotated paper and its shadow without clipping.
  const left = 16 + randomFor(id, 'left') * Math.max(0, width - paperWidth - 32);
  const top = 18 + randomFor(id, 'top') * Math.max(0, boardHeight - paperHeight - 36);
  return {
    left, top, width: paperWidth,
    height: paperHeight,
    angle: (randomFor(id, 'angle') - .5) * 7,
    tone: Math.floor(randomFor(id, 'tone') * 2.999),
    edge: Math.floor(randomFor(id, 'edge') * 2.999),
  };
}
