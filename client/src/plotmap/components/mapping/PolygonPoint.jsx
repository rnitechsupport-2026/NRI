/**
 * A draggable corner handle. Sizes are given in screen pixels and divided by
 * the zoom scale so handles look the same size at every zoom level.
 */
export default function PolygonPoint({ x, y, scale, radius = 6, fill = '#ffffff', stroke = '#4f46e5', active = false, ...dataProps }) {
  const r = (active ? radius + 2 : radius) / scale;
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={active ? stroke : fill}
      stroke={stroke}
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      style={{ cursor: 'move' }}
      {...dataProps}
    />
  );
}
