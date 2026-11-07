import { motion, useReducedMotion } from 'framer-motion';
export default function Reveal({children, className='', delay=0, y=42, immediate=false}) {
  const reduced = useReducedMotion();
  const staticView = reduced || immediate;
  return <motion.div className={className} initial={staticView ? false : {opacity:0,y}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.15}} transition={{duration:staticView ? 0 : .85,delay:staticView ? 0 : delay,ease:[.22,1,.36,1]}}>{children}</motion.div>;
}
