import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Photo, useMedia } from './Media';
import { useEntrance, usePresentation, useScene, SceneHUD, seekScene } from './Scene';
import { goTo } from '../lib/motion';

function DatePanel({ event, index, count, progress, reduced, active, onRSVP }) {
  const { eventPhotos, site } = useMedia();
  const { compact } = usePresentation();
  const ref = useRef(null);
  const entrance = useEntrance(ref, { duration: .8 });
  const photo = eventPhotos[event.id];
  const start = index / count;
  const fold = useTransform(progress, value => {
    const eased = x => { const p = Math.max(0, Math.min(1, x)); return p * p * p * (p * (p * 6 - 15) + 10); };
    const incoming = index === 0 ? 1 : eased((value - (index - .32) / count) / (.48 / count));
    const outgoing = index === count - 1 ? 0 : eased((value - (index + .68) / count) / (.48 / count));
    return { rotation: 12 * (1 - incoming) - 108 * outgoing, opacity: outgoing >= .99 ? 0 : 1, shade: Math.sin(outgoing * Math.PI) * .55, scale: .96 + .04 * incoming };
  });
  const rotateY = useTransform(fold, value => value.rotation);
  const opacity = useTransform(fold, value => value.opacity);
  const scale = useTransform(fold, value => value.scale);
  const shade = useTransform(fold, value => value.shade);
  const numberY = useTransform(progress, [start, Math.min(1, start + 1 / count)], [40, -55]);
  const imageScale = useTransform(progress, [start, Math.min(1, start + 1 / count)], [1.06, 1]);
  const paperScale = useTransform(entrance, [0, 1], [1.07, 1]);
  const paperRotate = useTransform(entrance, [0, 1], [-8, 0]);
  const [day, month, year] = event.date.split('.');
  return <motion.article ref={ref} id={`event-${event.id}`} data-event-id={event.id} data-photo-id={photo?.id} className={`date-panel date-theme-${index % 3} ${active || compact ? 'is-active' : ''}`} style={reduced || compact ? undefined : { rotateY, opacity, scale, zIndex: count - index }} aria-hidden={!compact && !reduced && !active} inert={!compact && !reduced && !active ? '' : undefined}>
    {photo && <motion.div className="date-backdrop" style={reduced ? undefined : compact ? { scale: paperScale, rotateY: paperRotate } : { scale: imageScale }} aria-hidden="true"><Photo photo={photo} sizes="100vmax" alt="" /></motion.div>}<div className="date-backdrop-shade" />
    <span className="date-scene-number">0{index + 1} / SAVE THE DATE</span>
    <div className="date-main-copy"><span className="cinema-kicker">TRÂN TRỌNG KÍNH MỜI BẠN</span><h2>{event.name}</h2><p className="date-venue">{event.title}</p><p className="date-primary-time"><span>{event.receptionTime ? 'HÔN LỄ CỬ HÀNH LÚC' : 'TIỆC BẮT ĐẦU LÚC'}</span><strong>{event.time}</strong>{event.receptionTime && <small>Đãi tiệc lúc {event.receptionTime}</small>}</p><div className="date-actions"><button onClick={onRSVP} className="date-rsvp-link">Mình có hẹn nhé <ArrowUpRight size={15} /></button></div></div>
    <motion.div className="date-giant" style={{ y: reduced || compact ? 0 : numberY }}><time dateTime={event.dateTime}><span>{day}<i>/</i></span><span>{month}<small>{year}</small></span></time><p>{event.weekday.toUpperCase()}</p></motion.div>
    <p className="date-bottom-line">MỘT CUỘC HẸN, ĐỂ GIỮ NHAU CẢ ĐỜI.</p>
    {!reduced && !compact && <motion.div className="paper-fold-shade" style={{ opacity: shade }} aria-hidden="true" />}<span className="paper-fold-spine" aria-hidden="true" />
    {compact && <SceneHUD number={String(index + 1).padStart(2, '0')} label={event.name.toUpperCase()} progress={entrance}><button className="hud-scroll" onClick={() => goTo(index < count - 1 ? `event-${site.events[index + 1].id}` : 'wishes')}>{index < count - 1 ? 'LỄ TIẾP THEO' : 'GỬI LỜI THƯƠNG'} <ArrowUpRight size={14} /></button></SceneHUD>}
  </motion.article>;
}

export default function Schedule({ onRSVP }) {
  const { site } = useMedia();
  const { ref, progress, reduced, compact } = useScene({ enabled: false });
  const [active, setActive] = useState(0);
  const count = site.events.length;
  useMotionValueEvent(progress, 'change', value => { if (!compact) setActive(Math.min(count - 1, Math.floor(value * count))); });
  useEffect(() => {
    if (!compact) return;
    const root = ref.current;
    const nav = root.querySelector('.mobile-date-nav');
    const panels = [...root.querySelectorAll('.date-panel')];
    let frame;
    const update = () => {
      const edge = nav.getBoundingClientRect().bottom + 1;
      let current = 0;
      panels.forEach((panel, index) => { if (panel.getBoundingClientRect().top <= edge) current = index; });
      setActive(current);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [compact, ref, count]);
  return <section id="event" className="film-scene dates-film" ref={ref} style={{ height: reduced || compact ? 'auto' : `${count * 88 + 100}svh` }} aria-label="Ba cuộc hẹn ngày cưới"><div className="film-stage dates-stage" data-active={active}>
    {compact && <nav className="mobile-date-nav date-tabs" aria-label="Chọn lịch cưới">{site.events.map((event, index) => <button key={event.id} aria-current={active === index ? 'location' : undefined} aria-controls={`event-${event.id}`} onClick={() => goTo(`event-${event.id}`)}>{event.name}</button>)}</nav>}
    {site.events.map((event, index) => <DatePanel key={event.id} event={event} index={index} count={count} progress={progress} reduced={reduced} active={active === index} onRSVP={onRSVP} />)}
    {!compact && <SceneHUD number="06" label="HẸN GẶP TRONG NGÀY VUI" progress={progress}><div className="scene-tabs date-tabs">{site.events.map((event, index) => <button key={event.id} aria-pressed={active === index} onClick={() => seekScene(ref, (index + .5) / count)}>{event.name}</button>)}</div></SceneHUD>}
    </div></section>;
}
