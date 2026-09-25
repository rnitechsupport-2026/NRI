import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children inside a real <iframe> instead of a width-clamped <div>.
 * Tailwind's `sm:`/`md:` classes are media queries keyed to the *viewport*,
 * not the nearest container — so shrinking a wrapper div's width to 390px
 * does nothing to those breakpoints (the real browser window is still
 * desktop-wide), and the layout stays in its desktop arrangement, cramped
 * into a narrow box. An iframe has its own independent viewport, so setting
 * its width genuinely triggers mobile/tablet breakpoints, exactly like
 * opening the page on that size of device.
 */
export default function IframePreview({ width, style, children }) {
  const iframeRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write('<!doctype html><html><head></head><body></body></html>');
    doc.close();

    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      doc.head.appendChild(node.cloneNode(true));
    });
    const meta = doc.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1';
    doc.head.appendChild(meta);
    doc.body.style.margin = '0';

    setMountNode(doc.body);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Microsite preview"
      style={{ width, border: 0, display: 'block', background: '#fff', transition: 'width .25s ease', ...style }}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}
