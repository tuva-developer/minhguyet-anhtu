import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import WishNoteDialog from './WishNoteDialog';
import { usePresentation } from './Scene';
import { story } from '../data/story';
import { wishNoteLayout } from '../lib/wishLayout';

function PinnedWish({ message, id, sentId, reduced, wall, layout, layer, total, active, onLift, onRead }) {
  const controls = useDragControls();
  const dragging = useRef(false);
  const paper = useRef(null);
  const [contentHeight, setContentHeight] = useState(84);
  const shape = wishNoteLayout(id, layout.width, layout.height, layout.columns, contentHeight);
  const x = useMotionValue(0), y = useMotionValue(0);
  const { left, top, width: noteWidth, height: noteHeight } = shape;
  useLayoutEffect(() => {
    const measure = () => {
      const height = Math.ceil(paper.current.offsetHeight);
      setContentHeight(previous => previous === height ? previous : height);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(paper.current); measure();
    return () => observer.disconnect();
  }, []);
  // Reflow returns notes to their pins; no message data is changed by arranging.
  useEffect(() => { x.set(0); y.set(0); }, [layout.width, layout.height, top, noteWidth, noteHeight, x, y]);
  function move(event) {
    const delta = event.shiftKey ? 25 : 10;
    const keys = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta] };
    if (event.key !== 'Home' && !keys[event.key]) return;
    event.preventDefault(); event.stopPropagation(); onLift(id);
    if (event.key === 'Home') { x.set(0); y.set(0); return; }
    x.set(Math.max(4 - left, Math.min(layout.width - left - noteWidth - 4, x.get() + keys[event.key][0])));
    y.set(Math.max(4 - top, Math.min(layout.height - top - noteHeight - 4, y.get() + keys[event.key][1])));
  }
  return <motion.article className={`pinned-note ${['note-tone-cream', 'note-tone-rose', 'note-tone-sage'][shape.tone]} note-edge-${shape.edge} ${sentId === id ? 'new-note' : ''}`}
    data-message-id={id} style={{ x, y, '--wish-left': `${left}px`, '--wish-width': `${noteWidth}px`, '--wish-top': `${top}px`, '--wish-angle': `${shape.angle}deg`, '--wish-layer': active ? total + 1 : layer, '--wish-canvas-height': `${layout.height}px` }}
    initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
    transition={reduced ? { duration: 0 } : { duration: .45, ease: [.22, 1, .36, 1] }}
    drag dragControls={controls} dragListener={false} dragConstraints={wall} dragMomentum={false} dragElastic={0}
    onPointerDown={event => {
      if (event.pointerType === 'mouse' && !event.target.closest('.note-pin')) controls.start(event);
    }}
    onDragStart={() => { dragging.current = true; onLift(id); }}
    onDragEnd={() => { setTimeout(() => { dragging.current = false; }, 0); }}>
    <button type="button" className="note-pin" aria-label={`Di chuyển lời chúc của ${message.name}`} title="Kéo để di chuyển; dùng phím mũi tên khi chọn ghim, Home để đặt lại."
      onPointerDown={event => { event.stopPropagation(); onLift(id); controls.start(event); }}
      onKeyDown={move} onClick={event => event.stopPropagation()} />
    <button ref={paper} type="button" className="wish-read-button" onClick={() => { if (!dragging.current) onRead(message); }} aria-label={`Đọc lời chúc của ${message.name}`}>
      <span className="note-from">{message.name}</span>
      <p>{message.text}</p><ArrowUpRight className="wish-read-arrow" size={13} aria-hidden="true" />
    </button>
  </motion.article>;
}

export default function WishWall({ messages, sentId }) {
  const wall = useRef(null);
  const [layout, setLayout] = useState({ width: 0, height: 360, columns: 2 });
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState(null);
  const { reduced } = usePresentation();
  useLayoutEffect(() => { setActive(sentId || null); }, [sentId]);
  useLayoutEffect(() => {
    const measure = () => {
      const width = wall.current.clientWidth;
      const height = wall.current.clientHeight;
      setLayout(previous => Math.abs(previous.width - width) < .5 && previous.height === height ? previous : { width, height, columns: width >= 520 ? 3 : width >= 240 ? 2 : 1 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(wall.current); measure();
    return () => observer.disconnect();
  }, []);
  const notes = messages.map((message, index) => {
    const id = message.id || `${message.name}-${message.date}-${index}`;
    return { message, id, layer: messages.length - index };
  });
  return <div className="wish-board">
    <div ref={wall} className="pinned-notes wish-piles" role="group" aria-label={story.wishes.board}
      style={{ '--wish-count': messages.length }}>
      <AnimatePresence initial={false}>
        {notes.map(({ message, id, layer }) => <PinnedWish key={id} message={message} id={id} sentId={sentId} reduced={reduced}
          wall={wall} layout={layout} layer={layer} total={messages.length} active={active === id} onLift={setActive} onRead={setSelected} />)}
      </AnimatePresence>
      {!messages.length && <p className="empty-notes">{story.wishes.empty}</p>}
    </div>
    <AnimatePresence>{selected && <WishNoteDialog message={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
  </div>;
}
