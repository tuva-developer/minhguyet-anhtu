import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useMedia } from './Media';
import { ease, prefersReduced } from '../lib/motion';
import { interval, OPENING_TIMELINE, smoothOpening } from '../lib/openingTimeline';
import ThreadCat from './ThreadCat';
import { createThreadTrack } from '../lib/threadTrack';

const THREAD = 'M -40 140 C 100 140 202 110 275 144 C 300 158 330 190 400 238 C 400 238 515 168 516 112 C 518 60 452 40 400 100 C 348 40 282 60 284 112 C 286 168 400 238 400 238 C 478 180 558 128 840 140';
const TIMING = { draw: 1.95, hold: 2700, deadline: 3700 };

export function shouldPlayOpening() {
  const navigation = performance.getEntriesByType('navigation')[0];
  return !prefersReduced() && !location.hash && scrollY < 80 && navigation?.type !== 'back_forward';
}

export default function OpeningSequence({ progress, onComplete, onReveal }) {
  const { cover } = useMedia();
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const path = useRef(null);
  const length = useRef(0);
  const [catTrack, setCatTrack] = useState(null);
  const root = useRef(null);
  const button = useRef(null);
  const restoreFocus = useRef(false);
  const started = useRef(performance.now());
  const draw = useMotionValue(0);
  const point = useTransform(draw, progress => path.current?.getPointAtLength(progress * length.current) || { x: -40, y: 140 });
  const tipX = useTransform(point, p => p.x);
  const tipY = useTransform(point, p => p.y);
  const tipOpacity = useTransform(draw, [0, .03, .95, 1], [0, 1, 1, 0]);
  const catDistance = useTransform(draw, value => value * length.current);
  const curtain = useTransform(progress, value => smoothOpening(interval(value, 0, OPENING_TIMELINE.curtainEnd)));
  const leftX = useTransform(curtain, value => `${value * -105}%`);
  const rightX = useTransform(curtain, value => `${value * 105}%`);
  const gather = useTransform(curtain, value => 1 - value * .22);
  const overlayOpacity = useTransform(progress, [.86, 1], [1, 0]);
  const contentOpacity = useTransform(progress, [0, .14], [1, 0]);
  const reveal = useCallback((skip = false) => { setOpening(true); onReveal?.(skip); }, [onReveal]);
  const skip = useCallback(() => { restoreFocus.current = true; reveal(true); }, [reveal]);

  useLayoutEffect(() => {
    if (!path.current) return;
    const track = createThreadTrack(path.current);
    length.current = track.total;
    setCatTrack(track);
  }, []);
  useEffect(() => {
    if (reduced) { onComplete(); return; }
    draw.set(0);
    const animation = animate(draw, 1, { delay: .15, duration: TIMING.draw, ease: [.65, 0, .35, 1] });
    return () => animation.stop();
  }, [draw, reduced, onComplete]);

  // Decode the actual responsive cover already loading underneath. Readiness
  // never blocks the invitation indefinitely, including offline/broken images.
  useEffect(() => {
    let disposed = false;
    const timers = [];
    const wait = ms => new Promise(resolve => timers.push(setTimeout(resolve, ms)));
    const image = document.querySelector('.travel-cover-layer .cinema-subject, #home .cinema-subject');
    const ready = image?.decode ? image.decode().catch(() => {}) : Promise.resolve();
    const elapsed = performance.now() - started.current;
    Promise.all([wait(Math.max(0, TIMING.hold - elapsed)), Promise.race([ready, wait(Math.max(0, TIMING.deadline - elapsed))])]).then(() => { if (!disposed) reveal(); });
    return () => { disposed = true; timers.forEach(clearTimeout); };
  }, [cover?.src, reveal]);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const gap = Math.max(0, innerWidth - document.documentElement.clientWidth);
    if (gap) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
    document.body.style.overflow = 'hidden';
    root.current?.focus({ preventScroll: true });
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); skip(); }
      if (event.key === 'Tab') { event.preventDefault(); button.current?.focus({ preventScroll: true }); }
    };
    // Anchors/restored positions should never be covered by an opening scene.
    const scroll = () => { if (scrollY > 80) onComplete(); };
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      window.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll);
      if (restoreFocus.current) requestAnimationFrame(() => {
        const target = previous?.isConnected && previous !== document.body ? previous : document.querySelector('.cinema-quick-date');
        target?.focus({ preventScroll: true });
      });
    };
  }, [onComplete, skip]);

  return <motion.div ref={root} className="opening-intro" role="dialog" aria-modal="true" aria-label="Mở thiệp cưới" tabIndex={-1}
    data-phase={opening ? 'opening' : 'drawing'}
    style={{ opacity: overlayOpacity }}>
    <motion.div className="intro-paper intro-paper-left" aria-hidden="true" initial={false}
      style={{ x: leftX, scaleX: gather }} />
    <motion.div className="intro-paper intro-paper-right" aria-hidden="true" initial={false}
      style={{ x: rightX, scaleX: gather }} />
    <motion.div className="intro-content" style={{ opacity: contentOpacity }}>
      <motion.span className="intro-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15, duration: .6 }}>CÓ MỘT SỢI DUYÊN</motion.span>
      <svg className="intro-thread" viewBox="0 0 800 270" aria-hidden="true">
        <motion.path ref={path} d={THREAD} style={{ pathLength: draw }} />
        <motion.circle r="3.5" style={{ cx: tipX, cy: tipY, opacity: tipOpacity }} />
        <motion.foreignObject className="intro-cat-layer" x="0" y="0" width="800" height="270" style={{ opacity: tipOpacity }}>
          <ThreadCat className="intro-thread-cat" distance={catDistance} track={catTrack} width={800} size={innerWidth <= 700 ? 160 : 112} keepInBounds={false} />
        </motion.foreignObject>
      </svg>
      <motion.p className="intro-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .65, duration: 1, ease }}>Chuyện mình,<br /><em>bắt đầu từ đây.</em></motion.p>
      <motion.span className="intro-caption" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: .85 }}>Mời bạn mở một ngày thật đẹp.</motion.span>
    </motion.div>
    <motion.div className="intro-bottom" animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: .15 }}>
      <span>26.12.2026 — 30.01.2027</span>
      <button ref={button} onClick={skip} disabled={opening} aria-label="Bỏ qua hiệu ứng mở đầu">Mở thiệp ngay <ArrowUpRight size={16} /></button>
    </motion.div>
  </motion.div>;
}
