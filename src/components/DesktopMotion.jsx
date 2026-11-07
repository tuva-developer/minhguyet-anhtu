import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { usePresentation } from './Scene';

// Smooth the document's wheel input only; nested scrollers retain native input.
function useWheelEase(enabled) {
  useEffect(() => {
    if (!enabled) return;
    let frame = 0, target = scrollY, written = scrollY, previousTime = 0, damping = 80;
    const blocked = () => document.body.style.overflow === 'hidden' || document.hidden;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; target = written = scrollY; };
    const maximum = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const tick = time => {
      if (blocked() || Math.abs(scrollY - written) > 2) { stop(); return; }
      target = Math.max(0, Math.min(maximum(), target));
      const dt = Math.min(32, Math.max(1, time - previousTime));
      previousTime = time;
      const remaining = target - scrollY;
      const step = Math.sign(remaining) * Math.max(1, Math.abs(remaining) * (1 - Math.exp(-dt / damping)));
      const next = Math.abs(remaining) < 1 ? target : scrollY + step;
      window.scrollTo({ top: next, behavior: 'instant' });
      written = scrollY;
      if (Math.abs(target - written) < .5) { frame = 0; return; }
      frame = requestAnimationFrame(tick);
    };
    const wheel = event => {
      if (event.defaultPrevented || !event.cancelable) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || blocked() || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { stop(); return; }
      const origin = event.target instanceof Element ? event.target : null;
      if (!origin || origin.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) { stop(); return; }
      for (let el = origin; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) { stop(); return; }
      }
      const amount = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (!amount) return;
      if (!frame) target = written = scrollY;
      const next = Math.max(0, Math.min(maximum(), target + amount));
      if (next === scrollY && !frame) return;
      event.preventDefault();
      target = next;
      // Trackpads already supply small momentum steps; give them less lag.
      damping = event.deltaMode === 0 && Math.abs(amount) < 40 ? 45 : 80;
      if (!frame) { previousTime = performance.now(); frame = requestAnimationFrame(tick); }
    };
    const externalScroll = () => { if (frame && Math.abs(scrollY - written) > 2) stop(); };
    const key = event => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(event.key)) stop();
    };
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('scroll', externalScroll, { passive: true });
    window.addEventListener('pointerdown', stop, { passive: true });
    window.addEventListener('keydown', key);
    window.addEventListener('resize', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      stop();
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('scroll', externalScroll);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [enabled]);
}

export default function DesktopMotion() {
  const { compact, reduced, ready } = usePresentation();
  const [available, setAvailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const point = useRef(null);
  const shown = useRef(false);
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 220, damping: 26, mass: .5 });
  const springY = useSpring(y, { stiffness: 220, damping: 26, mass: .5 });

  useEffect(() => {
    const query = matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setAvailable(!compact && !reduced && query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [compact, reduced]);
  useWheelEase(available && ready && !compact && !reduced);

  useEffect(() => {
    if (!available) return;
    const hide = () => { shown.current = false; setVisible(false); };
    const update = target => {
      if (!target || target.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable="true"], .pinned-note, button:disabled')) { hide(); return; }
      if (!shown.current) { springX.jump(x.get()); springY.jump(y.get()); }
      shown.current = true; setVisible(true);
      setInteractive(Boolean(target.closest('button, a[href], [role="button"], summary, label[for], input[type="radio"], input[type="checkbox"]')));
    };
    const move = event => {
      if (event.pointerType !== 'mouse') { hide(); return; }
      point.current = { x: event.clientX, y: event.clientY };
      x.set(event.clientX); y.set(event.clientY);
      update(event.target instanceof Element ? event.target : null);
    };
    const scroll = () => { if (point.current) update(document.elementFromPoint(point.current.x, point.current.y)); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', move, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('blur', hide);
    document.addEventListener('pointerleave', hide);
    hide();
    return () => {
      hide(); point.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', move);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('blur', hide);
      document.removeEventListener('pointerleave', hide);
    };
  }, [available, x, y, springX, springY]);

  if (!available || compact || reduced) return null;
  return <motion.div className="pointer-aura" aria-hidden="true" style={{ x: springX, y: springY }}
    animate={{ opacity: visible ? 1 : 0, scale: interactive ? 1.3 : 1 }} initial={{ opacity: 0 }} transition={{ duration: .18 }} />;
}
