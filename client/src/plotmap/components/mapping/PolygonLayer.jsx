import { memo, useMemo } from 'react';
import { getStatus, DRAFT_COLOR } from '../../utils/statusConfig';
import { toPixels, toSvgPoints, getLabelPosition, getLabelFontSize } from '../../utils/geometry';

const MIN_READABLE_LABEL_PX = 7;

/**
 * Renders every property polygon with its status color and a label.
 * Coordinates are normalized in the data and converted to image pixels here.
 */
function PolygonLayer({
  properties,
  width,
  height,
  scale,
  hoveredId,
  selectedId,
  showLabels = true,
  dimmedId, // shape being edited is drawn by the editor overlay; dim the base version
  interactive = true,
  hideIdle = false, // true: shapes stay invisible until hovered or selected (clean photo)
  labelsOnly = false, // true: only the numbers show; fill and outline appear on hover or selection
}) {
  // Label placement is the heaviest calculation, so memoize it per polygon.
  const labels = useMemo(
    () =>
      properties
        .filter((p) => p.polygon?.length >= 3)
        .map((p) => {
          const pixels = toPixels(p.polygon, width, height);
          const position = getLabelPosition(pixels);
          const text = String(p.propertyNumber || '');
          return { id: p._id, text, x: position.x, y: position.y, size: getLabelFontSize(pixels, text, width, height, position.depth) };
        }),
    [properties, width, height]
  );

  return (
    <>
      <g>
        {properties.map((property) => {
          if (!property.polygon || property.polygon.length < 3) return null;
          const status = getStatus(property.status);
          const color = property.isNew ? DRAFT_COLOR : status.color;
          const isSelected = property._id === selectedId;
          const isHovered = property._id === hoveredId;
          const opacity = isSelected ? status.selectedOpacity : isHovered ? status.hoverOpacity : status.fillOpacity;
          // Invisible shapes still receive the mouse because their fill is painted (at 0 opacity).
          const hidden = (hideIdle || labelsOnly) && !isSelected && !isHovered;

          return (
            <polygon
              key={property._id}
              data-id={property._id}
              className="map-polygon"
              points={toSvgPoints(property.polygon, width, height)}
              fill={color}
              fillOpacity={
                hidden ? 0 : property._id === dimmedId ? 0.15 : opacity
              }
              stroke={isSelected ? '#1e1b4b' : color}
              strokeOpacity={hidden ? 0 : 1}
              strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.75}
              strokeDasharray={property.isNew ? '6 4' : undefined}
              strokeLinejoin="round"
              style={{ cursor: interactive ? 'pointer' : 'inherit' }}
            />
          );
        })}
      </g>

      {showLabels && (
        <g pointerEvents="none">
          {labels.map((label) =>
            label.size * scale < MIN_READABLE_LABEL_PX || (hideIdle && label.id !== hoveredId && label.id !== selectedId) ? null : (
              <text
                key={label.id}
                x={label.x}
                y={label.y}
                fontSize={label.size}
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={label.size / 5}
                strokeLinejoin="round"
                paintOrder="stroke"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {label.text}
              </text>
            )
          )}
        </g>
      )}
    </>
  );
}

export default memo(PolygonLayer);
