import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../utils/geometry';

/**
 * Zoom & pan state for an image shown inside a container.
 *
 * The image is rendered at its NATURAL pixel size inside a "stage", and the
 * stage is moved/scaled with a CSS transform:  translate(x, y) scale(scale).
 * Polygons are drawn in the same stage, so they zoom and pan with the image.
 *
 * minZoom / maxZoom are multiples of the "fit" scale (the scale at which the
 * whole image fits the container).
 */
export default function useViewport({ minZoom = 0.5, maxZoom = 12, wheelZoom = true, onWheelBlocked } = {}) {
  // Callback ref: the container may mount later (e.g. after data loads),
  // and listeners below must attach whenever it appears.
  const elementRef = useRef(null);
  const [element, setElement] = useState(null);
  const containerRef = useCallback((node) => {
    elementRef.current = node;
    setElement(node);
  }, []);
  const [natural, setNatural] = useState(null); // { width, height } of the image in pixels
  const [view, setViewState] = useState({ scale: 1, x: 0, y: 0 });

  // Refs let event handlers read the latest values without re-binding.
  const viewRef = useRef(view);
  const naturalRef = useRef(natural);
  const fitScaleRef = useRef(1);
  const isFittedRef = useRef(true);
  naturalRef.current = natural;

  const setView = useCallback((next) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const getSize = () => {
    const el = elementRef.current;
    return el ? { width: el.clientWidth, height: el.clientHeight } : { width: 0, height: 0 };
  };

  const fit = useCallback(() => {
    const img = naturalRef.current;
    const { width, height } = getSize();
    if (!img || !width || !height) return;
    const scale = Math.min(width / img.width, height / img.height);
    fitScaleRef.current = scale;
    isFittedRef.current = true;
    setView({ scale, x: (width - img.width * scale) / 2, y: (height - img.height * scale) / 2 });
  }, [setView]);

  const clampScale = (scale) => clamp(scale, fitScaleRef.current * minZoom, fitScaleRef.current * maxZoom);

  /** Zooms by `factor`, keeping the point under (clientX, clientY) fixed on screen. */
  const zoomAt = useCallback(
    (factor, clientX, clientY) => {
      const el = elementRef.current;
      if (!el || !naturalRef.current) return;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const v = viewRef.current;
      const scale = clampScale(v.scale * factor);
      const ratio = scale / v.scale;
      isFittedRef.current = false;
      setView({ scale, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setView, minZoom, maxZoom]
  );

  const zoomBy = useCallback(
    (factor) => {
      const el = elementRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAt]
  );

  const panBy = useCallback(
    (dx, dy) => {
      const v = viewRef.current;
      isFittedRef.current = false;
      setView({ ...v, x: v.x + dx, y: v.y + dy });
    },
    [setView]
  );

  /** 100% zoom (1 image pixel = 1 screen pixel), centered. */
  const resetZoom = useCallback(() => {
    const img = naturalRef.current;
    const { width, height } = getSize();
    if (!img) return;
    const scale = clampScale(1);
    isFittedRef.current = false;
    setView({ scale, x: (width - img.width * scale) / 2, y: (height - img.height * scale) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setView, minZoom, maxZoom]);

  /** Zooms to show a normalized bounding box (used to focus a property). */
  const focusBounds = useCallback(
    (bounds, padding = 0.35) => {
      const img = naturalRef.current;
      const { width, height } = getSize();
      if (!img || !width) return;
      const boxW = Math.max((bounds.maxX - bounds.minX) * img.width, 1);
      const boxH = Math.max((bounds.maxY - bounds.minY) * img.height, 1);
      const scale = clampScale(Math.min(width / (boxW * (1 + padding * 2)), height / (boxH * (1 + padding * 2))));
      const cx = ((bounds.minX + bounds.maxX) / 2) * img.width;
      const cy = ((bounds.minY + bounds.maxY) / 2) * img.height;
      isFittedRef.current = false;
      setView({ scale, x: width / 2 - cx * scale, y: height / 2 - cy * scale });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setView, minZoom, maxZoom]
  );

  /** Screen position -> normalized image coordinates (0..1). Accurate at any zoom/pan. */
  const clientToNormalized = useCallback((clientX, clientY) => {
    const el = elementRef.current;
    const img = naturalRef.current;
    if (!el || !img) return null;
    const rect = el.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / (v.scale * img.width),
      y: (clientY - rect.top - v.y) / (v.scale * img.height),
    };
  }, []);

  /** Normalized image coordinates -> screen (client) position. */
  const normalizedToClient = useCallback((point) => {
    const el = elementRef.current;
    const img = naturalRef.current;
    if (!el || !img) return null;
    const rect = el.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: rect.left + v.x + point.x * img.width * v.scale,
      y: rect.top + v.y + point.y * img.height * v.scale,
    };
  }, []);

  // Fit whenever a new image is loaded.
  useEffect(() => {
    if (natural) fit();
  }, [natural, fit]);

  // Re-fit on container resize (only if the user has not zoomed in manually).
  useEffect(() => {
    if (!element || !window.ResizeObserver) return undefined;
    const observer = new ResizeObserver(() => {
      if (isFittedRef.current) fit();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, fit]);

  // Wheel zoom. Registered manually because React wheel listeners are passive.
  useEffect(() => {
    const el = element;
    if (!el || !wheelZoom) return undefined;
    const handleWheel = (e) => {
      if (!naturalRef.current) return;
      if (wheelZoom === 'modifier' && !e.ctrlKey && !e.metaKey) {
        onWheelBlocked?.();
        return;
      }
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [element, zoomAt, wheelZoom, onWheelBlocked]);

  return {
    containerRef,
    // The mounted container — lets popups portal into the document the map
    // actually lives in (the microsite builder previews inside an iframe).
    getElement: () => elementRef.current,
    natural,
    setNatural,
    view,
    fit,
    zoomAt,
    zoomBy,
    zoomIn: () => zoomBy(1.4),
    zoomOut: () => zoomBy(1 / 1.4),
    resetZoom,
    panBy,
    focusBounds,
    clientToNormalized,
    normalizedToClient,
    zoomPercent: Math.round(view.scale * 100),
  };
}
