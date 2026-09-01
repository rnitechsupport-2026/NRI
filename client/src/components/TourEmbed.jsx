import { useState } from 'react';
import { Cube, Play, Expand } from './Icons.jsx';

/**
 * 3D walkthrough / virtual tour viewer.
 *
 * The API only ever hands us a sanitised `src` (see server/src/utils/embed.js),
 * never raw HTML — so we build the iframe ourselves and sandbox it. The tour is
 * click-to-load so a listing page never pays for a heavy Matterport bundle
 * unless the visitor actually asks for it.
 */
export default function TourEmbed({ url, provider, poster, title = '3D Walkthrough' }) {
  const [live, setLive] = useState(false);
  const [full, setFull] = useState(false);

  if (!url) return null;

  const label = {
    matterport: 'Matterport 3D Tour',
    kuula: '360° Virtual Tour',
    youtube: 'Video Walkthrough',
    vimeo: 'Video Walkthrough',
    sketchfab: '3D Model',
    google: 'Street View',
  }[provider] || '3D Walkthrough';

  const frame = (
    <iframe
      src={url}
      title={title}
      loading="lazy"
      allow="xr-spatial-tracking; fullscreen; accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms"
      style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
    />
  );

  return (
    <>
      <div className="tour">
        <div className="tour-frame">
          {live ? frame : (
            <button className="tour-poster" onClick={() => setLive(true)}>
              {poster && <img src={poster} alt="" />}
              <span className="tour-shade" />
              <span className="tour-cta">
                <span className="tour-ic">{provider === 'youtube' || provider === 'vimeo' ? <Play /> : <Cube />}</span>
                <b>Launch {label}</b>
                <em>Walk through this property in 3D — drag to look around</em>
              </span>
            </button>
          )}
        </div>

        <div className="tour-bar">
          <span className="badge badge-navy"><Cube style={{ width: 12, height: 12 }} /> {label}</span>
          <span className="spacer" />
          {live && (
            <button className="btn btn-xs btn-outline" onClick={() => setFull(true)}>
              <Expand /> Fullscreen
            </button>
          )}
          <a className="btn btn-xs btn-ghost" href={url} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </div>
      </div>

      {full && (
        <div className="tour-full" onClick={() => setFull(false)}>
          <button className="tour-close" onClick={() => setFull(false)} aria-label="Close fullscreen">✕</button>
          <div className="tour-full-inner" onClick={(e) => e.stopPropagation()}>{frame}</div>
        </div>
      )}
    </>
  );
}

/** Small "3D" flag for property cards. */
export const TourBadge = () => (
  <span className="badge badge-navy"><Cube style={{ width: 12, height: 12 }} /> 3D Tour</span>
);
