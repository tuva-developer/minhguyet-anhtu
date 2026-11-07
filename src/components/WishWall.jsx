import LoveMark from './LoveMark';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Modal } from './Dialogs';

export default function WishWall({ messages, sentId }) {
  const board = useRef(null);
  const dragging = useRef(false);
  const [finePointer, setFinePointer] = useState(false);
  const [selected, setSelected] = useState(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const query = matchMedia('(pointer: fine)');
    const update = () => setFinePointer(query.matches); update();
    query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  return <div className="wish-board" ref={board}><div className="wish-board-heading"><span>POSTCARDS FROM OUR PEOPLE</span><small>{messages.length} lời thương</small></div>
    <div className="envelope" aria-hidden="true"><div className="envelope-back" /><motion.div className="envelope-flap" key={sentId || 'closed'} animate={sentId && !reduced ? { rotateX: [0, -150, 0] } : { rotateX: 0 }} transition={{ duration: .9 }} /><span><LoveMark /></span></div>
    <span className="board-handwriting">những điều đẹp đẽ,<br />mình giữ lại ở đây.</span>
    <div className="pinned-notes"><AnimatePresence initial={false}>
      {messages.map((message, index) => {
        const id = message.id || `${message.name}-${message.date}-${index}`;
        const rotation = [-3, 2, -1, 3][index % 4];
        return <motion.article key={id} layout className={`pinned-note ${sentId === id ? 'new-note' : ''}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20, y: -100, rotate: -12, scale: .75 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: rotation, scale: 1 }} exit={{ opacity: 0, scale: .8 }}
          transition={{ type: 'spring', stiffness: 160, damping: 20 }}
          drag={finePointer && !reduced} dragConstraints={board} dragMomentum={false} dragElastic={.1}
          onDragStart={() => { dragging.current = true; }} onDragEnd={() => { setTimeout(() => { dragging.current = false; }, 0); }} whileDrag={{ scale: 1.04, zIndex: 8, cursor: 'grabbing' }}>
          <button onClick={() => { if (!dragging.current) setSelected(message); }} aria-label={`Đọc lời chúc của ${message.name}`}><span className="note-pin" aria-hidden="true" /><small>{message.date}</small><p>{message.text}</p><span className="note-from">{message.name}<ArrowUpRight size={14} /></span></button>
        </motion.article>;
      })}
    </AnimatePresence></div>
    {!messages.length && <p className="empty-notes">Trang này đang đợi lời thương đầu tiên của bạn.</p>}
    <p className="board-hint">{finePointer ? 'Kéo một tấm thư, hoặc bấm để đọc trọn lời thương.' : 'Chạm một tấm thư để đọc trọn lời thương.'}</p>
    <AnimatePresence>{selected && <Modal label={`Lời chúc của ${selected.name}`} onClose={() => setSelected(null)} className="note-dialog"><span className="eyebrow">MỘT LỜI THƯƠNG ĐƯỢC GIỮ LẠI</span><h2>Từ {selected.name}</h2><p className="full-wish">{selected.text}</p><small>{selected.date}</small></Modal>}</AnimatePresence>
  </div>;
}
