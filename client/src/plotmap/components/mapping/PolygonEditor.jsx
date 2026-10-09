import { DRAFT_COLOR } from '../../utils/statusConfig';
import PolygonPoint from './PolygonPoint';

/**
 * Editor overlay drawn on top of the PolygonLayer:
 *  - the polygon currently being drawn (points, lines, preview line to the cursor)
 *  - corner handles and "+" midpoint handles of the shape being edited
 *
 * data-* attributes let the canvas know what was clicked:
 *   data-draft-first  – first point of the drawing (click it to close the shape)
 *   data-vertex="i"   – corner i of the edited shape
 *   data-midpoint="i" – middle of the edge after corner i (click/drag to add a corner)
 */
export default function PolygonEditor({ width, height, scale, draft, cursorPoint, editPolygon, selectedVertex }) {
  const px = (p) => ({ x: p.x * width, y: p.y * height });
  const s = (value) => value / scale; // screen px -> image px

  const renderDraft = () => {
    if (!draft.length) return null;
    const points = draft.map(px);
    const last = points[points.length - 1];
    const cursor = cursorPoint ? px(cursorPoint) : null;
    const canClose = draft.length >= 3;

    return (
      <g pointerEvents="none">
        {canClose && (
          <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill={DRAFT_COLOR} fillOpacity={0.12} stroke="none" />
        )}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={DRAFT_COLOR}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {cursor && (
          <>
            <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} stroke={DRAFT_COLOR} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            {canClose && (
              <line x1={cursor.x} y1={cursor.y} x2={points[0].x} y2={points[0].y} stroke={DRAFT_COLOR} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            )}
          </>
        )}
      </g>
    );
  };

  const renderDraftPoints = () =>
    draft.map((point, index) => {
      const { x, y } = px(point);
      const isFirst = index === 0;
      return (
        <g key={index}>
          {isFirst && draft.length >= 3 && (
            <circle cx={x} cy={y} r={s(14)} fill={DRAFT_COLOR} fillOpacity={0.15} data-draft-first="true" style={{ cursor: 'pointer' }} />
          )}
          <PolygonPoint
            x={x}
            y={y}
            scale={scale}
            radius={isFirst ? 7 : 5}
            stroke={DRAFT_COLOR}
            fill={isFirst ? '#e0e7ff' : '#ffffff'}
            {...(isFirst ? { 'data-draft-first': 'true' } : {})}
          />
        </g>
      );
    });

  const renderEditHandles = () => {
    if (!editPolygon || editPolygon.length < 3) return null;
    const points = editPolygon.map(px);
    return (
      <g>
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#1e1b4b"
          strokeWidth={2}
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
        {points.map((p, i) => {
          const next = points[(i + 1) % points.length];
          return (
            <g key={`m${i}`} data-midpoint={i} style={{ cursor: 'copy' }}>
              <circle cx={(p.x + next.x) / 2} cy={(p.y + next.y) / 2} r={s(6)} fill="#ffffff" fillOpacity={0.85} stroke="#6366f1" strokeWidth={1} vectorEffect="non-scaling-stroke" data-midpoint={i} />
              <path
                d={`M ${(p.x + next.x) / 2 - s(3)} ${(p.y + next.y) / 2} h ${s(6)} M ${(p.x + next.x) / 2} ${(p.y + next.y) / 2 - s(3)} v ${s(6)}`}
                stroke="#6366f1"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>
          );
        })}
        {points.map((p, i) => (
          <PolygonPoint key={`v${i}`} x={p.x} y={p.y} scale={scale} radius={6} stroke="#1e1b4b" active={selectedVertex === i} data-vertex={i} />
        ))}
      </g>
    );
  };

  return (
    <>
      {renderEditHandles()}
      {renderDraft()}
      {renderDraftPoints()}
    </>
  );
}
