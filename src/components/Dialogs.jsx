import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Heart, Pause, Play, X } from 'lucide-react';
import { Photo } from './Media';
import { readEntries, writeEntries } from '../lib/storage';
import { ease } from '../lib/motion';

export function Modal({ children, onClose, label, className = '' }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (dialog.current.querySelector('button') || dialog.current).focus({ preventScroll: true });
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const nodes = [...dialog.current.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); dialog.current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [onClose]);
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={dialog} className={`modal-content ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 16 }} transition={{ duration: .35, ease }}>
      <button className="modal-close" onClick={onClose} aria-label="Đóng"><X size={21} strokeWidth={1.5} /></button>{children}
    </motion.div>
  </motion.div>;
}

export function PhotoViewer({ photos, selection, onSelect, onClose }) {
  const [auto, setAuto] = useState(false);
  const touch = useRef(null);
  const reduced = useReducedMotion();
  const index = Math.max(0, photos.findIndex(photo => photo.id === selection.id));
  const photo = photos[index];
  const many = photos.length > 1;
  const next = useCallback(() => { if (photos.length > 1) onSelect(photos[(index + 1) % photos.length].id); }, [photos, index, onSelect]);
  const prev = useCallback(() => { if (photos.length > 1) onSelect(photos[(index + photos.length - 1) % photos.length].id); }, [photos, index, onSelect]);
  useEffect(() => {
    const key = event => { if (event.key === 'ArrowRight') next(); if (event.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [next, prev]);
  useEffect(() => { if (!auto || !many) return; const timer = setInterval(next, 3500); return () => clearInterval(timer); }, [auto, many, next]);
  if (!photo) return null;
  const layoutId = !reduced && photo.id === selection.initialId ? `${selection.origin}-${photo.id}` : undefined;
  return <Modal label="Album ảnh cưới" onClose={onClose} className="photo-dialog"><div className="photo-viewer" onTouchStart={event => { touch.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 50) end < touch.current ? next() : prev(); touch.current = null; }}>
    <div className="viewer-heading"><span>THE PHOTO DIARY</span><small>{String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</small></div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={photo.id} className="viewer-surface" layoutId={layoutId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25, layout: { duration: .45, ease } }}><Photo photo={photo} priority /></motion.div></AnimatePresence>
    {many && <><button className="photo-nav prev" onClick={prev} aria-label="Ảnh trước"><ArrowLeft size={23} strokeWidth={1.4} /></button><button className="photo-nav next" onClick={next} aria-label="Ảnh tiếp"><ArrowRight size={23} strokeWidth={1.4} /></button></>}
    <div className="photo-caption"><span>{photo.caption || photo.alt}</span>{many && <button className="slideshow-button" onClick={() => setAuto(value => !value)} aria-label={auto ? 'Dừng slideshow' : 'Phát slideshow'}>{auto ? <Pause size={15} /> : <Play size={15} />}<span>{auto ? 'Dừng một chút' : 'Tự lật trang'}</span></button>}<small>{index + 1} / {photos.length}</small></div>
  </div></Modal>;
}

export function RSVP({ onClose }) {
  const [done, setDone] = useState(false);
  const [attendance, setAttendance] = useState('yes');
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    if (!name) { setError('Điền tên của bạn nhé.'); return; }
    const entry = { name, attendance, guests: attendance === 'yes' ? Number(data.get('guests')) : 0, note: String(data.get('note') || '').trim(), createdAt: new Date().toISOString() };
    if (!writeEntries('wedding-rsvp', [...readEntries('wedding-rsvp'), entry])) { setError('Trình duyệt không cho lưu phản hồi. Vui lòng thử lại.'); return; }
    setDone(true);
  }
  return <Modal label="Xác nhận tham dự" onClose={onClose} className="rsvp-dialog">{done ? <div className="rsvp-success"><Heart size={36} strokeWidth={1} /><span className="eyebrow">MỘT LỜI HẸN ĐÃ ĐƯỢC GIỮ LẠI</span><h2>Cảm ơn bạn,<br /><em>người thương.</em></h2><p>Đã lưu phản hồi trên trình duyệt của bạn.<br />Hẹn gặp bạn trong ngày vui nhé.</p><button className="button button-wine" onClick={onClose}>Gấp thư lại <Check size={16} /></button></div> : <>
    <span className="eyebrow">MỘT CHIẾC GHẾ, ĐỢI BẠN ĐẾN</span><h2>Mình có<br /><em>hẹn nhé?</em></h2>
    <form className="wish-form rsvp-form" onSubmit={submit}><label htmlFor="rsvp-name">TÊN CỦA BẠN</label><input id="rsvp-name" name="name" required maxLength={80} placeholder="Họ và tên" />
      <fieldset><legend>BẠN SẼ ĐẾN CHỨ?</legend><label><input type="radio" name="attendance" value="yes" checked={attendance === 'yes'} onChange={() => setAttendance('yes')} /> Chắc chắn có mặt!</label><label><input type="radio" name="attendance" value="no" checked={attendance === 'no'} onChange={() => setAttendance('no')} /> Mình gửi lời chúc từ xa</label></fieldset>
      {attendance === 'yes' && <><label htmlFor="rsvp-guests">SỐ NGƯỜI THAM DỰ</label><select name="guests" id="rsvp-guests">{[1, 2, 3, 4, 5].map(number => <option key={number} value={number}>{number} người</option>)}</select></>}
      <label htmlFor="rsvp-note">LỜI NHẮN CỦA BẠN</label><textarea id="rsvp-note" name="note" rows={3} maxLength={300} placeholder="Một lời nhắn nhỏ…" /><button className="button button-wine" type="submit">Gửi lời hẹn <ArrowUpRight size={16} /></button><p className="form-status" role="status">{error}</p><small className="storage-note">Phản hồi chỉ lưu trên trình duyệt này, chưa gửi đến chủ tiệc.</small>
    </form>
  </>}</Modal>;
}
