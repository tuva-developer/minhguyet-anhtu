import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import Reveal from './Reveal';
import WishWall from './WishWall';
import { PageLabel } from './Editorial';
import { readEntries, writeEntries } from '../lib/storage';
import { story } from '../data/story';

const examples = [
  { id: 'sample-1', name: 'Team bạn thân', text: 'Chúc hai bạn trăm năm hạnh phúc! Hẹn ngày cùng quẩy nhé ♡', date: 'Lời chúc mẫu' },
  { id: 'sample-2', name: 'Một người bạn', text: 'Mong mỗi ngày bên nhau đều là một ngày vui.', date: 'Lời chúc mẫu' },
  { id: 'sample-3', name: 'Nhà có khách', text: 'Cùng nhau đi thật nhiều nơi và giữ mãi nụ cười này nha!', date: 'Lời chúc mẫu' },
];

export default function Guestbook() {
  const [messages, setMessages] = useState(() => readEntries('wedding-messages', examples).map((entry, index) => ({ ...entry, id: entry.id || `legacy-${index}` })));
  const [name, setName] = useState(''); const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); const [sentId, setSentId] = useState(null);
  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !message.trim()) { setStatus('Điền tên và lời chúc trước khi gửi nhé.'); return; }
    const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const next = [{ id, name: name.trim(), text: message.trim(), date: new Date().toLocaleDateString('vi-VN') }, ...messages];
    const persisted = writeEntries('wedding-messages', next);
    setMessages(next); setName(''); setMessage(''); setSentId(id);
    setStatus(persisted ? story.wishes.success : story.wishes.storageError);
  }
  return <section id="wishes" className="guestbook-section section-shell"><PageLabel number={story.chapters.wishes}>{story.wishes.chapter}</PageLabel>
    <div className="guestbook-spread"><div className="letter-form-wrap"><motion.span className="postmark" animate={sentId ? { rotate: [-12, 0, -12], scale: [1, 1.08, 1] } : { rotate: -12 }} key={sentId || 'stamp'} aria-hidden="true"><span className="postmark-copy">GỬI BẰNG<strong>YÊU THƯƠNG</strong></span><span>♡</span></motion.span><Reveal className="letter-form-heading" y={16}><span className="eyebrow">{story.wishes.kicker}</span><h2>{story.wishes.title[0]}<br /><em>{story.wishes.title[1]}</em></h2></Reveal><p>{story.wishes.body}</p>
      <form onSubmit={submit} className="wish-form letter-form"><label htmlFor="wish-name">{story.wishes.nameLabel}</label><input id="wish-name" placeholder="Tên của bạn" required maxLength={60} value={name} onChange={event => setName(event.target.value)} /><label htmlFor="wish-message">{story.wishes.messageLabel}</label><textarea id="wish-message" placeholder={story.wishes.placeholder} required maxLength={300} rows={3} value={message} onChange={event => setMessage(event.target.value)} />
        <div className="letter-form-bottom"><p className="form-status" role="status">{status}</p><button type="submit" className="button button-wine">{story.wishes.submit} <Send size={15} /></button></div>
      </form></div>
      <WishWall messages={messages} sentId={sentId} />
    </div><div className="section-bottom"><span>{story.wishes.bottom}</span><span>{story.chapters.wishes}</span></div>
  </section>;
}
