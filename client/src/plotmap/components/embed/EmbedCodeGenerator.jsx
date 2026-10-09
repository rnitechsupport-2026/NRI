import { useMemo, useState } from 'react';
import usePlotToast from '../../toast';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { EMBED_URL, PUBLIC_PAGE_URL } from '../../utils/config';

const DEFAULT_OPTIONS = {
  width: '100%',
  height: '600',
  border: false,
  allowFullscreen: true,
  lazy: true,
};

const BORDER_STYLE = '1px solid #e2e8f0';

// Width/height are typed by the admin and end up inside HTML attributes, so keep only
// what a size can contain (600, 100%, 40rem) and fall back to the default when empty.
const cleanSize = (value, fallback) => String(value).replace(/[^0-9a-z%.]/gi, '') || fallback;
// A bare number is pixels in an HTML attribute but invalid in CSS.
const cssSize = (size) => (/^[\d.]+$/.test(size) ? `${size}px` : size);

/**
 * Builds the iframe snippet. Only the listing's ID goes into the URL, so the same code always
 * loads the latest PUBLISHED data and never needs regenerating after an edit.
 */
const buildSnippet = (propertyId, { width, height, border, allowFullscreen, lazy }) => {
  const attributes = [
    `src="${EMBED_URL(propertyId)}"`,
    `width="${width}"`,
    `height="${height}"`,
    `style="border:${border ? BORDER_STYLE : '0'}; width:${cssSize(width)};"`,
    `loading="${lazy ? 'lazy' : 'eager'}"`,
    allowFullscreen ? 'allowfullscreen' : null,
  ].filter(Boolean);

  return `<iframe\n  ${attributes.join('\n  ')}>\n</iframe>`;
};

function CopyButton({ text, label, successMessage }) {
  const toast = usePlotToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without the async clipboard API
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    toast.success(successMessage);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" onClick={copy} className="pm-btn-primary">
      {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : label}
    </button>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <span className="text-sm text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
    </label>
  );
}

export default function EmbedCodeGenerator({ project }) {
  const [rawOptions, setOptions] = useState(DEFAULT_OPTIONS);
  const options = useMemo(
    () => ({
      ...rawOptions,
      width: cleanSize(rawOptions.width, DEFAULT_OPTIONS.width),
      height: cleanSize(rawOptions.height, DEFAULT_OPTIONS.height),
    }),
    [rawOptions]
  );
  // Each listing has its own embed URL — its ID is the only thing in it.
  const snippet = useMemo(() => buildSnippet(project.propertyId, options), [project.propertyId, options]);
  const embedUrl = EMBED_URL(project.propertyId);
  const publicUrl = PUBLIC_PAGE_URL(project.slug || project.propertyId);

  const setOption = (key, value) => setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="pm-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Embed code</h2>
              <p className="text-xs text-slate-500">Paste this iframe into any HTML page where the map should appear. No JavaScript needed.</p>
            </div>
            <CopyButton text={snippet} label="Copy Embed Code" successMessage="Embed code copied successfully" />
          </div>
          <pre className="overflow-x-auto bg-slate-950 p-5 text-[13px] leading-relaxed text-emerald-300">
            <code>{snippet}</code>
          </pre>
        </section>

        <section className="pm-card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Embed preview</h2>
            <p className="text-xs text-slate-500">This is the real iframe customers will get.</p>
          </div>
          <iframe
            key={`${options.width}-${options.height}`}
            title="Embed preview"
            src={embedUrl}
            width={options.width}
            height={options.height}
            loading={options.lazy ? 'lazy' : 'eager'}
            allowFullScreen={options.allowFullscreen}
            style={{
              display: 'block',
              width: cssSize(options.width),
              border: options.border ? BORDER_STYLE : '0',
              background: '#f8fafc',
            }}
          />
        </section>

        <section className="pm-card p-5">
          <h2 className="font-semibold text-slate-900">How to embed</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Copy the iframe code above.</li>
            <li>
              Paste it into your website's HTML where you want the map (WordPress: use a <em>Custom HTML</em> block; Wix/Squarespace:
              use an <em>Embed code</em> element).
            </li>
            <li>Publish your website. The map loads automatically and adjusts to any screen size.</li>
            <li>
              When you change prices or statuses here, just click <strong>Publish changes</strong>. The same iframe URL keeps working, so you
              never need to paste new code.
            </li>
          </ol>
        </section>
      </div>

      <div className="space-y-6">
        <section className="pm-card space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">Iframe settings</h2>
          <div>
            <label className="pm-label" htmlFor="embedWidth">
              Width
            </label>
            <input id="embedWidth" className="pm-input" value={rawOptions.width} onChange={(e) => setOption('width', e.target.value)} placeholder="100%" />
          </div>
          <div>
            <label className="pm-label" htmlFor="embedHeight">
              Height
            </label>
            <input id="embedHeight" className="pm-input" value={rawOptions.height} onChange={(e) => setOption('height', e.target.value)} placeholder="600" />
            <p className="mt-1 text-xs text-slate-500">In pixels, e.g. 600.</p>
          </div>
          <Toggle label="Show border" checked={options.border} onChange={(value) => setOption('border', value)} />
          <Toggle label="Allow fullscreen" checked={options.allowFullscreen} onChange={(value) => setOption('allowFullscreen', value)} />
          <Toggle label="Lazy loading" checked={options.lazy} onChange={(value) => setOption('lazy', value)} />
        </section>

        <section className="pm-card space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">Embed URL</h2>
          <p className="text-xs text-slate-500">This URL never changes. It always loads the latest published version.</p>
          <div className="flex items-center gap-2">
            <input readOnly className="pm-input text-xs" value={embedUrl} onFocus={(e) => e.target.select()} />
            <a href={embedUrl} target="_blank" rel="noreferrer" className="pm-btn-secondary px-2.5" aria-label="Open embed page">
              <ExternalLink size={16} />
            </a>
          </div>
          <CopyButton text={embedUrl} label="Copy URL" successMessage="Embed URL copied successfully" />
        </section>

        <section className="pm-card space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">Property page</h2>
          <p className="text-xs text-slate-500">The listing's own page on this site. Its microsite shows the same map.</p>
          <div className="flex items-center gap-2">
            <input readOnly className="pm-input text-xs" value={publicUrl} onFocus={(e) => e.target.select()} />
            <a href={publicUrl} target="_blank" rel="noreferrer" className="pm-btn-secondary px-2.5" aria-label="Open public page">
              <ExternalLink size={16} />
            </a>
          </div>
          <CopyButton text={publicUrl} label="Copy link" successMessage="Link copied successfully" />
        </section>
      </div>
    </div>
  );
}