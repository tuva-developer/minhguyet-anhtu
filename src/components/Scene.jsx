import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { prefersReduced } from '../lib/motion';

// A short, overdamped follow-through smooths wheel/touch steps without bounce.
// Large jumps (anchors, PageDown, restoration) land immediately at the right scene.
export function useSoftScroll(source, jumpDistance = .35, restDelta = .0001) {
  const reduced = useReducedMotion();
  const previous = useRef(source.get());
  const soft = useSpring(source, { stiffness: 240, damping: 32, mass: .6, restDelta, restSpeed: restDelta * 10 });
  useMotionValueEvent(source, 'change', value => {
    if (reduced || Math.abs(value - previous.current) > jumpDistance) soft.jump(value);
    previous.current = value;
  });
  return reduced ? source : soft;
}

export function useScene() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  useEffect(() => {
    const query = matchMedia('(max-width: 700px)');
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  const { scrollYProgress: rawProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSoftScroll(rawProgress);
  return { ref, progress, rawProgress, reduced, compact };
}

export function seekScene(ref, fraction) {
  const el = ref.current;
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + Math.max(0, el.offsetHeight - innerHeight) * Math.max(0, Math.min(1, fraction)), behavior: prefersReduced() ? 'instant' : 'smooth' });
}

export function SceneHUD({ number, label, progress, children, style }) {
  return <motion.div className="scene-hud" style={style}><div><span>{number}</span><span className="hud-rule" /><span>{label}</span></div>{children || <span className="hud-scroll">TIẾP TỤC CÂU CHUYỆN <ArrowDown size={13} /></span>}<div className="scene-progress"><motion.i style={{ scaleX: progress }} /></div></motion.div>;
}
