import { motion, useTransform } from 'framer-motion';
import { ArrowDown, Code2, PenTool } from 'lucide-react';
import { CutoutPhoto, useMedia } from './Media';
import { SceneHUD, useScene } from './Scene';
import { goTo } from '../lib/motion';
import LoveMark from './LoveMark';
import { useId } from 'react';

function Portrait({ bride = false, progress, reduced, compact }) {
  const { site, bride: bridePhoto, groom } = useMedia();
  const profile = site.profiles?.[bride ? 'bride' : 'groom'];
  const occupation = profile?.occupation || (bride ? 'Designer' : 'Developer');
  const CareerIcon = bride ? PenTool : Code2;
  const portrait = bride ? bridePhoto : groom;
  const cutout = portrait?.cutout;
  const fullName = bride ? site.brideFull : site.groomFull;
  const direction = bride ? 1 : -1;
  const phases = [0, .3, .65, 1];
  const textY = useTransform(progress, [0, .22], [28, 0]);
  const subjectX = useTransform(progress, phases, [`${direction * (compact ? 16 : 22)}%`, '0%', '0%', `${direction * -3}%`]);
  const subjectY = useTransform(progress, phases, [compact ? 72 : 110, 0, 0, -18]);
  const subjectScale = useTransform(progress, phases, [.82, 1, 1, 1.04]);
  const subjectRotate = useTransform(progress, phases, [direction * 7, 0, 0, direction * -1.5]);
  const backdropY = useTransform(progress, phases, [-56, 12, 12, 48]);
  const backdropScale = useTransform(progress, phases, [.84, 1, 1, 1.04]);
  const backdropRotate = useTransform(progress, [0, .45, 1], [direction * -12, 0, direction * 6]);
  const orbitRotate = useTransform(progress, [0, .5, 1], [direction * 32, direction * -8, direction * -38]);

  return <article className={`family-person ${bride ? 'family-bride' : 'family-groom'} ${portrait ? '' : 'family-without-photo'}`} aria-label={fullName}>
    <motion.div className="family-name" style={reduced ? undefined : { y: textY }}>
      <span className="family-role">{bride ? 'CÔ DÂU' : 'CHÚ RỂ'}</span>
      <h3>{fullName}</h3>
      <div className="family-career"><CareerIcon size={18} strokeWidth={1.5} aria-hidden="true" /><span>{occupation}</span></div>
    </motion.div>
    <div className={`family-portrait ${cutout ? 'has-cutout' : 'has-original'} ${cutout?.maskSrc ? 'has-masked-original' : ''}`}>
      <motion.div className="family-portrait-halo" style={reduced ? undefined : { y: backdropY, scale: backdropScale, rotate: backdropRotate }} aria-hidden="true" />
      <div className="family-portrait-shadow" aria-hidden="true" />
      {portrait && <motion.div className="family-subject-frame" style={reduced ? undefined : { x: subjectX, y: subjectY, scale: subjectScale, rotate: subjectRotate }}>
        <CutoutPhoto photo={portrait} cutout={cutout} className="family-subject" sizes="(max-width: 700px) 65vw, 50vw" alt={fullName} />
      </motion.div>}
      <motion.div className="family-orbit" style={reduced ? undefined : { rotate: orbitRotate }} aria-hidden="true"><i /></motion.div>
      <span className="family-portrait-caption" aria-hidden="true">{bride ? 'vẽ từng nét, thương một người.' : 'viết từng dòng, thương một người.'}</span>
    </div>
  </article>;
}

export default function Families() {
  const { ref, progress, entranceProgress, reduced, compact } = useScene({ duration: .95 });
  const mobileProgress = useTransform(entranceProgress, [0, 1], [0, .4]);
  const outlineId = useId();
  return <section id="couple" className="film-scene profiles-film family-film" ref={ref} aria-label="Hai chúng mình — Developer và Designer" style={{ '--family-cutout-outline': `url("#${outlineId}")` }}>
    <svg className="family-filter-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
      <filter id={outlineId} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="expanded" />
        <feFlood floodColor="white" result="white" />
        <feComposite in="white" in2="expanded" operator="in" result="outline" />
        <feMerge><feMergeNode in="outline" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs></svg>
    <div className="film-stage profiles-stage family-stage">
      <div className="family-spread"><Portrait progress={compact ? mobileProgress : progress} reduced={reduced} compact={compact} /><Portrait bride progress={compact ? mobileProgress : progress} reduced={reduced} compact={compact} /></div>
      <span className="family-heart" aria-hidden="true"><LoveMark decorative /></span>
      <SceneHUD number="04" label="HAI NGƯỜI, MỘT NHỊP" progress={progress}><button className="hud-scroll" onClick={() => goTo('event')}>ĐẾN BA CUỘC HẸN <ArrowDown size={14} /></button></SceneHUD>
    </div>
  </section>;
}
