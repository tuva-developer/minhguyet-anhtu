import { Heart } from 'lucide-react';

export default function LoveMark({ decorative = false }) {
  return <span className="love-mark" aria-hidden={decorative || undefined}><Heart size="1em" strokeWidth={1.5} fill="currentColor" aria-hidden="true" focusable="false" />{!decorative && <span className="sr-only"> và </span>}</span>;
}
