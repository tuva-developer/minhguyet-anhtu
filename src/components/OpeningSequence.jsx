import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useMedia } from './Media';
import { prefersReduced } from '../lib/motion';
import { interval, OPENING_TIMELINE, smoothOpening } from '../lib/openingTimeline';
import { story } from '../data/story';
import { usePresentation } from './Scene';

const THREAD = 'M -40 140 C 100 140 202 110 275 144 C 300 158 330 190 400 238 C 400 238 515 168 516 112 C 518 60 452 40 400 100 C 348 40 282 60 284 112 C 286 168 400 238 400 238 C 478 180 558 128 840 140';
const TIMING = { draw: 1.95, hold: 2700, deadline: 3700, fontWait: 950 };
const titleHidden = row => ({ opacity: 0, x: row ? 30 : -30, y: 32, rotate: row ? 1 : -1 });
const titleVisible = { opacity: 1, x: 0, y: 0, rotate: 0 };

export function shouldPlayOpening() {
  const navigation = performance.getEntriesByType('navigation')[0];
  return !prefersReduced() && !location.hash && scrollY < 80 && navigation?.type !== 'back_forward';
}

export default function OpeningSequence({ progress, onComplete, onReveal }) {
  const { cover } = useMedia();
  const { reduced } = usePresentation();
  const [fontState, setFontState] = useState('pending');
  const [opening, setOpening] = useState(false);
  const path = useRef(null);
  const length = useRef(0);
  const root = useRef(null);
  const button = useRef(null);
  const restoreFocus = useRef(false);
  const started = useRef(performance.now());
  const draw = useMotionValue(0);
  const point = useTransform(draw, progress => path.current?.getPointAtLength(progress * length.current) || { x: -40, y: 140 });
  const tipX = useTransform(point, p => p.x);
  const tipY = useTransform(point, p => p.y);
  const tipOpacity = useTransform(draw, [0, .03, .95, 1], [0, 1, 1, 0]);
  const curtain = useTransform(progress, value => smoothOpening(interval(value, 0, OPENING_TIMELINE.curtainEnd)));
  const leftX = useTransform(curtain, value => `${value * -105}%`);
  const rightX = useTransform(curtain, value => `${value * 105}%`);
  const gather = useTransform(curtain, value => 1 - value * .22);
  const overlayOpacity = useTransform(progress, [.86, 1], [1, 0]);
  const contentOpacity = useTransform(progress, [0, .14], [1, 0]);
  const reveal = useCallback((skip = false) => { setOpening(true); onReveal?.(skip); }, [onReveal]);
  const skip = useCallback(() => { restoreFocus.current = true; reveal(true); }, [reveal]);

  useEffect(() => {
    let disposed = false, timeout;
    const serif = getComputedStyle(document.documentElement).getPropertyValue('--serif').split(',')[0].trim();
    const fonts = document.fonts && serif ? Promise.all([
      document.fonts.load(`500 64px ${serif}`, story.opening.title[0]),
      document.fonts.load(`italic 400 56px ${serif}`, story.opening.title[1]),
    ]).then(faces => faces.every(face => face.length) ? 'ready' : 'fallback').catch(() => 'fallback') : Promise.resolve('fallback');
    Promise.race([fonts, new Promise(resolve => { timeout = setTimeout(() => resolve('fallback'), TIMING.fontWait); })])
      .then(state => { if (!disposed) setFontState(state); clearTimeout(timeout); });
    return () => { disposed = true; clearTimeout(timeout); };
  }, []);

  useLayoutEffect(() => {
    if (!path.current) return;
    length.current = path.current.getTotalLength();
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
      <svg className="intro-thread" viewBox="0 0 800 270" aria-hidden="true">
        <motion.path ref={path} d={THREAD} style={{ pathLength: draw }} />
        <motion.circle r="3.5" style={{ cx: tipX, cy: tipY, opacity: tipOpacity }} />
      </svg>
      <p className={`intro-title ${fontState === 'ready' ? '' : 'uses-fallback'}`} data-font-state={fontState}>
        {story.opening.title.map((line, row) => <span className="intro-title-line" key={line}>
          <motion.span className="intro-line-text" initial={titleHidden(row)} animate={fontState === 'pending' ? titleHidden(row) : titleVisible}
            transition={{ delay: row * .22, duration: 1, ease: [.25, .1, .25, 1] }}>
            {row ? <em>{line}</em> : line}
          </motion.span>
        </span>)}
      </p>
    </motion.div>
    <motion.div className="intro-bottom" animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: .15 }}>
      <button ref={button} onClick={skip} disabled={opening} aria-label="Bỏ qua hiệu ứng mở đầu">{story.opening.action} <ArrowUpRight size={16} /></button>
    </motion.div>
  </motion.div>;
}
