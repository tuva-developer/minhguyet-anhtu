import { motion, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { CinemaPhoto, Photo, PaperMonogram, useMedia } from './Media';
import { useScene, SceneHUD } from './Scene';
import { goTo } from '../lib/motion';
import { interval, OPENING_TIMELINE } from '../lib/openingTimeline';
import CoverCamera from './CoverCamera';

export function Cover({ openingProgress }) {
  const { site, cover } = useMedia();
  const { ref, progress, reduced, compact } = useScene({ mobileOffset: ['start start', 'end start'] });
  const upperX = useTransform(progress, [0, .12, .55], ['0%', '-2%', '-110%']);
  const lowerX = useTransform(progress, [0, .12, .55], ['0%', '2%', '110%']);
  const namesOpacity = useTransform(progress, [.18, .5], [1, 0]);
  const quoteOpacity = useTransform(progress, [.48, .7], [0, 1]);
  const quoteY = useTransform(progress, [.48, .8], [60, 0]);
  const entry = useTransform(openingProgress, value => 1 - Math.pow(1 - interval(value, OPENING_TIMELINE.namesStart, OPENING_TIMELINE.namesEnd), 3));
  const entryUpperX = useTransform(entry, [0, 1], ['-60vw', '0vw']);
  const entryLowerX = useTransform(entry, [0, 1], ['60vw', '0vw']);
  const entryOpacity = useTransform(openingProgress, [.04, .25], [0, 1]);
  return <section id="home" className="film-scene hero-film" ref={ref} aria-label="Sợi duyên — chuyện chúng mình">
    <div className="film-stage hero-stage">
      <div className="hero-aura" /><span className="hero-year" aria-hidden="true">20<br />27</span>
      <div className="hero-window">{cover ? compact ? <CoverCamera photo={cover} progress={openingProgress} scroll={progress} stationary /> : <CinemaPhoto photo={cover} priority /> : <PaperMonogram />}<div className="hero-window-shade" /></div>
      <motion.div className="cinema-names" style={{ opacity: reduced ? 1 : namesOpacity }}>
        <span className="hero-prelude">CÓ MỘT SỢI DUYÊN, NỐI HAI CUỘC ĐỜI.</span>
        <h1 aria-label={`${site.groomFull} và ${site.brideFull}`}>
          <motion.span className="name-upper" style={{ x: reduced ? 0 : upperX }}><motion.span className="name-enter" style={reduced ? { x: 0, opacity: 1 } : { x: entryUpperX, opacity: entryOpacity }}>{site.groom}</motion.span></motion.span>
          <motion.span className="name-lower" style={{ x: reduced ? 0 : lowerX }}><motion.span className="name-enter" style={reduced ? { x: 0, opacity: 1 } : { x: entryLowerX, opacity: entryOpacity }}>{site.bride}</motion.span></motion.span>
        </h1>
      </motion.div>
      {!reduced && !compact && <motion.div className="hero-revelation" style={{ opacity: quoteOpacity, y: quoteY }}><span className="cinema-kicker">CHUYỆN BẮT ĐẦU TỪ</span><p>Hai người.<br /><em>Một sợi duyên.</em></p><span className="hero-promise">Cuộn tiếp, cùng chúng mình viết nên một đời.</span></motion.div>}
      <button className="cinema-quick-date" onClick={() => goTo('event')}>26.12.2026 — 30.01.2027 <ArrowUpRight size={15} /><span>XEM LỊCH CƯỚI</span></button>
      <SceneHUD number="01" label="SỢI DUYÊN" progress={progress}><button className="hud-scroll" onClick={() => goTo('opening')}>THEO MÌNH, QUA TỪNG KHOẢNH KHẮC <ArrowDown size={14} /></button></SceneHUD>
    </div>
  </section>;
}

function LitWord({ children, index, count, progress, reduced, compact }) {
  const start = index / count * (compact ? .7 : .45);
  const end = start + (compact ? .25 : .1);
  const opacity = useTransform(progress, [start, end], [.18, 1]);
  const y = useTransform(progress, [start, end], [20, 0]);
  return <motion.span style={{ opacity: reduced ? 1 : opacity, y: reduced ? 0 : y }}>{children} </motion.span>;
}

export function Letter() {
  const { site, couple } = useMedia();
  const { ref, progress, reduced, compact } = useScene();
  const words = 'Có những cuộc gặp, trở thành cả một cuộc đời.'.split(' ');
  const opacity = useTransform(progress, [.56, .88], [1, 0]);
  const y = useTransform(progress, [.56, .9], [0, -60]);
  const imageX = useTransform(progress, [0, 1], [24, 0]);
  const imageY = useTransform(progress, [0, 1], [14, 0]);
  const imageRotate = useTransform(progress, [0, 1], [-5, 0]);
  return <section id="opening" className="film-scene reading-film" ref={ref}><div className="film-stage reading-stage">
    <span className="reading-backword" aria-hidden="true">thương.</span>
    <motion.div className="reading-content" style={reduced || compact ? undefined : { opacity, y }}><span className="cinema-kicker">GỬI NGƯỜI THƯƠNG MẾN</span><h2>{words.map((word, index) => <LitWord key={index} index={index} count={words.length} progress={progress} reduced={reduced} compact={compact}>{word}</LitWord>)}</h2><motion.div className="reading-rule" style={compact && !reduced ? { scaleX: progress, transformOrigin: 'left' } : undefined} /><p>{site.groomFull} và {site.brideFull}<br />trân trọng mời bạn đến chung vui, và cùng giữ lại một ngày thật đẹp.</p></motion.div>
    {couple && <motion.figure className="reading-image" style={compact && !reduced ? { x: imageX, y: imageY, rotate: imageRotate } : undefined}><Photo photo={couple} /><figcaption>một người, để gọi là nhà.</figcaption></motion.figure>}
    <SceneHUD number="02" label="MỘT CUỘC GẶP, MỘT ĐỜI" progress={progress} />
  </div></section>;
}

function WaveLetter({ char, index, count, progress, direction, reduced }) {
  const y = useTransform(progress, p => `${Math.sin(index / count * Math.PI * 2 + p * Math.PI * 3) * .45 * Math.max(0, 1 - p / .8) * direction}em`);
  const rotate = useTransform(progress, p => Math.cos(index / count * Math.PI * 2 + p * Math.PI * 3) * 12 * Math.max(0, 1 - p / .8) * direction);
  return <motion.span style={reduced ? undefined : { y, rotate }}>{char === ' ' ? '\u00a0' : char}</motion.span>;
}

export function Aperture() {
  const { ref, progress, reduced } = useScene();
  const animationProgress = progress;
  const x1 = useTransform(animationProgress, [0, .8], ['-25%', '0%']);
  const x2 = useTransform(animationProgress, [0, .8], ['25%', '0%']);
  const line = useTransform(animationProgress, [.55, .9], [0, 1]);
  return <section className="film-scene aperture-film wave-film" ref={ref} aria-label="Từ hôm nay, mình có nhau"><div className="film-stage wave-stage">
    <span className="cinema-kicker wave-kicker">CHẲNG CẦN ĐIỀU GÌ LỚN LAO</span>
    <h2 className="wave-type" aria-label="Từ hôm nay, mình có nhau.">{['Từ hôm nay,', 'mình có nhau.'].map((text, row) => <motion.span className="wave-row" key={text} style={{ x: reduced ? 0 : row ? x2 : x1 }} aria-hidden="true">{Array.from(text).map((char, index) => <WaveLetter key={index} char={char} index={index} count={text.length} progress={animationProgress} direction={row ? -1 : 1} reduced={reduced} />)}</motion.span>)}</h2>
    <motion.div className="wave-underline" style={{ scaleX: reduced ? 1 : line }} /><span className="wave-caption">VÀ BA CUỘC HẸN, ĐỂ BẮT ĐẦU MỘT ĐỜI.</span>
    <SceneHUD number="05" label="LỜI HẸN" progress={progress} />
  </div></section>;
}
