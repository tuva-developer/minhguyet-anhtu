import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, AnimatePresence, LayoutGroup, MotionConfig, useMotionValue } from 'framer-motion';
import { wedding } from './data/site';
import { MediaProvider, useMedia } from './components/Media';
import Header from './components/Header';
import { Colophon } from './components/Editorial';
import { Cover, Letter, Aperture } from './components/SoiDuyen';
import Families from './components/Families';
import { StoryFlow, RedThread } from './components/StoryFlow';
import Album from './components/Montage';
import Schedule from './components/DateScenes';
import Guestbook from './components/Guestbook';
import { PhotoViewer, RSVP } from './components/Dialogs';
import OpeningSequence, { shouldPlayOpening } from './components/OpeningSequence';
import { OPENING_TIMELINE } from './lib/openingTimeline';
import { prefersReduced } from './lib/motion';

function Magazine() {
  const { site, photos } = useMedia();
  const [opening, setOpening] = useState(shouldPlayOpening);
  const [coverRevealing, setCoverRevealing] = useState(!opening);
  const [openingSkipped, setOpeningSkipped] = useState(false);
  const openingProgress = useMotionValue(opening ? 0 : 1);
  const openingAnimation = useRef(null);
  const startCoverReveal = useCallback((skip = false) => { setOpeningSkipped(skip); setCoverRevealing(true); }, []);
  const finishOpening = useCallback(() => { openingAnimation.current?.stop(); openingAnimation.current = null; openingProgress.set(1); setCoverRevealing(true); setOpening(false); }, [openingProgress]);
  useEffect(() => {
    if (!coverRevealing || openingProgress.get() >= 1) return;
    if (prefersReduced()) { finishOpening(); return; }
    let cancelled = false;
    const animation = animate(openingProgress, 1, { duration: openingSkipped ? OPENING_TIMELINE.skipDuration : OPENING_TIMELINE.duration, ease: 'linear' });
    openingAnimation.current = animation;
    animation.then(() => { if (!cancelled) finishOpening(); });
    return () => { cancelled = true; animation.stop(); if (openingAnimation.current === animation) openingAnimation.current = null; };
  }, [coverRevealing, openingSkipped, openingProgress, finishOpening]);
  const [modal, setModal] = useState(null);
  const [selection, setSelection] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audio = useRef(null);
  const main = useRef(null);
  const close = useCallback(() => setModal(null), []);
  const openPhoto = useCallback((id, origin = 'gallery') => {
    setSelection({ id, initialId: id, origin }); setModal('photo');
  }, []);
  const onSelect = useCallback(id => setSelection(previous => ({ ...previous, id })), []);
  useEffect(() => { if (!photos.length && modal === 'photo') setModal(null); }, [photos.length, modal]);
  async function toggleMusic() {
    if (!audio.current || loadingAudio) return;
    setAudioError('');
    if (!audio.current.paused) { audio.current.pause(); return; }
    setLoadingAudio(true);
    try { audio.current.volume = .55; await audio.current.play(); }
    catch { setAudioError('Chưa phát được nhạc. Bạn thử bật lại nhé.'); }
    finally { setLoadingAudio(false); }
  }
  return <LayoutGroup id="wedding-magazine">
    <div className="wedding-content" inert={opening ? '' : undefined}>
    <a className="skip-link" href="#opening">Đến nội dung chính</a>
    <Header playing={playing} loading={loadingAudio} onMusic={toggleMusic} onRSVP={() => setModal('rsvp')} />
    <main ref={main} className="soi-duyen">
      <StoryFlow openingProgress={openingProgress}><Cover openingProgress={openingProgress} /><Letter /><Album onPhoto={openPhoto} /></StoryFlow>
      <Families />
      <Aperture />
      <Schedule onRSVP={() => setModal('rsvp')} />
      <Guestbook />
      <Colophon onRSVP={() => setModal('rsvp')} />
      <RedThread target={main} />
    </main>
    <audio id="music" ref={audio} src={site.musicUrl || undefined} loop preload="none"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onError={() => { setPlaying(false); setAudioError('Không tải được nhạc. Nội dung thiệp vẫn sẵn sàng để xem.'); }} />
    {audioError && <div className="audio-notice" role="status"><span>{audioError}</span><button onClick={() => setAudioError('')} aria-label="Đóng thông báo nhạc">×</button></div>}
    <AnimatePresence>
      {modal === 'photo' && selection && photos.length > 0 && <PhotoViewer photos={photos} selection={selection} onSelect={onSelect} onClose={close} />}
      {modal === 'rsvp' && <RSVP onClose={close} />}
    </AnimatePresence>
    </div>
    {opening && <OpeningSequence progress={openingProgress} onReveal={startCoverReveal} onComplete={finishOpening} />}
  </LayoutGroup>;
}

export default function App({ site = wedding }) {
  return <MotionConfig reducedMotion="user"><MediaProvider site={site}><Magazine /></MediaProvider></MotionConfig>;
}
