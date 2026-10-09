import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Spinner } from '../common/Feedback';

const TAP_MOVE_TOLERANCE = 5; // px a pointer may move and still count as a click/tap

/**
 * Shared zoomable/pannable image surface used by both the editor and the public map.
 *
 * It turns raw pointer events into higher-level callbacks:
 *   onTap({ point, target, pointerType, clientX, clientY })  – click/tap without dragging
 *   onDragStart({ point, target }) -> { move(point), end() } | null
 *        return a handler to take over the drag (e.g. moving a corner); return null to pan
 *   onHover({ point, target, pointerType, clientX, clientY }) – pointer moving with no button pressed
 * `point` is always in normalized image coordinates (0..1).
 *
 * Children are rendered inside an SVG whose coordinate system is the image's natural pixels.
 */
export default function PolygonCanvas({
  viewport,
  imageUrl,
  cursor = 'grab',
  onTap,
  onDragStart,
  onHover,
  onLeave,
  onDoubleClick,
  onContextMenu,
  children,
  overlay,
  className = '',
}) {
  const { containerRef, natural, setNatural, view, clientToNormalized, zoomAt, panBy } = viewport;
  const [status, setStatus] = useState('loading');
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const [isPanning, setIsPanning] = useState(false);

  // Load the image once to learn its natural size.
  useEffect(() => {
    if (!imageUrl) {
      setStatus('empty');
      return undefined;
    }
    let cancelled = false;
    setStatus('loading');
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setStatus('ready');
    };
    img.onerror = () => !cancelled && setStatus('error');
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, setNatural]);

  const eventInfo = (e, target = e.target) => ({
    point: clientToNormalized(e.clientX, e.clientY),
    target,
    pointerType: e.pointerType,
    clientX: e.clientX,
    clientY: e.clientY,
  });

  const handlePointerDown = (e) => {
    if (status !== 'ready') return;
    const isMiddle = e.button === 1;
    if (e.pointerType === 'mouse' && e.button !== 0 && !isMiddle) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Second finger: switch to pinch-zoom, cancelling any drag in progress.
    if (pointers.current.size === 2) {
      gesture.current?.handler?.end?.();
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        type: 'pinch',
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      return;
    }
    if (pointers.current.size > 2) return;

    const handler = !isMiddle && onDragStart ? onDragStart(eventInfo(e)) : null;
    gesture.current = handler
      ? { type: 'drag', handler }
      : {
          type: isMiddle ? 'pan' : 'pending',
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          target: e.target,
        };
  };

  const handlePointerMove = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;

    if (!g) {
      onHover?.(eventInfo(e));
      return;
    }

    if (g.type === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (g.distance > 0) zoomAt(distance / g.distance, midX, midY);
      panBy(midX - g.midX, midY - g.midY);
      Object.assign(g, { distance, midX, midY });
      return;
    }

    if (g.type === 'drag') {
      const point = clientToNormalized(e.clientX, e.clientY);
      if (point) g.handler.move(point);
      return;
    }

    if (g.type === 'pending' && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_MOVE_TOLERANCE) {
      g.type = 'pan';
    }
    if (g.type === 'pan') {
      if (!isPanning) setIsPanning(true);
      panBy(e.clientX - g.lastX, e.clientY - g.lastY);
      g.lastX = e.clientX;
      g.lastY = e.clientY;
    }
  };

  const finishPointer = (e, cancelled) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.type === 'drag') g.handler.end?.();
    if (g?.type === 'pending' && !cancelled) onTap?.(eventInfo(e, g.target));

    if (pointers.current.size === 0) gesture.current = null;
    // One finger left after a pinch: ignore it until it is lifted.
    else if (g?.type === 'pinch') gesture.current = { type: 'idle' };
    setIsPanning(false);
  };

  const transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full touch-none select-none overflow-hidden bg-slate-100 ${className}`}
      style={{
        cursor: isPanning ? 'grabbing' : cursor,
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishPointer(e, false)}
      onPointerCancel={(e) => finishPointer(e, true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !gesture.current && onLeave?.()}
      onDoubleClick={(e) => onDoubleClick?.(eventInfo(e))}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(eventInfo(e));
        }
      }}
    >
      {status === 'ready' && natural && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: natural.width, height: natural.height, transform }}
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none block h-full w-full max-w-none select-none"
          />
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${natural.width} ${natural.height}`}
            preserveAspectRatio="none"
          >
            {typeof children === 'function'
              ? children({ width: natural.width, height: natural.height, scale: view.scale })
              : children}
          </svg>
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
          <Spinner size={26} className="text-indigo-600" />
          Loading image…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
          <ImageOff size={28} />
          The image could not be loaded.
        </div>
      )}

      {/* Floating UI (toolbars, zoom buttons). Pointer events here must not start a pan. */}
      {overlay && (
        <div className="pointer-events-none absolute inset-0" onPointerDown={(e) => e.stopPropagation()}>
          {overlay}
        </div>
      )}
    </div>
  );
}
