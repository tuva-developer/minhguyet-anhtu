import { motion, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { CinemaPhoto, Photo, PaperMonogram, useMedia } from './Media';
import { useScene, useEnterProgress, usePresentation, SceneHUD } from './Scene';
import { goTo } from '../lib/motion';
import { interval, OPENING_TIMELINE } from '../lib/openingTimeline';
import CoverCamera from './CoverCamera';
import { story } from '../data/story';

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
  // Complete the cover's own gesture before the profile page arrives.
  const retreat = useTransform(progress, p => {
    const t = Math.max(0, Math.min(1, (p - .28) / .62));
    return t * t * t * (t * (t * 6 - 15) + 10);
  });
  const photoLeft = useTransform(retreat, [0, 1], ['0%', '50%']);
  // A landscape keeps both people in the cover photograph. CSS viewport units
  // resize the end frame without changing the crop mode halfway through.
  const photoTop = useTransform(retreat, t => `calc(${t * 50}% - min(${t * 31}svh, ${t * 14.6667}vw))`);
  const photoWidth = useTransform(retreat, [0, 1], ['100%', '44%']);
  const photoHeight = useTransform(retreat, t => `calc(${(1 - t) * 100}% + min(${t * 62}svh, ${t * 29.3333}vw))`);
  const photoRotate = useTransform(retreat, [0, 1], [0, 4]);
  return <section id="home" className="film-scene hero-film" ref={ref} aria-label={story.cover.prelude}>
    <div className="film-stage hero-stage">
      <div className="hero-aura" /><span className="hero-year" aria-hidden="true">20<br />27</span>
      <motion.div className="hero-window" style={reduced || compact ? { left: '0%', top: '0%', width: '100%', height: '100%', rotate: 0 } : { left: photoLeft, top: photoTop, width: photoWidth, height: photoHeight, rotate: photoRotate }}>{cover ? reduced ? <CinemaPhoto photo={cover} priority /> : <CoverCamera photo={cover} progress={openingProgress} scroll={progress} compact={compact} /> : <PaperMonogram />}<div className="hero-window-shade" /></motion.div>
      <motion.div className="cinema-names" style={{ opacity: reduced ? 1 : namesOpacity }}>
        <span className="hero-prelude">{story.cover.prelude}</span>
        <h1 aria-label={`${site.groomFull} và ${site.brideFull}`}>
          <motion.span className="name-upper" style={{ x: reduced ? 0 : upperX }}><motion.span className="name-enter" style={reduced ? { x: 0, opacity: 1 } : { x: entryUpperX, opacity: entryOpacity }}>{site.groom}</motion.span></motion.span>
          <motion.span className="name-lower" style={{ x: reduced ? 0 : lowerX }}><motion.span className="name-enter" style={reduced ? { x: 0, opacity: 1 } : { x: entryLowerX, opacity: entryOpacity }}>{site.bride}</motion.span></motion.span>
        </h1>
      </motion.div>
      {!reduced && !compact && <motion.div className="hero-revelation" style={{ opacity: quoteOpacity, y: quoteY }}><span className="cinema-kicker">{story.cover.kicker}</span><p>{story.cover.title[0]}<br /><em>{story.cover.title[1]}</em></p><span className="hero-promise">{story.cover.body}</span></motion.div>}
      <button className="cinema-quick-date" onClick={() => goTo('event')}>26.12.2026 — 30.01.2027 <ArrowUpRight size={15} /><span>{story.actions.calendar}</span></button>
      <SceneHUD number={story.chapters.home} label={story.cover.chapter} progress={progress}><button className="hud-scroll" onClick={() => goTo('couple')}>{story.cover.next} <ArrowDown size={14} /></button></SceneHUD>
    </div>
  </section>;
}

function LitPhrase({ children, index, progress, reduced }) {
  const opacity = useTransform(progress, [index * .2, .65 + index * .2], [.25, 1]);
  return <motion.span style={{ display: 'inline', opacity: reduced ? 1 : opacity }}>{children} </motion.span>;
}

export function Letter() {
  const { couple } = useMedia();
  const { ref, progress, reduced, compact } = useScene({ mobileMode: 'enter' });
  const textRef = useRef(null), imageRef = useRef(null);
  const textEntry = useEnterProgress(textRef, { duration: .85 });
  const imageEntry = useEnterProgress(imageRef, { duration: .9 });
  const phrases = story.letter.title;
  const opacity = useTransform(progress, [.56, .88], [1, 0]);
  const y = useTransform(progress, [.56, .9], [0, -60]);
  const headlineY = useTransform(textEntry, [0, 1], [10, 0]);
  const imageX = useTransform(imageEntry, [0, 1], [24, 0]);
  const imageY = useTransform(imageEntry, [0, 1], [14, 0]);
  const imageRotate = useTransform(imageEntry, [0, 1], [-5, 0]);
  return <section id="opening" className="film-scene reading-film" ref={ref}><div className="film-stage reading-stage">
    <span className="reading-backword" aria-hidden="true">thương.</span>
    <motion.div ref={textRef} className="reading-content" style={reduced || compact ? undefined : { opacity, y }}><span className="cinema-kicker">{story.letter.kicker}</span><motion.h2 style={reduced ? undefined : { y: headlineY }}>{phrases.map((phrase, index) => <LitPhrase key={phrase} index={index} progress={textEntry} reduced={reduced}>{phrase}</LitPhrase>)}</motion.h2><motion.div className="reading-rule" style={{ scaleX: reduced ? 1 : textEntry, transformOrigin: 'left' }} />{story.letter.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</motion.div>
    {couple && <motion.figure ref={imageRef} className="reading-image" style={compact && !reduced ? { x: imageX, y: imageY, rotate: imageRotate } : undefined}><Photo photo={couple} /><figcaption>{story.letter.caption}</figcaption></motion.figure>}
    <SceneHUD number={story.chapters.opening} label={story.letter.chapter} progress={progress} />
  </div></section>;
}

function WaveLetter({ char, index, count, progress, direction, reduced }) {
  const y = useTransform(progress, p => `${Math.sin(index / count * Math.PI * 2 + p * Math.PI * 3) * .45 * Math.max(0, 1 - p / .8) * direction}em`);
  const rotate = useTransform(progress, p => Math.cos(index / count * Math.PI * 2 + p * Math.PI * 3) * 12 * Math.max(0, 1 - p / .8) * direction);
  return <motion.span style={reduced ? undefined : { y, rotate }}>{char === ' ' ? '\u00a0' : char}</motion.span>;
}

export function Aperture() {
  const ref = useRef(null);
  const { reduced } = usePresentation();
  const animationProgress = useEnterProgress(ref, { duration: 1 });
  const x1 = useTransform(animationProgress, [0, .8], ['-25%', '0%']);
  const x2 = useTransform(animationProgress, [0, .8], ['25%', '0%']);
  const line = useTransform(animationProgress, [.55, .9], [0, 1]);
  const roof = useTransform(animationProgress, [0, .85], [0, 1]);
  return <section id="promise" className="film-scene aperture-film wave-film promise-interlude" data-scene-mode={reduced ? 'static' : 'enter'} aria-label={story.promise.title.join(' ')}><div className="film-stage wave-stage">
    <span className="cinema-kicker wave-kicker">{story.promise.kicker}</span>
    <svg className="promise-home" viewBox="0 0 200 82" fill="none" aria-hidden="true">
      <motion.path d="M5 69C24 69 35 64 49 64H63V38L100 10L137 38V64H151C165 64 176 69 195 69" style={{ pathLength: reduced ? 1 : roof }} />
      <motion.path className="promise-home-door" d="M90 64V47Q100 35 110 47V64M49 38L100 0L151 38" style={{ pathLength: reduced ? 1 : line }} />
    </svg>
    <h2 ref={ref} className="wave-type" aria-label={story.promise.title.join(' ')}>{story.promise.title.map((text, row) => <motion.span className="wave-row" key={text} style={{ x: reduced ? 0 : row ? x2 : x1 }} aria-hidden="true">{Array.from(text).map((char, index) => <WaveLetter key={index} char={char} index={index} count={text.length} progress={animationProgress} direction={row ? -1 : 1} reduced={reduced} />)}</motion.span>)}</h2>
    <motion.div className="wave-underline" style={{ scaleX: reduced ? 1 : line }} /><span className="wave-caption">{story.promise.caption}</span>
    <SceneHUD number={story.chapters.promise} label={story.promise.chapter} showProgress={false}><button className="hud-scroll" onClick={() => goTo('event')}>{story.actions.calendar} <ArrowDown size={13} /></button></SceneHUD>
  </div></section>;
}
