import { useId } from 'react';
import { CalendarDays, Heart } from 'lucide-react';
import { Modal } from './Dialogs';
import { story } from '../data/story';

export default function WishNoteDialog({ message, onClose }) {
  const textId = useId();
  return <Modal label={`Lời chúc của ${message.name}`} onClose={onClose} className="note-dialog" backdropClassName="note-backdrop" descriptionId={textId}>
    <article className="note-letter">
      <span className="note-letter-pin" aria-hidden="true" />
      <header className="note-letter-header">
        <span className="note-sender-label">{story.wishes.noteFrom}</span>
        <h2>{message.name}</h2>
        {message.date && <div className="note-letter-date"><CalendarDays size={14} strokeWidth={1.5} aria-hidden="true" /><span>{message.date}</span></div>}
      </header>
      <div className="note-letter-body">
        <span className="note-quote" aria-hidden="true">“</span>
        <blockquote className="full-wish" id={textId}>{message.text}</blockquote>
      </div>
      <footer className="note-letter-footer">
        <Heart size={14} fill="currentColor" strokeWidth={1} aria-hidden="true" />
        <span>{story.wishes.noteHeading}</span>
        <button type="button" onClick={onClose}>Gấp lại</button>
      </footer>
    </article>
  </Modal>;
}
