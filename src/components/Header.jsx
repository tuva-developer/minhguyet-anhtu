import LoveMark from './LoveMark';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, Music2, Pause } from 'lucide-react';
import { useMedia } from './Media';
import { Modal } from './Dialogs';
import { goTo } from '../lib/motion';

export default function Header({ playing, loading, onMusic, onRSVP }) {
  const { photos, site } = useMedia();
  const [open, setOpen] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const links = [ ['opening', 'Lời ngỏ'], ...(photos.length ? [['story', 'Trang ảnh']] : []), ['couple', 'Hai chúng mình'], ['event', 'Lịch hẹn'], ['wishes', 'Lời thương'] ];
  function navigate(id) { setPendingPage(id); setOpen(false); }
  function afterClose() {
    if (pendingPage === 'rsvp') onRSVP();
    else if (pendingPage) goTo(pendingPage);
    setPendingPage(null);
  }
  return <>
    <header className="masthead">
      <button className="brand" onClick={() => goTo('home')} aria-label="Về cảnh mở đầu"><span>{site.groom} <i><LoveMark /></i> {site.bride}</span><small>SỢI DUYÊN · MỘT ĐỜI CHUNG ĐÔI</small></button>
      <nav className="desktop-contents" aria-label="Mục lục">{links.map(([id, text]) => <button key={id} onClick={() => goTo(id)}>{text}</button>)}</nav>
      <div className="header-actions">
        <button className={`sound-button ${playing ? 'playing' : ''}`} onClick={onMusic} disabled={loading || !site.musicUrl} aria-label={playing ? 'Tạm dừng nhạc nền' : 'Phát nhạc nền'} aria-pressed={playing}>
          {playing ? <Pause size={15} /> : <Music2 size={16} />}<span>{loading ? 'Đang mở…' : playing ? 'Đang nghe' : 'Một chút nhạc'}</span><span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
        </button>
        <button className="header-rsvp" onClick={onRSVP}>Mình có hẹn <ArrowUpRight size={14} /></button>
        <button className="contents-toggle" onClick={() => setOpen(true)} aria-label="Mở mục lục" aria-expanded={open} aria-haspopup="dialog"><Menu size={21} /></button>
      </div>
    </header>
    <AnimatePresence onExitComplete={afterClose}>{open && <Modal label="Mục lục" onClose={() => setOpen(false)} className="contents-dialog"><span className="eyebrow">LẬT ĐẾN TRANG BẠN MUỐN</span><h2>Mục lục.</h2><nav aria-label="Mục lục trên điện thoại">{links.map(([id, text], i) => <motion.button key={id} initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * .05 }} onClick={() => navigate(id)}><small>0{i + 1}</small>{text}<ArrowUpRight size={20} /></motion.button>)}</nav><button className="button button-wine" onClick={() => { setPendingPage('rsvp'); setOpen(false); }}>Xác nhận tham dự <ArrowUpRight size={16} /></button></Modal>}</AnimatePresence>
  </>;
}
