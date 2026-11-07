export const ease = [.22, 1, .36, 1];
export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced() ? 'instant' : 'smooth', block: 'start' });
}
