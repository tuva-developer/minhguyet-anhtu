import { useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';

const CAT_IMAGE = '/images/banhbao/banhbao.png';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function ThreadCat({ path, distance, track, width, size, keepInBounds = true, className = '' }) {
  const previous = useRef(distance.get());
  const direction = useMotionValue(1);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useMotionValueEvent(distance, 'change', value => {
    const delta = value - previous.current;
    if (Math.abs(delta) > .05) direction.set(delta > 0 ? 1 : -1);
    previous.current = value;
  });
  const catWidth = size ?? (width <= 700 ? 76 : 112);
  const catHeight = catWidth * 768 / 2048;
  const frame = useTransform([distance, direction], ([travel, sign]) => {
    if (!path.current || !track) return { x: 0, y: 0, angle: 0, facing: 1 };
    const point = path.current.getPointAtLength(travel);
    const before = path.current.getPointAtLength(Math.max(0, travel - 3));
    const after = path.current.getPointAtLength(Math.min(track.total, travel + 3));
    const dx = (after.x - before.x) * sign;
    const dy = (after.y - before.y) * sign;
    // This source image faces left. Keep it readable on vertical curves and
    // turn it around when the guest scrolls back along the string.
    const facing = Math.abs(dx) > .05 ? (dx > 0 ? -1 : 1) : (sign > 0 ? -1 : 1);
    const angle = clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI * -facing * .2, -18, 18);
    return {
      x: keepInBounds ? clamp(point.x - catWidth / 2, 8, width - catWidth - 8) : point.x - catWidth / 2,
      y: point.y - catHeight * .5,
      angle,
      facing,
    };
  });
  const x = useTransform(frame, value => value.x);
  const y = useTransform(frame, value => value.y);
  const rotate = useTransform(frame, value => value.angle);
  const scaleX = useTransform(frame, value => value.facing);
  // The trot follows distance, not a timer: it stops when scrolling stops.
  const hop = useTransform(distance, value => -Math.abs(Math.sin(value / 15)) * 3);
  const rock = useTransform(distance, value => Math.sin(value / 22) * 3);
  if (failed) return null;
  return <motion.div className={`thread-cat ${className}`} aria-hidden="true" style={{ x, y, rotate, width: catWidth, height: catHeight, opacity: loaded && track ? 1 : 0 }}>
    <motion.div className="thread-cat-body" style={{ y: hop, rotate: rock, scaleX }}>
      <img src={CAT_IMAGE} width={2048} height={768} alt="" draggable="false" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </motion.div>
  </motion.div>;
}
