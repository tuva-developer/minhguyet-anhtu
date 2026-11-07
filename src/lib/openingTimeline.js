// One clock drives the curtain, names and camera, including the skip action.
export const OPENING_TIMELINE = { duration: 2.05, skipDuration: .45, curtainEnd: .84, namesStart: .035, namesEnd: .86 };
export const interval = (value, start, end) => Math.max(0, Math.min(1, (value - start) / (end - start)));
export const smoothOpening = value => value * value * value * (value * (value * 6 - 15) + 10);
