export function readEntries(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : fallback;
  } catch { return fallback; }
}

export function writeEntries(key, entries) {
  try { localStorage.setItem(key, JSON.stringify(entries)); return true; }
  catch { return false; }
}
