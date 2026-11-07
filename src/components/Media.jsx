import LoveMark from './LoveMark';
import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';

const MediaContext = createContext(null);

export function normalizePhotos(input) {
  const seen = new Set();
  return (Array.isArray(input) ? input : []).flatMap(photo => {
    if (!photo || typeof photo.src !== 'string' || !photo.src.trim()) return [];
    const id = String(photo.id || photo.src);
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ ...photo, id, alt: photo.alt || 'Khoảnh khắc của chúng mình' }];
  });
}

export function MediaProvider({ site, children }) {
  const [failed, setFailed] = useState(() => new Set());
  const fail = useCallback(src => setFailed(previous => {
    if (previous.has(src)) return previous;
    return new Set([...previous, src]);
  }), []);
  const value = useMemo(() => {
    const photos = normalizePhotos(site.photos).filter(photo => !failed.has(photo.src));
    const available = photo => {
      if (!photo?.src || failed.has(photo.src)) return null;
      return photo.cutout && (failed.has(photo.cutout.src) || failed.has(photo.cutout.maskSrc)) ? { ...photo, cutout: null } : photo;
    };
    const cover = available(site.heroPhoto) || photos[0] || null;
    const couple = available(site.couplePhoto) || photos.find(photo => photo.src !== cover?.src) || null;
    const bride = available(site.bridePortrait), groom = available(site.groomPortrait);
    const albumLead = photos.find(photo => photo.id === site.albumLeadPhotoId)
      || photos.find(photo => photo.src === cover?.src) || photos[0] || null;
    // Missing event images use an unused album image, never the cover again.
    const reserved = new Set([cover, couple, bride, groom, albumLead].filter(Boolean).map(photo => photo.src));
    for (const photo of photos) {
      if (site.albumPreviewPhotoIds?.includes(photo.id) || photo.id === site.albumFinalPhotoId) reserved.add(photo.src);
    }
    const eventPhotos = Object.fromEntries((site.events || []).map(event => {
      const requested = available(event.photo);
      const chosen = requested && !reserved.has(requested.src) ? requested : photos.find(photo => !reserved.has(photo.src)) || null;
      if (chosen) reserved.add(chosen.src);
      return [event.id, chosen];
    }));
    return {
      site, photos, fail,
      cover, couple, bride, groom, albumLead, eventPhotos,
    };
  }, [site, failed, fail]);
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}

export const useMedia = () => useContext(MediaContext);

export function Photo({ photo, className = '', priority = false, onLoad, style, sizes = '100vw', alt = photo?.alt || '', ...props }) {
  const { fail } = useMedia();
  if (!photo) return null;
  return <img {...props} className={className} src={photo.src} alt={alt}
    srcSet={photo.srcSet || undefined} sizes={photo.srcSet ? sizes : undefined}
    width={photo.width || undefined} height={photo.height || undefined}
    style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : 'auto 2 / 3', objectPosition: photo.position || '50% 40%', ...style }}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
    onLoad={onLoad} onError={() => fail(photo.src)} />;
}

// A registered alpha matte hides the garden; every visible color pixel still
// comes from the untouched photograph, including the actual face. Keep the mask
// inside the SVG so the outer outline/shadow sees the resulting silhouette.
export function CutoutPhoto({ photo, cutout, className = '', alt, sizes }) {
  const maskId = useId();
  const alphaId = `${maskId}-alpha`;
  const { fail } = useMedia();
  if (!cutout?.maskSrc) return <Photo photo={cutout || photo} className={className} alt={alt} sizes={sizes} />;
  const { width, height } = photo;
  return <svg className={className} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
    role="img" aria-label={alt} data-original-src={photo.src} style={{ aspectRatio: `${width} / ${height}` }}>
    <defs>
      <filter id={alphaId} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.02" /></feComponentTransfer></filter>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} style={{ maskType: 'alpha' }}>
        <image href={cutout.maskSrc} width={width} height={height} preserveAspectRatio="none" filter={`url(#${alphaId})`} onError={() => fail(cutout.maskSrc)} />
      </mask>
    </defs>
    <image href={photo.src} width={width} height={height} mask={`url(#${maskId})`} onError={() => fail(photo.src)} />
  </svg>;
}

// Portraits keep their detail on wide stages. A subdued ambient copy fills the
// sides; the sharp foreground stays within its frame instead of being blown up.
export function CinemaPhoto({ photo, priority = false, decorative = false }) {
  if (!photo) return null;
  const portrait = !photo.width || !photo.height || photo.width / photo.height < .85;
  return <div className={`cinema-photo ${portrait ? 'portrait-photo' : ''} ${photo.mobileFit === 'contain' ? 'mobile-letterbox' : ''}`}>
    <Photo photo={photo} className="cinema-ambient" sizes="100vmax" priority={priority} aria-hidden="true" alt="" />
    <Photo photo={photo} className="cinema-subject" sizes="100vmax" priority={priority} aria-hidden={decorative || undefined} alt={decorative ? '' : photo.alt} />
  </div>;
}

export function PaperMonogram({ className = '' }) {
  return <div className={`paper-monogram ${className}`} aria-hidden="true"><span>T</span><i><LoveMark /></i><span>N</span></div>;
}
