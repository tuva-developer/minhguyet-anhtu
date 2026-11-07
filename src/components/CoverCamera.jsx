import { motion, useReducedMotion, useTransform } from 'framer-motion';
import { CinemaPhoto } from './Media';
import { interval, smoothOpening } from '../lib/openingTimeline';

const smooth = value => { const p = Math.max(0, Math.min(1, value)); return p * p * p * (p * (p * 6 - 15) + 10); };

// Animate inside the existing traveling frame. The frame itself still belongs
// to StoryFlow, which blends into the next scene's photo without moving frames.
export default function CoverCamera({ photo, progress, scroll, geometry, stationary = false }) {
  const reduced = useReducedMotion();
  const camera = useTransform(progress, value => smoothOpening(interval(value, .025, 1)));

  // Ease back to the original crop before the scroll choreography takes over.
  const gate = useTransform(scroll, value => {
    if (reduced) return 0;
    if (stationary) return 1;
    if (!geometry?.hero) return 0;
    return 1 - smooth((value - geometry.hero.top) / (geometry.hero.travel * .28));
  });
  const strength = useTransform([camera, gate], ([amount, visible]) => amount * visible);
  const scale = useTransform(strength, amount => 1 + amount * (stationary || geometry?.w <= 700 ? .18 : .22));
  const x = useTransform(strength, amount => `${amount * -.8}%`);
  const y = useTransform(strength, amount => `${amount * .7}%`);
  const rotate = useTransform([camera, gate], ([amount, visible]) => Math.sin(amount * Math.PI) * -.45 * visible);
  const lightX = useTransform(camera, [0, 1], ['-90%', '90%']);
  const lightOpacity = useTransform([camera, gate], ([amount, visible]) => !reduced ? Math.sin(amount * Math.PI) * .12 * visible : 0);

  return <motion.div className="cover-camera" style={{ scale, x, y, rotate }}>
    <CinemaPhoto photo={photo} priority decorative />
    <motion.div className="cover-camera-light" style={{ x: lightX, opacity: lightOpacity }} aria-hidden="true" />
  </motion.div>;
}
