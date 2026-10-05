/** Samples an agent/builder's logo (their profile avatar) and returns its
 *  dominant brand color as a hex string, so a newly created microsite's
 *  primary color can default to "whatever color their logo is" instead of
 *  a generic template preset. Near-white/near-black/transparent pixels are
 *  skipped first since most logos sit on a plain background and that
 *  background would otherwise dominate a simple average.
 *  Resolves to null (never rejects) on any failure — missing image, CORS
 *  block, decode error — so callers can just fall back to the template's
 *  own default color. */
export function extractAccentColor(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) { resolve(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (result) => { resolve(result); };

    img.onload = () => {
      try {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, n = 0;
        let rAll = 0, gAll = 0, bAll = 0, nAll = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [pr, pg, pb, pa] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
          if (pa < 128) continue;
          rAll += pr; gAll += pg; bAll += pb; nAll += 1;
          const nearWhite = pr > 235 && pg > 235 && pb > 235;
          const nearBlack = pr < 20 && pg < 20 && pb < 20;
          const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
          const lowSaturation = (max - min) < 12;
          if (nearWhite || nearBlack || lowSaturation) continue;
          r += pr; g += pg; b += pb; n += 1;
        }

        if (n < 4) {
          if (nAll === 0) { done(null); return; }
          r = rAll; g = gAll; b = bAll; n = nAll;
        }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);

        // Keep the color usable as a bold UI primary (navbar bg, solid
        // buttons, white text on top) — darken it if the logo's dominant
        // tone turned out too pale to read white text on.
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 190) {
          const scale = 160 / luminance;
          r = Math.round(r * scale); g = Math.round(g * scale); b = Math.round(b * scale);
        }

        const hex = '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
        done(hex);
      } catch {
        done(null); // canvas tainted by a cross-origin image with no CORS header
      }
    };
    img.onerror = () => done(null);
    img.src = imageUrl;
  });
}
