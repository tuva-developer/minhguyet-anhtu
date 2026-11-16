import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { prefersReduced } from '../lib/motion';

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
  const mode = reduced ? 'static' : 'scroll';
  return <PresentationContext.Provider value={{ compact, reduced, mode, ready }}>{children}</PresentationContext.Provider>;
}

// The scroll clock stays separate from entry animation, including scenes which
// keep a traveling photo while their copy reveals itself independently.
export function useSceneProgress(ref, { offset, mobileOffset = ['start 0.9', 'start 0.15'], desktopMode = 'scroll', mobileMode = 'scroll' } = {}) {
  const { compact, reduced, ready } = usePresentation();
  const mode = reduced ? 'static' : compact ? mobileMode : desktopMode;
  const { scrollYProgress: rawProgress } = useScroll({
    target: ref,
    offset: offset || (compact ? mobileOffset : ['start start', 'end end']),
  });
  const soft = useSoftScroll(rawProgress);
  const progress = useTransform(soft, value => reduced ? 1 : ready ? value : 0);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.dataset.sceneMode = mode;
  }, [mode, ref]);
  return { progress, rawProgress, mode };
}

// One timed entrance per mounted group. Observe the actual artwork/text, rather
// than an entire long section; scrolling past a group finishes it immediately.
export function useEnterProgress(ref, { duration = .8, delay = 0, immediate = false } = {}) {
  const { reduced, ready } = usePresentation();
  const progress = useMotionValue(reduced || immediate ? 1 : 0);
  const state = useRef('pending');
  const animation = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || immediate || state.current !== 'pending') {
      animation.current?.stop(); progress.set(1);
      state.current = el.dataset.enterState = 'complete';
      return;
    }
    el.dataset.enterState = 'pending';
    if (!ready) return;
    let observer, frame = 0, disposed = false;
    const stopWatching = () => {
      observer?.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      el.removeEventListener('focusin', finish);
      el.removeEventListener('pointerdown', finish);
    };
    const finish = () => {
      animation.current?.stop(); animation.current = null;
      progress.set(1); state.current = el.dataset.enterState = 'complete';
      stopWatching();
    };
    const check = () => {
      frame = 0;
      if (disposed || state.current === 'complete') return;
      const rect = el.getBoundingClientRect(), height = window.innerHeight;
      if (rect.bottom <= 0 || (state.current === 'running' && rect.top >= height)) { finish(); return; }
      if (state.current === 'pending' && rect.top < height * .8) {
        state.current = el.dataset.enterState = 'running';
        animation.current = animate(progress, 1, { duration, delay, ease: [.45, 0, .55, 1], onComplete: finish });
      }
    };
    function schedule() { if (!frame) frame = requestAnimationFrame(check); }
    observer = new IntersectionObserver(schedule, { rootMargin: '0px 0px -20% 0px' });
    observer.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    el.addEventListener('focusin', finish);
    el.addEventListener('pointerdown', finish, { passive: true });
    schedule();
    document.fonts.ready.then(() => { if (!disposed && state.current !== 'complete') schedule(); });
    return () => { disposed = true; stopWatching(); animation.current?.stop(); animation.current = null; };
  }, [ref, progress, duration, delay, immediate, reduced, ready]);
  return progress;
}

// A short, overdamped follow-through smooths wheel/touch steps without bounce.
// Large jumps (anchors, PageDown, restoration) land immediately at the right scene.
export function useSoftScroll(source, jumpDistance = .35, restDelta = .0001) {
  const { compact, reduced } = usePresentation();
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
  const presentation = usePresentation();
  return { ref, ...presentation, ...useSceneProgress(ref, options) };
}

export function seekScene(ref, fraction) {
  const el = ref.current;
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + Math.max(0, el.offsetHeight - innerHeight) * Math.max(0, Math.min(1, fraction)), behavior: prefersReduced() ? 'instant' : 'smooth' });
}

export function SceneHUD({ number, label, progress, children, style, showProgress = true }) {
  const { compact } = usePresentation();
  const next = event => {
    const current = event.currentTarget.closest('.film-scene');
    const scenes = [...document.querySelectorAll('.film-scene, #wishes, #closing')];
    scenes[scenes.indexOf(current) + 1]?.scrollIntoView({ behavior: prefersReduced() ? 'instant' : 'smooth', block: 'start' });
  };
  return <motion.div className="scene-hud" style={style}><div><span>{number}</span><span className="hud-rule" /><span>{label}</span></div>{children || <button type="button" className="hud-scroll" onClick={next}>{compact ? 'TIẾP TỤC' : 'TIẾP TỤC CÂU CHUYỆN'} <ArrowDown size={13} /></button>}{!compact && showProgress && <div className="scene-progress"><motion.i style={{ scaleX: progress }} /></div>}</motion.div>;
}
