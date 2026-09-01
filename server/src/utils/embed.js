/**
 * 3D walkthrough / virtual-tour embed handling.
 *
 * Posters paste whatever their tour provider gives them — a full <iframe …>
 * snippet or a plain share link. Storing and re-rendering raw HTML would be an
 * XSS hole, so we never keep the markup: we pull out the `src`, check it against
 * an allowlist of tour providers, and store only that URL. The client then
 * renders its own sandboxed <iframe> around it.
 */

const PROVIDERS = [
  { name: 'matterport', hosts: ['matterport.com', 'my.matterport.com'] },
  { name: 'kuula', hosts: ['kuula.co'] },
  { name: 'youtube', hosts: ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com'] },
  { name: 'vimeo', hosts: ['vimeo.com', 'player.vimeo.com'] },
  { name: 'sketchfab', hosts: ['sketchfab.com'] },
  { name: 'google', hosts: ['google.com', 'www.google.com', 'maps.google.com'] },
  { name: 'roundme', hosts: ['roundme.com'] },
  { name: 'momento360', hosts: ['momento360.com', 'www.momento360.com'] },
  { name: 'insidemaps', hosts: ['insidemaps.com', 'www.insidemaps.com'] },
  { name: 'cupix', hosts: ['cupix.com', 'www.cupix.com'] },
  { name: 'panoee', hosts: ['panoee.com', 'tour.panoee.com'] },
];

const ALLOWED = new Set(PROVIDERS.flatMap((p) => p.hosts));

/** Pull the src="…" out of a pasted <iframe> snippet, else treat input as a URL. */
function extractSrc(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const m = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  return (m ? m[1] : raw).trim();
}

/** Turn common share links into their embeddable form. */
function toEmbedUrl(url, host) {
  // youtu.be/ID  and  youtube.com/watch?v=ID  →  youtube-nocookie.com/embed/ID
  if (host.includes('youtu')) {
    const id = host === 'youtu.be'
      ? url.pathname.slice(1)
      : (url.searchParams.get('v') || url.pathname.replace(/^\/(embed|v)\//, ''));
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    }
  }
  // vimeo.com/ID → player.vimeo.com/video/ID
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }
  // matterport show link is already embeddable; make sure play=1 is set
  if (host.includes('matterport') && url.pathname.startsWith('/show')) {
    url.searchParams.set('play', '1');
    return url.toString();
  }
  return url.toString();
}

/**
 * @returns {{url: string, provider: string} | null}
 * null when the input is empty or the host is not an allowed tour provider.
 */
function parseTourEmbed(input) {
  const src = extractSrc(input);
  if (!src) return null;

  let url;
  try {
    url = new URL(src.startsWith('//') ? `https:${src}` : src);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.protocol = 'https:';

  const host = url.hostname.toLowerCase();
  if (!ALLOWED.has(host)) return null;

  const provider = PROVIDERS.find((p) => p.hosts.includes(host)).name;
  return { url: toEmbedUrl(url, host).slice(0, 600), provider };
}

const allowedHosts = () => [...ALLOWED];

module.exports = { parseTourEmbed, allowedHosts, PROVIDERS };
