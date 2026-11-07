import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CinemaPhoto, useMedia } from './Media';
import CoverCamera from './CoverCamera';
import { usePresentation, useSoftScroll } from './Scene';
import ThreadCat from './ThreadCat';
import { createThreadTrack } from '../lib/threadTrack';

const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, p) => a + (b - a) * p;
const smooth = value => { const p = clamp(value); return p * p * p * (p * (p * 6 - 15) + 10); };
const StoryFlowContext = createContext(null);
const HANDOFF = .08;
export const useStoryFlow = () => useContext(StoryFlowContext);

// One frame travels between scenes; each scene has its own photograph. Crossfades
// happen inside that frame, with no source swap or change to docking geometry.
// Measurements are document coordinates; image loading never drives the timeline.
export function StoryFlow({ children, openingProgress }) {
  const ref = useRef(null);
  const { cover, couple, albumLead, photos } = useMedia();
  const { compact } = usePresentation();
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const softY = useSoftScroll(scrollY, window.innerHeight * .85, .1);
  const [geometry, setGeometry] = useState(null);
  useEffect(() => {
    if (compact) { setGeometry(null); return; }
    const root = ref.current;
    function measure() {
      const scene = selector => {
        const el = root.querySelector(selector);
        return el ? { top: el.getBoundingClientRect().top + window.scrollY, travel: Math.max(1, el.offsetHeight - innerHeight) } : null;
      };
      setGeometry({ w: innerWidth, h: innerHeight, hero: scene('.hero-film'), letter: scene('.reading-film'), album: scene('.reel-film') });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [photos.length, scrollY, compact]);
  const frame = useTransform(softY, value => {
    if (!geometry) return { x: 0, y: 0, width: 0, height: 0, rotate: 0, radius: 0, opacity: 0 };
    const { w, h, hero, letter, album } = geometry;
    const mobile = w <= 700;
    const full = { x: 0, y: 0, width: w, height: h, rotate: 0, radius: 0 };
    const portrait = mobile
      ? { x: w * .65, y: h * .2, width: w * .30, height: h * .27, rotate: 5, radius: 2 }
      : { x: w * .65, y: h * .2, width: w * .29, height: h * .62, rotate: 4, radius: 2 };
    // Match the first album tile exactly before ownership switches: its center
    // is at 52.5vh and its height is 59vh (top = 23vh).
    const stack = { x: w * (mobile ? .19 : .35), y: h * .23, width: w * (mobile ? .62 : .30), height: h * .59, rotate: -6, radius: 0 };
    let from = full, to = portrait, t = smooth((value - hero.top - hero.travel * .35) / (hero.travel * .65));
    if (value > letter.top + letter.travel * .5) {
      from = portrait; to = stack;
      const end = album ? album.top + album.travel * HANDOFF : letter.top + letter.travel;
      t = smooth((value - letter.top - letter.travel * .5) / Math.max(1, end - letter.top - letter.travel * .5));
    }
    const result = Object.fromEntries(Object.keys(full).map(key => [key, mix(from[key], to[key], t)]));
    // Never crossfade two photos at different screen positions. The traveling
    // image owns the frame until it docks; then only the album tile is painted.
    if (album) result.opacity = value < hero.top - h || value >= album.top + album.travel * HANDOFF ? 0 : 1;
    else result.opacity = value < hero.top - h ? 0 : 1 - smooth((value - letter.top - letter.travel + h * .3) / (h * .3));
    return result;
  });
  const x = useTransform(frame, v => v.x), y = useTransform(frame, v => v.y);
  const width = useTransform(frame, v => v.width), height = useTransform(frame, v => v.height);
  const rotate = useTransform(frame, v => v.rotate), borderRadius = useTransform(frame, v => v.radius);
  const opacity = useTransform(frame, v => v.opacity);
  const letterOpacity = useTransform(softY, value => {
    if (!geometry || !couple) return 0;
    const { hero, letter } = geometry;
    const start = hero.top + hero.travel * .6;
    return smooth((value - start) / Math.max(1, letter.top - start));
  });
  const leadOpacity = useTransform(softY, value => {
    if (!geometry?.album || !albumLead) return 0;
    const { letter, album } = geometry;
    const start = letter.top + letter.travel * .65;
    return smooth((value - start) / Math.max(1, album.top - start));
  });
  const albumProgress = useTransform(softY, value => geometry?.album ? clamp((value - geometry.album.top) / geometry.album.travel) : 0);
  const albumPhotoOpacity = useTransform(softY, value => {
    if (!cover || reduced) return 1;
    return geometry?.album && value >= geometry.album.top + geometry.album.travel * HANDOFF ? 1 : 0;
  });
  return <StoryFlowContext.Provider value={compact ? null : { albumProgress, albumPhotoOpacity, leadSrc: albumLead?.src }}><div ref={ref} className={`story-flow ${cover && !reduced && !compact ? 'has-travel-photo' : ''}`}>
    {children}
    {cover && !reduced && !compact && <motion.div className="travel-photo" aria-hidden="true" style={{ x, y, width, height, rotate, borderRadius, opacity }}>
      <div className="travel-photo-layer travel-cover-layer" data-photo-id={cover.id}><CoverCamera photo={cover} progress={openingProgress} scroll={softY} geometry={geometry} /></div>
      {couple && <motion.div className="travel-photo-layer travel-letter-layer" data-photo-id={couple.id} style={{ opacity: letterOpacity }}><CinemaPhoto photo={couple} priority decorative /></motion.div>}
      {albumLead && <motion.div className="travel-photo-layer travel-album-layer" data-photo-id={albumLead.id} style={{ opacity: leadOpacity }}><CinemaPhoto photo={albumLead} priority decorative /></motion.div>}
      <div className="travel-photo-shade" />
    </motion.div>}
  </div></StoryFlowContext.Provider>;
}

export function RedThread({ target }) {
  const reduced = useReducedMotion();
  const path = useRef(null);
  const [track, setTrack] = useState(null);
  const [size, setSize] = useState({ w: 1000, h: 1000, viewH: innerHeight, paths: '', origin: 0, lanes: [] });
  const { scrollY } = useScroll();
  useEffect(() => {
    const root = target.current;
    let disposed = false;
    function measure() {
      const w = root.clientWidth, h = root.offsetHeight;
      const origin = root.getBoundingClientRect().top + window.scrollY;
      const scenes = [...root.querySelectorAll('.film-scene, #wishes, #closing')];
      const lanes = scenes.map(el => {
        const lane = parseFloat(getComputedStyle(el).getPropertyValue('--thread-cat-lane'));
        return { top: el.getBoundingClientRect().top + window.scrollY, lane: Number.isFinite(lane) ? lane : .74 };
      });
      let paths = `M ${w * .53} 90`;
      let previousY = 90;
      scenes.forEach((el, index) => {
        const top = el.getBoundingClientRect().top + window.scrollY - origin;
        const bottom = top + el.offsetHeight;
        const side = index % 2 ? .035 : .965;
        if (el.id === 'closing') {
          const rings = el.querySelector('.closing-rings svg').getBoundingClientRect();
          const endY = rings.top + window.scrollY - origin + rings.height * .45;
          paths += ` C ${w * side} ${mix(previousY, endY, .3)}, ${w * side} ${endY}, ${rings.left} ${endY}`;
          return;
        }
        const height = el.offsetHeight;
        const lead = Math.min(350, height * .36);
        const startY = Math.max(previousY, top + Math.min(110, lead * .34));
        // Every control point advances down the document, even in short mobile
        // scenes. Backtracking in Y makes inversion skip entire curve segments.
        paths += ` C ${w * side} ${startY}, ${w * side} ${top + Math.min(240, lead * .7)}, ${w * side} ${top + lead}`;
        paths += ` C ${w * side} ${top + height * .45}, ${w * side} ${bottom - Math.min(450, height * .4)}, ${w * side} ${bottom - Math.min(300, height * .3)}`;
        paths += ` C ${w * side} ${bottom - Math.min(210, height * .18)}, ${w * (1 - side)} ${bottom - Math.min(110, height * .09)}, ${w * (1 - side)} ${bottom - Math.min(30, height * .025)}`;
        previousY = bottom - Math.min(30, height * .025);
      });
      const viewH = innerHeight;
      setSize(current => current.w === w && current.h === h && current.viewH === viewH && current.paths === paths && current.origin === origin && JSON.stringify(current.lanes) === JSON.stringify(lanes) ? current : { w, h, viewH, paths, origin, lanes });
    }
    const observer = new ResizeObserver(measure); observer.observe(root);
    window.addEventListener('resize', measure); measure();
    document.fonts.ready.then(() => { if (!disposed) measure(); });
    return () => { disposed = true; observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [target]);
  useLayoutEffect(() => {
    if (!path.current || !size.paths || reduced) return;
    setTrack(createThreadTrack(path.current));
  }, [size.paths, reduced]);
  // Draw the string and its cat in one viewport layer. Native scrolling must
  // not subtract a newer offset from a position rendered in an earlier frame.
  // Only the cat's tilt/trot has follow-through; its anchor shares this clock.
  const position = useTransform(scrollY, scroll => {
    if (!track) return { distance: 0, viewportY: 0, offset: size.origin - scroll };
    // Match the path to a visible document position instead of equating its arc
    // length to page height. Wide curves would otherwise send the cat offscreen.
    let lane = .74;
    for (const next of size.lanes) {
      const start = next.top - innerHeight * .45;
      if (scroll < start) break;
      lane = mix(lane, next.lane, smooth((scroll - start) / (innerHeight * .6)));
    }
    const targetY = scroll + innerHeight * lane - size.origin;
    const points = track.points;
    const result = distance => ({ distance, viewportY: Math.max(points[0].y, Math.min(points[points.length - 1].y, targetY)) + size.origin - scroll, offset: size.origin - scroll });
    if (targetY <= points[0].y) return result(0);
    if (targetY >= points[points.length - 1].y) return result(track.total);
    let low = 0, high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].y < targetY) low = middle;
      else high = middle;
    }
    const ratio = clamp((targetY - points[low].y) / Math.max(.0001, points[high].y - points[low].y));
    return result(points[low].length + (points[high].length - points[low].length) * ratio);
  });
  const distance = useTransform(position, value => value.distance);
  const viewportY = useTransform(position, value => value.viewportY);
  const offset = useTransform(position, value => value.offset);
  const length = useTransform(distance, value => track?.total ? value / track.total : 0);
  if (reduced) return null;
  return <><svg className="red-thread" viewBox={`0 0 ${size.w} ${size.viewH}`} width={size.w} height={size.viewH} style={{ position: 'fixed' }} aria-hidden="true"><motion.g style={{ y: offset }}><path className="thread-shadow" d={size.paths} /><motion.path ref={path} d={size.paths} style={{ pathLength: length }} /></motion.g></svg><ThreadCat movement={scrollY} viewportY={viewportY} distance={distance} track={track} width={size.w} /></>;
}
