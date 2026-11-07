import { useEffect, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Grid2X2, Plus, X } from 'lucide-react';
import { CinemaPhoto, Photo, useMedia } from './Media';
import { useScene, SceneHUD, seekScene } from './Scene';
import Reveal from './Reveal';
import { useStoryFlow } from './StoryFlow';
import { goTo } from '../lib/motion';

const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { const p = clamp(x); return p * p * p * (p * (p * 6 - 15) + 10); };
const mix = (a, b, p) => a + (b - a) * p;

function Tile({ photo, index, count, progress, compact, reduced, phase, viewport, onPhoto, photoOwnership, leadSrc, exitIndex, activeIndex }) {
  const frame = useTransform(progress, p => {
    const { w, h } = viewport;
    const cols = count === 1 ? 1 : compact ? 2 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols), gap = compact ? 10 : 18;
    const gridWidth = w * (count === 1 ? compact ? .68 : .36 : compact ? .88 : .72);
    const gridHeight = h * .59;
    const tileW = (gridWidth - gap * (cols - 1)) / cols;
    const tileH = (gridHeight - gap * (rows - 1)) / rows;
    const col = index % cols, row = Math.floor(index / cols);
    const gx = -gridWidth / 2 + col * (tileW + gap) + tileW / 2;
    const gy = -gridHeight / 2 + row * (tileH + gap) + tileH / 2 + h * .035;
    const assemble = ease((p - .14 - index * .012) / .30);
    const expand = ease((p - .64) / .34);
    const sw = w * (compact ? .62 : .30), sh = h * .59;
    const isExit = index === exitIndex;
    const spread = index < 5 ? 1 : 0;
    const sx = Math.sin(index * 1.6) * w * .085 * spread;
    const sy = Math.cos(index * 1.6) * h * .025 * spread;
    return {
      x: mix(mix(sx, gx, assemble), isExit ? 0 : gx * 3, expand),
      y: mix(mix(sy, gy, assemble), isExit ? 0 : gy * 2.8, expand),
      width: mix(mix(sw, tileW, assemble), isExit ? w : tileW, expand),
      height: mix(mix(sh, tileH, assemble), isExit ? h : tileH, expand),
      rotate: mix(-6 + index * 4, 0, assemble),
      opacity: isExit ? (index < 5 ? 1 : assemble) : mix(index < 5 ? 1 : assemble, 0, expand),
    };
  });
  const x = useTransform(frame, f => f.x), y = useTransform(frame, f => f.y);
  const width = useTransform(frame, f => f.width), height = useTransform(frame, f => f.height);
  const rotate = useTransform(frame, f => f.rotate);
  const opacity = useTransform([frame, photoOwnership], ([f, owned]) => f.opacity * (index === 0 || photo.src === leadSrc ? owned : 1));
  const caption = useTransform(progress, [.15, .4, .65, .78], [0, 1, 1, 0]);
  const dockShade = useTransform(progress, [.08, .24], [1, 0]);
  const accessible = reduced || phase === 'grid' || index === activeIndex;
  return <motion.div className={`reel-frame montage-tile ${index === activeIndex ? 'is-current' : ''}`} data-photo-id={photo.id} style={reduced ? undefined : { x, y, width, height, rotate, opacity, zIndex: index === activeIndex ? 5 : 4 }} inert={!accessible ? '' : undefined}>
    <button className="reel-photo-button" onClick={() => onPhoto(photo.id, 'reel')} aria-label={`Xem ảnh: ${photo.caption || photo.alt}`} tabIndex={accessible ? 0 : -1}>
      <motion.div className="reel-surface" layoutId={`reel-${photo.id}`}>{!reduced && (index === 0 || index === exitIndex) ? <><CinemaPhoto photo={photo} priority />{index === 0 && <motion.div className="travel-photo-shade" style={{ opacity: dockShade }} />}</> : <Photo photo={photo} priority={index < 3} sizes="(max-width: 700px) 100vmax, 60vw" style={{ objectPosition: photo.position || '50% 20%' }} />}</motion.div>
      <motion.span className="reel-photo-caption" style={{ opacity: reduced ? 1 : caption }}><small>{String(index + 1).padStart(2, '0')}</small>{photo.caption || 'Có nhau.'}<ArrowUpRight size={15} /></motion.span>
    </button>
  </motion.div>;
}

function ContactSheet({ photos, onPhoto }) {
  const [limit, setLimit] = useState(12);
  return <div className="reel-contact-sheet"><div className="contact-sheet-heading"><span>TOÀN BỘ NHỮNG KHOẢNH KHẮC</span><span>{photos.length} ẢNH / CHẠM ĐỂ XEM</span></div><div className={`album-grid ${photos.length === 1 ? 'single-photo' : ''}`}>{photos.slice(0, limit).map((photo, index) => <Reveal key={photo.id} className={`album-card ${index % 3 === 1 ? 'offset-card' : ''}`}><button className="album-photo-button" onClick={() => onPhoto(photo.id, 'gallery')} aria-label={`Xem ảnh: ${photo.caption || photo.alt}`}><motion.div className="photo-surface" layoutId={`gallery-${photo.id}`}><Photo photo={photo} /><span className="photo-open"><ArrowUpRight size={20} /></span></motion.div><span className="album-caption"><small>{String(index + 1).padStart(2, '0')}</small><span>{photo.caption || photo.alt}</span><ArrowUpRight size={13} /></span></button></Reveal>)}</div>{limit < photos.length && <div className="load-more"><button className="button button-outline" onClick={() => setLimit(value => value + 12)}>Xem thêm những trang ảnh <Plus size={16} /></button></div>}</div>;
}

function MobileTile({ photo, index, count, progress, onPhoto, reduced }) {
  const arrive = useTransform(progress, p => ease((p - index * .06) / .82));
  const x = useTransform(arrive, [0, 1], [`${count === 1 ? 0 : index % 2 ? -45 : 45}%`, '0%']);
  const y = useTransform(arrive, [0, 1], [`${count <= 2 ? 0 : index < 2 ? 30 : -30}%`, '0%']);
  const rotate = useTransform(arrive, [0, 1], [-8 + index * 5, 0]);
  const scale = useTransform(arrive, [0, 1], [.9, 1]);
  return <motion.div className="reel-frame montage-tile mobile-album-tile" data-photo-id={photo.id}
    style={reduced ? undefined : { x, y, rotate, scale, zIndex: count - index }}>
    <button className="reel-photo-button" onClick={() => onPhoto(photo.id, 'reel')} aria-label={`Xem ảnh: ${photo.caption || photo.alt}`}>
      <motion.div className="reel-surface" layoutId={`reel-${photo.id}`}><Photo photo={photo} sizes="44vw" priority={index < 2} style={{ objectPosition: photo.position || '50% 25%' }} /></motion.div>
      <span className="reel-photo-caption"><small>{String(index + 1).padStart(2, '0')}</small>{photo.caption || 'Có nhau.'}</span>
    </button>
  </motion.div>;
}

function Montage({ photos, onPhoto }) {
  const { site, albumLead } = useMedia();
  const { ref, progress: sceneProgress, compact, reduced } = useScene();
  const flow = useStoryFlow();
  const standaloneOwnership = useMotionValue(1);
  // Use the camera's clock so both sides of the handoff update in one frame.
  const progress = flow?.albumProgress || sceneProgress;
  const [phase, setPhase] = useState(() => progress.get() < .4 ? 'stack' : progress.get() < .64 ? 'grid' : 'full');
  const [focusExit, setFocusExit] = useState(() => progress.get() >= .52);
  const [expanded, setExpanded] = useState(false);
  const viewport = { w: window.innerWidth, h: window.innerHeight };
  // useScene rerenders at the mobile breakpoint; resize measurements inside the
  // travel scene also update this stage through the native resize event.
  const [dimensions, setDimensions] = useState(viewport);
  useResize(setDimensions);
  useMotionValueEvent(progress, 'change', p => {
    if (compact) return;
    setPhase(p < .4 ? 'stack' : p < .64 ? 'grid' : 'full');
    setFocusExit(p >= .52);
  });
  // Choose by stable ID and fall back to another available source. The actual
  // album tile takes over; no source swapping or duplicate photo is introduced.
  const leadPhoto = albumLead || photos[0];
  const finalPhoto = photos.find(photo => photo.id === site.albumFinalPhotoId && photo.src !== leadPhoto.src)
    || photos.find(photo => photo.src !== leadPhoto.src) || leadPhoto;
  const preferred = (site.albumPreviewPhotoIds || []).map(id => photos.find(photo => photo.id === id)).filter(Boolean);
  const ordered = [...new Map([leadPhoto, ...preferred, ...photos].map(photo => [photo.id, photo])).values()];
  const preview = ordered.slice(0, compact ? 4 : reduced ? photos.length : 6);
  if (!preview.some(photo => photo.id === finalPhoto.id)) preview[preview.length - 1] = finalPhoto;
  const exitIndex = preview.findIndex(photo => photo.id === finalPhoto.id);
  const activeIndex = !compact && focusExit ? exitIndex : 0;
  const titleOpacity = useTransform(progress, [.66, .79], [1, 0]);
  const endingOpacity = useTransform(progress, [.83, .96], [0, 1]);
  function toggle() {
    setExpanded(v => !v);
    if (!expanded) requestAnimationFrame(() => document.getElementById('contact-sheet')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }));
  }
  return <section className={`reel-section ${expanded ? 'contact-open' : ''}`} id="story"><div ref={ref} className="film-scene reel-film montage-film">
    <div className="film-stage reel-stage montage-stage" data-phase={compact ? 'grid' : phase} data-primary-photo={preview[activeIndex].id}>
      <motion.div className="reel-heading" style={{ opacity: reduced || compact ? 1 : titleOpacity }}><span className="cinema-kicker">GOM TỪNG KHOẢNH KHẮC, THÀNH MỘT ĐỜI.</span><p>Những ngày <em>có nhau.</em></p><span className="reel-counter">{String(photos.length).padStart(2, '0')}<small>KHOẢNH KHẮC</small></span></motion.div>
      <div className={`reel-space montage-space ${compact ? 'mobile-album-grid' : ''} ${preview.length === 1 ? 'single-photo' : ''}`} style={compact ? { gridTemplateRows: `repeat(${Math.ceil(preview.length / 2)}, minmax(0, 1fr))` } : undefined}>{preview.map((photo, index) => compact
        ? <MobileTile key={photo.id} photo={photo} index={index} count={preview.length} progress={progress} onPhoto={onPhoto} reduced={reduced} />
        : <Tile key={photo.id} photo={photo} index={index} count={preview.length} progress={progress} compact={compact} reduced={reduced} phase={phase} viewport={dimensions} onPhoto={onPhoto} photoOwnership={flow?.albumPhotoOpacity || standaloneOwnership} leadSrc={flow?.leadSrc} exitIndex={exitIndex} activeIndex={activeIndex} />)}</div>
      {!reduced && !compact && <motion.p className="montage-ending" style={{ opacity: endingOpacity }}>Một đời,<br /><em>có nhau.</em></motion.p>}
      <div className="reel-controls"><button className="reel-contact-toggle" aria-expanded={expanded} onClick={toggle}><Grid2X2 size={14} />{expanded ? 'Đóng toàn bộ album' : 'Xem toàn bộ album'}<ArrowDown size={14} /></button>{!reduced && !compact && <button className="montage-view-grid" onClick={() => seekScene(ref, .53)}>DỪNG LẠI MỘT CHÚT <span>↗</span></button>}</div>
      <SceneHUD number="03" label="NHỮNG NGÀY CÓ NHAU" progress={progress}>{compact ? <button className="hud-scroll" onClick={() => goTo('couple')}>HAI CHÚNG MÌNH <ArrowDown size={14} /></button> : undefined}</SceneHUD>
    </div>
    </div>{expanded && <div id="contact-sheet"><ContactSheet photos={photos} onPhoto={onPhoto} /><button className="contact-close" onClick={() => { setExpanded(false); if (compact) goTo('story'); else seekScene(ref, .53); }}>Gấp album lại <X size={16} /></button></div>}
  </section>;
}

function useResize(update) {
  useEffect(() => { const resize = () => update({ w: innerWidth, h: innerHeight }); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, [update]);
}

export default function Album(props) {
  const { photos } = useMedia();
  return photos.length ? <Montage photos={photos} {...props} /> : null;
}
