import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { ease, prefersReduced } from '../lib/motion';

const PresentationContext = createContext({ compact: false, reduced: false, mode: 'scroll', ready: true });
export const usePresentation = () => useContext(PresentationContext);

export function PresentationProvider({ ready, children }) {
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 700px)').matches);
  const [reduced, setReduced] = useState(prefersReduced);
  useEffect(() => {
    const query = matchMedia('(max-width: 700px)');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCompact(query.matches);
    const updateMotion = () => setReduced(motionQuery.matches);
    query.addEventListener('change', update);
    motionQuery.addEventListener('change', updateMotion);
    return () => { query.removeEventListener('change', update); motionQuery.removeEventListener('change', updateMotion); };
  }, []);
  useEffect(() => {
    // The requested anchor may not exist until React mounts. Respect native
    // Back restoration; reload fragments are already cleared by index.html.
    if (!location.hash || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    let cancelled = false, frame;
    const stop = () => { cancelled = true; cancelAnimationFrame(frame); };
    const align = () => {
      if (cancelled) return;
      const target = document.getElementById(id);
      if (!target) return;
      const schedule = target.classList.contains('date-panel') && target.closest('.dates-film');
      if (schedule && !matchMedia('(max-width: 700px)').matches && !prefersReduced()) {
        const panels = [...schedule.querySelectorAll('.date-panel')];
        const fraction = (panels.indexOf(target) + .5) / panels.length;
        window.scrollTo({ top: schedule.getBoundingClientRect().top + scrollY + Math.max(0, schedule.offsetHeight - innerHeight) * fraction, behavior: 'instant' });
      } else target.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    const gestures = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    gestures.forEach(type => window.addEventListener(type, stop, { passive: true, once: true }));
    frame = requestAnimationFrame(align);
    document.fonts.ready.then(() => { if (!cancelled) frame = requestAnimationFrame(align); });
    return () => { stop(); gestures.forEach(type => window.removeEventListener(type, stop)); };
  }, []);
  const mode = reduced ? 'static' : compact ? 'enter' : 'scroll';
  return <PresentationContext.Provider value={{ compact, reduced, mode, ready }}>{children}</PresentationContext.Provider>;
}

// A scene owns one short entrance, independently of how far the guest scrolls.
// Leaving/skipping a scene settles it; reversing never hides readable content.
export function useEntrance(ref, { duration = .9, enabled = true } = {}) {
  const { compact, mode, ready } = usePresentation();
  const entranceProgress = useMotionValue(mode === 'static' ? 1 : 0);
  const played = useRef(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.dataset.sceneMode = mode;
    let animation, observer, frame;
    const stopWatching = () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
    const finish = () => {
      animation?.stop();
      played.current = true;
      entranceProgress.set(1);
      element.dataset.enterState = 'done';
      stopWatching();
    };
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        // IntersectionObserver alone misses a jump from entirely below to
        // entirely above the viewport (both intersections are zero).
        if (rect.bottom <= 66 || (played.current && rect.top >= innerHeight)) finish();
      });
    }
    if (mode === 'static' || !enabled) { finish(); return; }
    if (!compact) { entranceProgress.set(1); return; }
    if (played.current) { finish(); return; }
    entranceProgress.set(0);
    element.dataset.enterState = 'waiting';
    if (!ready) return;
    if (element.getBoundingClientRect().bottom <= 66) { finish(); return; }
    const threshold = Math.min(.35, Math.max(.05, (innerHeight - 66) / element.offsetHeight * .8));
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.boundingClientRect.bottom <= 66 || (played.current && !entry.isIntersecting)) {
          finish();
        } else if (!played.current && entry.intersectionRatio >= threshold) {
          played.current = true;
          element.dataset.enterState = 'running';
          animation = animate(entranceProgress, 1, {
            duration: Math.min(1.2, duration), ease,
            onComplete: () => { element.dataset.enterState = 'done'; stopWatching(); },
          });
        }
      }
    }, { threshold: [0, threshold], rootMargin: '-66px 0px 0px 0px' });
    observer.observe(element);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { stopWatching(); animation?.stop(); };
  }, [compact, mode, ready, enabled, duration, entranceProgress, ref]);
  return entranceProgress;
}

// A short, overdamped follow-through smooths wheel/touch steps without bounce.
// Large jumps (anchors, PageDown, restoration) land immediately at the right scene.
export function useSoftScroll(source, jumpDistance = .35, restDelta = .0001) {
  const reduced = useReducedMotion();
  const { compact } = usePresentation();
  const previous = useRef(source.get());
  const soft = useSpring(source, { stiffness: compact ? 240 : 300, damping: 32, mass: .6, restDelta, restSpeed: restDelta * 10 });
  useMotionValueEvent(source, 'change', value => {
    if (reduced || Math.abs(value - previous.current) > jumpDistance) soft.jump(value);
    previous.current = value;
  });
  return reduced ? source : soft;
}

export function useScene(options) {
  const ref = useRef(null);
  const { compact, reduced, mode } = usePresentation();
  const entranceProgress = useEntrance(ref, options);
  const { scrollYProgress: rawProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSoftScroll(rawProgress);
  return { ref, progress, rawProgress, entranceProgress, reduced, compact, mode };
}

export function seekScene(ref, fraction) {
  const el = ref.current;
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + Math.max(0, el.offsetHeight - innerHeight) * Math.max(0, Math.min(1, fraction)), behavior: prefersReduced() ? 'instant' : 'smooth' });
}

export function SceneHUD({ number, label, progress, children, style }) {
  const { compact } = usePresentation();
  const next = event => {
    const current = event.currentTarget.closest('.film-scene');
    const scenes = [...document.querySelectorAll('.film-scene, #wishes, #closing')];
    scenes[scenes.indexOf(current) + 1]?.scrollIntoView({ behavior: prefersReduced() ? 'instant' : 'smooth', block: 'start' });
  };
  return <motion.div className="scene-hud" style={style}><div><span>{number}</span><span className="hud-rule" /><span>{label}</span></div>{children || (compact ? <button className="hud-scroll" onClick={next}>TIẾP TỤC <ArrowDown size={13} /></button> : <span className="hud-scroll">TIẾP TỤC CÂU CHUYỆN <ArrowDown size={13} /></span>)}{!compact && <div className="scene-progress"><motion.i style={{ scaleX: progress }} /></div>}</motion.div>;
}
