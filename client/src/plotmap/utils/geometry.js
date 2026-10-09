/**
 * Geometry helpers for polygon mapping.
 *
 * Polygons are stored with NORMALIZED coordinates (0..1) relative to the
 * image. To draw them we multiply by the image's natural pixel size, and
 * the whole stage is then scaled by CSS transform for zoom/pan. That is why
 * shapes always stay aligned with the image at every screen size.
 */

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const clampPoint = ({ x, y }) => ({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });

// Normalized -> natural image pixels
export const toPixels = (points, width, height) => points.map((p) => ({ x: p.x * width, y: p.y * height }));

export const toSvgPoints = (points, width, height) => points.map((p) => `${p.x * width},${p.y * height}`).join(' ');

export const getBounds = (points) => {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  points.forEach((p) => {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  });
  return bounds;
};

export const pointInPolygon = (x, y, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const { x: xi, y: yi } = points[i];
    const { x: xj, y: yj } = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const distanceToEdges = (x, y, points) => {
  let min = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1) : 0;
    min = Math.min(min, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
  }
  return min;
};

export const polygonCentroid = (points) => {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const f = points[j].x * points[i].y - points[i].x * points[j].y;
    area += f;
    cx += (points[j].x + points[i].x) * f;
    cy += (points[j].y + points[i].y) * f;
  }
  if (Math.abs(area) < 1e-12) {
    const b = getBounds(points);
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  }
  area *= 0.5;
  return { x: cx / (6 * area), y: cy / (6 * area) };
};

/**
 * Best spot for a label: the point deepest inside the polygon.
 * For simple shapes this is the centroid; for L-shaped or concave plots
 * (where the centroid can fall outside) we search a small grid.
 * Works on pixel points so that non-square images are handled correctly.
 * Returns { x, y, depth } where depth is the distance to the nearest edge.
 */
export const getLabelPosition = (pixelPoints) => {
  const c = polygonCentroid(pixelPoints);
  let best = pointInPolygon(c.x, c.y, pixelPoints)
    ? { x: c.x, y: c.y, depth: distanceToEdges(c.x, c.y, pixelPoints) * 1.15 }
    : null;

  const b = getBounds(pixelPoints);
  const steps = 12;
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const x = b.minX + ((b.maxX - b.minX) * i) / steps;
      const y = b.minY + ((b.maxY - b.minY) * j) / steps;
      if (!pointInPolygon(x, y, pixelPoints)) continue;
      const depth = distanceToEdges(x, y, pixelPoints);
      if (!best || depth > best.depth) best = { x, y, depth };
    }
  }
  return best || { x: c.x, y: c.y, depth: 0 };
};

/** Font size (in natural pixels) that fits the label text inside the polygon. */
export const getLabelFontSize = (pixelPoints, text, imageWidth, imageHeight, depth) => {
  const b = getBounds(pixelPoints);
  const byWidth = (b.maxX - b.minX) / Math.max(String(text).length * 0.62, 1);
  const size = Math.min(byWidth, depth * 1.4, imageHeight / 18);
  return Math.max(size, Math.min(imageWidth, imageHeight) / 110);
};

export const pointsEqual = (a = [], b = []) =>
  a.length === b.length && a.every((p, i) => p.x === b[i].x && p.y === b[i].y);

export const roundPoint = ({ x, y }) => ({ x: Number(x.toFixed(6)), y: Number(y.toFixed(6)) });
