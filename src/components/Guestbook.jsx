import LoveMark from './LoveMark';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import Reveal from './Reveal';
import WishWall from './WishWall';
import { PageLabel } from './Editorial';
import { usePresentation } from './Scene';
import { readEntries, writeEntries } from '../lib/storage';

const examples = [
  { id: 'sample-1', name: 'Team bạn thân', text: 'Chúc hai bạn trăm năm hạnh phúc! Hẹn ngày cùng quẩy nhé ♡', date: 'Lời chúc mẫu' },
  { id: 'sample-2', name: 'Một người bạn', text: 'Mong mỗi ngày bên nhau đều là một ngày vui.', date: 'Lời chúc mẫu' },
  { id: 'sample-3', name: 'Nhà có khách', text: 'Cùng nhau đi thật nhiều nơi và giữ mãi nụ cười này nha!', date: 'Lời chúc mẫu' },
];

export default function Guestbook() {
  const { compact } = usePresentation();
  const [messages, setMessages] = useState(() => readEntries('wedding-messages', examples).map((entry, index) => ({ ...entry, id: entry.id || `legacy-${index}` })));
  const [name, setName] = useState(''); const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); const [sentId, setSentId] = useState(null);
  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !message.trim()) { setStatus('Điền tên và lời chúc trước khi gửi nhé.'); return; }
    const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const next = [{ id, name: name.trim(), text: message.trim(), date: new Date().toLocaleDateString('vi-VN') }, ...messages].slice(0, 20);
    const persisted = writeEntries('wedding-messages', next);
    setMessages(next); setName(''); setMessage(''); setSentId(id);
    setStatus(persisted ? 'Lời thương đã được ghim lên trang này. Cảm ơn bạn ♡' : 'Đã ghim lời chúc. Trình duyệt này chưa cho phép lưu khi tải lại.');
  }
  return <section id="wishes" className="guestbook-section section-shell"><PageLabel number="05">GỬI MỘT LỜI THƯƠNG</PageLabel>
    <div className="guestbook-spread"><Reveal className="letter-form-wrap" immediate={compact}><span className="eyebrow">MỘT TRANG DÀNH RIÊNG CHO BẠN</span><h2>Vài dòng thôi,<br /><em>thương thật nhiều.</em></h2><p>Để lại cho chúng mình một lời chúc.<br />Một món quà nhỏ mà hai đứa sẽ nâng niu.</p>
      <form onSubmit={submit} className="wish-form letter-form"><label htmlFor="wish-name">TỪ NGƯỜI THƯƠNG</label><input id="wish-name" placeholder="Tên của bạn" required maxLength={60} value={name} onChange={event => setName(event.target.value)} /><label htmlFor="wish-message">GỬI ANH TÚ <LoveMark /> MINH NGUYỆT</label><textarea id="wish-message" placeholder="Có điều gì muốn nhắn hai đứa không?" required maxLength={300} rows={4} value={message} onChange={event => setMessage(event.target.value)} />
        <div className="letter-form-bottom"><motion.span className="postmark" animate={sentId ? { rotate: [-12, 0, -12], scale: [1, 1.08, 1] } : { rotate: -12 }} key={sentId || 'stamp'} aria-hidden="true">GỬI BẰNG<br /><strong>YÊU THƯƠNG</strong><span>♡</span></motion.span><button type="submit" className="button button-wine">Gửi lời thương <Send size={15} /></button></div>
        <p className="form-status" role="status">{status}</p><small className="storage-note">Lời chúc được lưu trên trình duyệt của bạn.</small>
      </form></Reveal>
      <WishWall messages={messages} sentId={sentId} />
    </div><div className="section-bottom"><span>NHỮNG DÒNG CHỮ NHỎ, NHỮNG NIỀM VUI LỚN</span><span>05</span></div>
  </section>;
}
