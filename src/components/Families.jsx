import { motion, useTransform } from 'framer-motion';
import { ArrowDown, Code2, PenTool } from 'lucide-react';
import { CutoutPhoto, useMedia } from './Media';
import { SceneHUD, useEnterProgress, usePresentation } from './Scene';
import { goTo } from '../lib/motion';
import LoveMark from './LoveMark';
import { useId, useRef } from 'react';
import { story } from '../data/story';

function Portrait({ bride = false, progress, reduced, compact }) {
  const { site, bride: bridePhoto, groom } = useMedia();
  const profile = site.profiles?.[bride ? 'bride' : 'groom'];
  const occupation = profile?.occupation || (bride ? 'Designer' : 'Developer');
  const CareerIcon = bride ? PenTool : Code2;
  const portrait = bride ? bridePhoto : groom;
  const cutout = portrait?.cutout;
  const fullName = bride ? site.brideFull : site.groomFull;
  const direction = bride ? 1 : -1;
  const delay = bride ? .06 : 0;
  const roleY = useTransform(progress, [delay, .26 + delay], [12, 0]);
  const roleOpacity = useTransform(progress, [delay, .24 + delay], [0, 1]);
  const nameX = useTransform(progress, [.06 + delay, .7 + delay], [direction * (compact ? 16 : 64), 0]);
  const nameY = useTransform(progress, [.06 + delay, .7 + delay], [compact ? 14 : 24, 0]);
  const nameOpacity = useTransform(progress, [.06 + delay, .42 + delay], [0, 1]);
  const brush = useTransform(progress, [.28 + delay, .82 + delay], [0, 1]);
  const careerY = useTransform(progress, [.3 + delay, .9 + delay], [10, 0]);
  const careerOpacity = useTransform(progress, [.48 + delay, .86 + delay], [0, 1]);
  const subjectX = useTransform(progress, [0, 1], [`${direction * (compact ? 16 : 22)}%`, '0%']);
  const subjectY = useTransform(progress, [0, 1], [compact ? 72 : 110, 0]);
  const subjectScale = useTransform(progress, [0, 1], [.82, 1]);
  const subjectRotate = useTransform(progress, [0, 1], [direction * 7, 0]);
  const backdropY = useTransform(progress, [0, 1], [-56, 12]);
  const backdropScale = useTransform(progress, [0, 1], [.84, 1]);
  const backdropRotate = useTransform(progress, [0, 1], [direction * -12, 0]);
  const orbitRotate = useTransform(progress, [0, 1], [direction * 32, 0]);

  return <article className={`family-person ${bride ? 'family-bride' : 'family-groom'} ${portrait ? '' : 'family-without-photo'}`} aria-label={fullName}>
    <div className="family-name">
      <motion.span className="family-role" style={{ y: reduced ? 0 : roleY, opacity: reduced ? 1 : roleOpacity }}>{bride ? 'CÔ DÂU' : 'CHÚ RỂ'}</motion.span>
      <motion.h3 style={{ x: reduced ? 0 : nameX, y: reduced ? 0 : nameY, opacity: reduced ? 1 : nameOpacity }}>{fullName}</motion.h3>
      <motion.div className="family-career" style={{ '--brush-scale': reduced ? 1 : brush, y: reduced ? 0 : careerY }}><motion.span className="family-career-label" style={{ opacity: reduced ? 1 : careerOpacity }}><CareerIcon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{occupation}</span></motion.span></motion.div>
    </div>
    <div className={`family-portrait ${cutout ? 'has-cutout' : 'has-original'} ${cutout?.maskSrc ? 'has-masked-original' : ''}`}>
      <motion.div className="family-portrait-halo" style={reduced ? undefined : { y: backdropY, scale: backdropScale, rotate: backdropRotate }} aria-hidden="true" />
      <div className="family-portrait-shadow" aria-hidden="true" />
      {portrait && <motion.div className="family-subject-frame" style={reduced ? undefined : { x: subjectX, y: subjectY, scale: subjectScale, rotate: subjectRotate }}>
        <CutoutPhoto photo={portrait} cutout={cutout} className="family-subject" sizes="(max-width: 700px) 65vw, 50vw" alt={fullName} />
      </motion.div>}
      <motion.div className="family-orbit" style={reduced ? undefined : { rotate: orbitRotate }} aria-hidden="true"><i /></motion.div>
    </div>
  </article>;
}

export default function Families() {
  const ref = useRef(null);
  const { reduced, compact } = usePresentation();
  const entry = useEnterProgress(ref, { duration: 1.05 });
  const outlineId = useId();
  return <section id="couple" className="film-scene profiles-film family-film" data-scene-mode={reduced ? 'static' : 'enter'} aria-label="Hai chúng mình — Developer và Designer" style={{ '--family-cutout-outline': `url("#${outlineId}")` }}>
    <svg className="family-filter-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
      <filter id={outlineId} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="expanded" />
        <feFlood floodColor="white" result="white" />
        <feComposite in="white" in2="expanded" operator="in" result="outline" />
        <feMerge><feMergeNode in="outline" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs></svg>
    <div className="film-stage profiles-stage family-stage">
      <div ref={ref} className="family-spread"><Portrait progress={entry} reduced={reduced} compact={compact} /><Portrait bride progress={entry} reduced={reduced} compact={compact} /></div>
      <span className="family-heart" aria-hidden="true"><LoveMark decorative /></span>
      <SceneHUD number={story.chapters.couple} label={story.profiles.chapter} showProgress={false}><button className="hud-scroll" onClick={() => goTo('opening')}>LỜI NGỎ CỦA CHÚNG MÌNH <ArrowDown size={14} /></button></SceneHUD>
    </div>
  </section>;
}
