import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import { useEnterProgress } from './Scene';
export default function Reveal({children, className='', delay=0, y=42, immediate=false}) {
  const ref = useRef(null);
  const progress = useEnterProgress(ref, { duration: .85, delay, immediate });
  const eased = useTransform(progress, p => 1 - Math.pow(1 - p, 3));
  const opacity = useTransform(eased, [0, 1], [0, 1]);
  const lift = useTransform(eased, [0, 1], [y, 0]);
  return <motion.div ref={ref} className={className} style={{ opacity, y: lift }}>{children}</motion.div>;
}
