import LoveMark from './LoveMark';
import { motion, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import Reveal from './Reveal';
import { goTo } from '../lib/motion';
import { useEnterProgress, usePresentation } from './Scene';
import { story } from '../data/story';

export function PageLabel({ number, children, light = false }) {
  return <div className={`page-label ${light ? 'on-dark' : ''}`}><span>CHƯƠNG {number}</span><span className="label-rule" /><span>{children}</span></div>;
}

export function Colophon({ onRSVP }) {
  const ref = useRef(null);
  const { reduced } = usePresentation();
  const progress = useEnterProgress(ref, { duration: 1.2 });
  const first = useTransform(progress, [.1, .72], [0, 1]);
  const second = useTransform(progress, [.32, .95], [0, 1]);
  return <footer className="colophon" id="closing" data-scene-mode={reduced ? 'static' : 'enter'} aria-label="Lời cảm ơn">
    <span className="eyebrow">{story.closing.kicker}</span>
    <div ref={ref} className="closing-rings" aria-hidden="true"><svg viewBox="0 0 600 200">
      <motion.path d="M 0 90 C 85 90 125 35 215 35 C 305 35 305 165 215 165 C 125 165 125 35 215 35" style={{ pathLength: reduced ? 1 : first }} />
      <motion.path d="M 215 35 C 300 -5 305 165 395 165 C 485 165 485 35 395 35 C 305 35 305 165 395 165 C 480 165 520 100 600 100" style={{ pathLength: reduced ? 1 : second }} />
    </svg></div>
    <Reveal className="closing-copy">
      <h2>{story.closing.title[0]}<br /><em>{story.closing.title[1]}</em></h2>
      {story.closing.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      <button className="button button-paper" onClick={onRSVP}>{story.actions.rsvp} <ArrowUpRight size={17} /></button>
    </Reveal>
    <div className="colophon-bottom"><span>{story.closing.signature} <LoveMark decorative /></span><button onClick={() => goTo('home')}>{story.actions.backTop} <ArrowUp size={14} /></button></div>
  </footer>;
}
