import { motion, useReducedMotion } from 'framer-motion';
export default function Reveal({children, className='', delay=0, y=42}) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : {opacity:0,y}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.15}} transition={{duration:reduced ? 0 : .85,delay:reduced ? 0 : delay,ease:[.22,1,.36,1]}}>{children}</motion.div>;
}
