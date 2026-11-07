import { useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from 'framer-motion';
import { sampleThreadTrack } from '../lib/threadTrack';

const CAT_IMAGE = '/images/banhbao/banhbao.png';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function ThreadCat({ distance, movement = distance, viewportY, track, width, size, keepInBounds = true, className = '' }) {
  const turn = useRef({ sign: 1, extreme: movement.get() });
  const forwardFacing = useRef(-1);
  const direction = useMotionValue(1);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useMotionValueEvent(movement, 'change', value => {
    const current = turn.current;
    // A few pixels of real reverse travel confirm a turn; tiny spring tails or
    // layout measurements must not make the cat flicker between directions.
    current.extreme = current.sign > 0 ? Math.max(current.extreme, value) : Math.min(current.extreme, value);
    if ((value - current.extreme) * current.sign < -8) {
      current.sign *= -1;
      current.extreme = value;
      direction.set(current.sign);
    }
  });
  const catWidth = size ?? (width <= 700 ? 76 : 112);
  const catHeight = catWidth * 768 / 2048;
  const frame = useTransform([distance, direction], ([travel, sign]) => {
    if (!track) return { x: 0, y: 0, angle: 0, facing: -1 };
    const point = sampleThreadTrack(track, travel);
    // This source image faces left. Keep it readable on vertical curves and
    // turn it around when the guest scrolls back along the string.
    if (point.dx > .16) forwardFacing.current = -1;
    else if (point.dx < -.16) forwardFacing.current = 1;
    const facing = forwardFacing.current * sign;
    const angle = clamp(Math.atan2(point.dy, Math.abs(point.dx)) * 180 / Math.PI * -forwardFacing.current * .2, -18, 18);
    return {
      x: keepInBounds ? clamp(point.x - catWidth / 2, 8, width - catWidth - 8) : point.x - catWidth / 2,
      y: point.y - catHeight * .5,
      angle,
      facing,
    };
  });
  const x = useTransform(frame, value => value.x);
  const documentY = useTransform(frame, value => value.y);
  const y = useTransform(viewportY || documentY, value => viewportY ? value - catHeight * .5 : value);
  const angle = useTransform(frame, value => value.angle);
  const facing = useTransform(frame, value => value.facing);
  const rotate = useSpring(angle, { stiffness: 220, damping: 26, mass: .4 });
  const scaleX = useSpring(facing, { stiffness: 650, damping: 35, mass: .25 });
  // The trot follows distance, not a timer: it stops when scrolling stops.
  const hopTarget = useTransform(distance, value => -(1 - Math.cos(value / 32)));
  const rockTarget = useTransform(distance, value => Math.sin(value / 48) * 1.5);
  const hop = useSpring(hopTarget, { stiffness: 240, damping: 25, mass: .4 });
  const rock = useSpring(rockTarget, { stiffness: 220, damping: 26, mass: .4 });
  if (failed) return null;
  return <motion.div className={`thread-cat ${className}`} aria-hidden="true" style={{ position: viewportY ? 'fixed' : 'absolute', x, y, rotate, width: catWidth, height: catHeight, opacity: loaded && track ? 1 : 0 }}>
    <motion.div className="thread-cat-body" style={{ y: hop, rotate: rock, scaleX }}>
      <img src={CAT_IMAGE} width={2048} height={768} alt="" draggable="false" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </motion.div>
  </motion.div>;
}
