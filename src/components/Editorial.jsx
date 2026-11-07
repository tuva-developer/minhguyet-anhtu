import LoveMark from './LoveMark';
import { motion, useTransform } from 'framer-motion';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import Reveal from './Reveal';
import { goTo } from '../lib/motion';
import { useScene } from './Scene';

export function PageLabel({ number, children, light = false }) {
  return <div className={`page-label ${light ? 'on-dark' : ''}`}><span>CHƯƠNG {number}</span><span className="label-rule" /><span>{children}</span></div>;
}

export function Colophon({ onRSVP }) {
  const { ref, progress, reduced } = useScene({ offset: ['start end', 'end end'] });
  const first = useTransform(progress, [.1, .72], [0, 1]);
  const second = useTransform(progress, [.32, .95], [0, 1]);
  return <footer ref={ref} className="colophon" id="closing" aria-label="Lời cảm ơn">
    <span className="eyebrow">THƯƠNG GỬI BẠN</span>
    <div className="closing-rings" aria-hidden="true"><svg viewBox="0 0 600 200">
      <motion.path d="M 0 90 C 85 90 125 35 215 35 C 305 35 305 165 215 165 C 125 165 125 35 215 35" style={{ pathLength: reduced ? 1 : first }} />
      <motion.path d="M 215 35 C 300 -5 305 165 395 165 C 485 165 485 35 395 35 C 305 35 305 165 395 165 C 480 165 520 100 600 100" style={{ pathLength: reduced ? 1 : second }} />
    </svg></div>
    <Reveal className="closing-copy">
      <h2>Cảm ơn vì đã<br /><em>thương chúng mình.</em></h2>
      <p>Từng lời chúc, từng sự quan tâm đều là món quà mà hai đứa luôn trân quý.</p>
      <p>Rất mong được đón bạn và cùng lưu lại một ngày thật đẹp.</p>
      <button className="button button-paper" onClick={onRSVP}>Mình có hẹn nhé <ArrowUpRight size={17} /></button>
    </Reveal>
    <div className="colophon-bottom"><span>VỚI TẤT CẢ YÊU THƯƠNG <LoveMark decorative /></span><button onClick={() => goTo('home')}>Về đầu trang <ArrowUp size={14} /></button></div>
  </footer>;
}
