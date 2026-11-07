const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Sample once when the SVG changes. Animation frames only interpolate this
// table, rather than repeatedly asking the browser to measure the whole path.
export function createThreadTrack(path) {
  const total = path.getTotalLength();
  const cache = new Map();
  const at = length => {
    if (cache.has(length)) return cache.get(length);
    const { x, y } = path.getPointAtLength(length);
    const point = { length, x, y };
    cache.set(length, point);
    return point;
  };
  const points = [at(0)];
  const subdivide = (from, to, depth) => {
    let error = 0;
    for (const fraction of [.25, .5, .75]) {
      const point = at(from.length + (to.length - from.length) * fraction);
      error = Math.max(error, Math.hypot(point.x - from.x - (to.x - from.x) * fraction, point.y - from.y - (to.y - from.y) * fraction));
    }
    if (error > .3 && depth < 12) {
      const middle = at((from.length + to.length) / 2);
      subdivide(from, middle, depth + 1);
      subdivide(middle, to, depth + 1);
    } else points.push(to);
  };
  // Long straight stretches need few points; spend detail on the bends.
  for (let i = 0; i < 32; i++) subdivide(at(total * i / 32), at(total * (i + 1) / 32), 0);
  points.forEach((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const left = Math.max(.001, point.length - before.length), right = Math.max(.001, after.length - point.length);
    const dx = (point.x - before.x) / left + (after.x - point.x) / right;
    const dy = (point.y - before.y) / left + (after.y - point.y) / right;
    const magnitude = Math.hypot(dx, dy) || 1;
    point.dx = dx / magnitude;
    point.dy = dy / magnitude;
  });
  return { total, points };
}

export function sampleThreadTrack(track, distance) {
  if (!track?.points?.length || !track.total) return { x: 0, y: 0, dx: 0, dy: 1 };
  const travel = clamp(distance, 0, track.total);
  let low = 0, high = track.points.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (track.points[middle].length <= travel) low = middle;
    else high = middle;
  }
  const from = track.points[low], to = track.points[high];
  const amount = (travel - from.length) / Math.max(.001, to.length - from.length);
  const mix = key => from[key] + (to[key] - from[key]) * amount;
  return { x: mix('x'), y: mix('y'), dx: mix('dx'), dy: mix('dy') };
}
