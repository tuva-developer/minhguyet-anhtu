import LoveMark from './LoveMark';
import { useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useTransform } from 'framer-motion';
import { ArrowUpRight, MapPin, Plus } from 'lucide-react';
import { Photo, useMedia } from './Media';
import { Modal } from './Dialogs';
import { useScene, SceneHUD, seekScene } from './Scene';
import { ease } from '../lib/motion';

function DatePanel({ event, index, count, progress, reduced, active, onDetails, onRSVP }) {
  const { eventPhotos } = useMedia();
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
  const [day, month, year] = event.date.split('.');
  return <motion.article data-event-id={event.id} data-photo-id={photo?.id} className={`date-panel date-theme-${index % 3} ${active ? 'is-active' : ''}`} style={reduced ? undefined : { rotateY, opacity, scale, zIndex: count - index }} aria-hidden={!reduced && !active} inert={!reduced && !active ? '' : undefined}>
    {photo && <motion.div className="date-backdrop" style={{ scale: reduced ? 1 : imageScale }} aria-hidden="true"><Photo photo={photo} sizes="100vmax" alt="" /></motion.div>}<div className="date-backdrop-shade" />
    <span className="date-scene-number">0{index + 1} / SAVE THE DATE</span>
    <div className="date-main-copy"><span className="cinema-kicker">TRÂN TRỌNG KÍNH MỜI BẠN</span><h2>{event.name}</h2><p className="date-venue">{event.title}</p><p className="date-primary-time"><span>{event.receptionTime ? 'HÔN LỄ CỬ HÀNH LÚC' : 'TIỆC BẮT ĐẦU LÚC'}</span><strong>{event.time}</strong>{event.receptionTime && <small>Đãi tiệc lúc {event.receptionTime}</small>}</p><div className="date-actions"><button onClick={() => onDetails(event)} className="screen-button">Mở thiệp mời <Plus size={17} /></button><button onClick={onRSVP} className="date-rsvp-link">Mình có hẹn nhé <ArrowUpRight size={15} /></button></div></div>
    <motion.div className="date-giant" style={{ y: reduced ? 0 : numberY }}><time dateTime={event.dateTime}><span>{day}<i>/</i></span><span>{month}<small>{year}</small></span></time><p>{event.weekday.toUpperCase()}</p></motion.div>
    <p className="date-bottom-line">MỘT CUỘC HẸN, ĐỂ GIỮ NHAU CẢ ĐỜI.</p>
    {!reduced && <motion.div className="paper-fold-shade" style={{ opacity: shade }} aria-hidden="true" />}<span className="paper-fold-spine" aria-hidden="true" />
  </motion.article>;
}

export default function Schedule({ onRSVP }) {
  const { site } = useMedia();
  const { ref, progress, reduced } = useScene();
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState(null);
  const count = site.events.length;
  useMotionValueEvent(progress, 'change', value => setActive(Math.min(count - 1, Math.floor(value * count))));
  return <section id="event" className="film-scene dates-film" ref={ref} style={{ height: reduced ? 'auto' : `${count * 120 + 100}svh` }} aria-label="Ba cuộc hẹn ngày cưới"><div className="film-stage dates-stage" data-active={active}>
    {site.events.map((event, index) => <DatePanel key={event.id} event={event} index={index} count={count} progress={progress} reduced={reduced} active={active === index} onDetails={setSelected} onRSVP={onRSVP} />)}
    <SceneHUD number="06" label="HẸN GẶP TRONG NGÀY VUI" progress={progress}><div className="scene-tabs date-tabs">{site.events.map((event, index) => <button key={event.id} aria-pressed={active === index} onClick={() => seekScene(ref, (index + .5) / count)}>{event.name}</button>)}</div></SceneHUD>
    </div><AnimatePresence>{selected && <Modal label={`Thiệp mời ${selected.name}`} onClose={() => setSelected(null)} className="invitation-dialog"><motion.div initial={reduced ? false : { rotateX: -35, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ duration: .5, ease }}><span className="eyebrow">TRÂN TRỌNG KÍNH MỜI</span><h2>{selected.name}</h2><p className="invitation-couple">{site.groomFull}<br /><i><LoveMark /></i><br />{site.brideFull}</p><time dateTime={selected.dateTime} className="invitation-modal-date">{selected.weekday} · {selected.date}</time><p className="lunar-date">Nhằm ngày {selected.lunarDate}</p><p className="event-address">{selected.title}<br />{selected.address}</p><p className="reception-time">{selected.receptionTime ? 'Cử hành' : 'Đón tiệc'} lúc <strong>{selected.time}</strong>{selected.receptionTime && <> · Đãi tiệc <strong>{selected.receptionTime}</strong></>}</p>{selected.mapQuery && <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.mapQuery)}`} target="_blank" rel="noreferrer"><MapPin size={14} /> Xem đường đến <ArrowUpRight size={14} /></a>}<span className="inside-signature">Hẹn gặp bạn trong ngày vui ♡</span></motion.div></Modal>}</AnimatePresence>
  </section>;
}
