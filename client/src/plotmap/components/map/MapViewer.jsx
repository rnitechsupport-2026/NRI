import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import useViewport from '../../hooks/useViewport';
import PolygonCanvas from '../mapping/PolygonCanvas';
import PolygonLayer from '../mapping/PolygonLayer';
import FloorSelector from './FloorSelector';
import PropertyPopup from './PropertyPopup';
import PropertyDetails from './PropertyDetails';
import StatusStats from '../common/StatusStats';
import { getBounds } from '../../utils/geometry';
import { statusConfig, STATUS_KEYS, countByStatus } from '../../utils/statusConfig';

// The map's one image: { url } objects in admin data and plain strings in public data.
const layoutUrl = (project) => (typeof project.layoutImage === 'string' ? project.layoutImage : project.layoutImage?.url);

/**
 * Interactive read-only map: hover popups, click for details, floor switching,
 * zoom/pan and pinch. Data is passed in once; nothing is fetched on hover.
 */
export default function MapViewer({
  project,
  floors = [],
  properties = [],
  imageUrl: imageOverride,
  showPrice = true,
  showStatus = true,
  showDetails = true,
  heightClass = 'h-[65vh] min-h-[320px]',
  className = '',
  detailsHref, // optional (property) => URL of a full detail page
}) {
  const isApartment = project.type === 'APARTMENT';
  // An apartment has ONE image for the whole building: every floor is shown on
  // it, and picking a floor only switches which flats are drawn. (A floor that
  // still carries its own image, as in older PlotMapper data, keeps using it.)
  const sharedImage = imageOverride || layoutUrl(project);
  const mapFloors = useMemo(() => floors.filter((f) => f.imageUrl || sharedImage), [floors, sharedImage]);
  const [floorId, setFloorId] = useState(mapFloors[0]?._id || null);
  const [hover, setHover] = useState(null); // { id, touch }
  const [detailsId, setDetailsId] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef(null);

  useEffect(() => {
    if (isApartment && !mapFloors.some((f) => f._id === floorId)) setFloorId(mapFloors[0]?._id || null);
  }, [isApartment, mapFloors, floorId]);

  const flashHint = useCallback(() => {
    setShowHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowHint(false), 1200);
  }, []);

  // Page scroll keeps working; Ctrl/⌘ + wheel zooms the map.
  const viewport = useViewport({ minZoom: 1, maxZoom: 10, wheelZoom: 'modifier', onWheelBlocked: flashHint });

  const activeFloor = mapFloors.find((f) => f._id === floorId);
  const imageUrl = isApartment ? activeFloor?.imageUrl || sharedImage : sharedImage;

  const visible = useMemo(
    () => (isApartment ? properties.filter((p) => String(p.floorId) === String(floorId)) : properties),
    [isApartment, properties, floorId]
  );
  const byId = useMemo(() => Object.fromEntries(visible.map((p) => [p._id, p])), [visible]);

  const hovered = hover ? byId[hover.id] : null;
  const detailsProperty = detailsId ? properties.find((p) => p._id === detailsId) : null;

  const openDetails = (id) => {
    if (!showDetails) return;
    setHover(null);
    setDetailsId(id);
  };

  const idFromTarget = (target) => target.closest?.('[data-id]')?.getAttribute('data-id') || null;

  const handleHover = ({ target, pointerType }) => {
    if (pointerType !== 'mouse') return;
    const id = idFromTarget(target);
    if (id !== (hover?.id || null)) setHover(id ? { id, touch: false } : null);
  };

  const handleTap = ({ target, pointerType }) => {
    const id = idFromTarget(target);
    if (pointerType === 'mouse') {
      if (id) openDetails(id);
      return;
    }
    // Touch: first tap shows the card, second tap on the same shape opens details.
    if (!id) setHover(null);
    else if (hover?.id === id) openDetails(id);
    else setHover({ id, touch: true });
  };

  // Screen anchor for the popup, recomputed on every zoom/pan render.
  let anchor = null;
  if (hovered?.polygon?.length) {
    const b = getBounds(hovered.polygon);
    const top = viewport.normalizedToClient({ x: (b.minX + b.maxX) / 2, y: b.minY });
    const bottom = viewport.normalizedToClient({ x: (b.minX + b.maxX) / 2, y: b.maxY });
    if (top && bottom) anchor = { x: top.x, top: top.y, bottom: bottom.y };
  }

  // Counted from the flats/plots on screen, so the summary and legend always match the map.
  const counts = useMemo(() => countByStatus(visible), [visible]);

  const changeFloor = (id) => {
    setHover(null);
    setFloorId(id);
  };

  return (
    <div className={`pm-root flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 ${className}`}>
      {isApartment && mapFloors.length > 0 && (
        <div className="flex-none space-y-2.5 border-b border-slate-200 px-4 py-3">
          <FloorSelector floors={mapFloors} activeId={floorId} onChange={changeFloor} />
          {activeFloor && showStatus && <StatusStats title={activeFloor.floorName} counts={counts} />}
        </div>
      )}

      <div className={`relative ${heightClass}`}>
        {imageUrl ? (
          <PolygonCanvas
            viewport={viewport}
            imageUrl={imageUrl}
            onTap={handleTap}
            onHover={handleHover}
            onLeave={() => !hover?.touch && setHover(null)}
            overlay={
              <>
                <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-1.5">
                  {[
                    { icon: Plus, label: 'Zoom in', onClick: viewport.zoomIn },
                    { icon: Minus, label: 'Zoom out', onClick: viewport.zoomOut },
                    { icon: Maximize, label: 'Fit map', onClick: viewport.fit },
                  ].map(({ icon: Icon, label, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      title={label}
                      onClick={onClick}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div
                  className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs text-white transition-opacity ${
                    showHint ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  Hold Ctrl and scroll to zoom
                </div>
              </>
            }
          >
            {({ width, height, scale }) => (
              <PolygonLayer
                properties={visible}
                width={width}
                height={height}
                scale={scale}
                hoveredId={hover?.id}
                selectedId={detailsId}
                hideIdle={project.mapStyle === 'HOVER'}
                // Flats are always filled with their status color (unless the project is
                // "hover only"); land layouts keep the clean number-only look.
                labelsOnly={!isApartment}
              />
            )}
          </PolygonCanvas>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No map image available yet.</div>
        )}
      </div>

      {showStatus && (
        <div className="flex-none flex flex-wrap gap-4 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          {STATUS_KEYS.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusConfig[key].color }} />
              {statusConfig[key].label}
              {!isApartment && ` (${counts[key]})`}
            </span>
          ))}
        </div>
      )}

      {hovered && anchor && (
        <PropertyPopup
          property={hovered}
          anchor={anchor}
          touch={hover.touch}
          onViewDetails={() => openDetails(hovered._id)}
          showPrice={showPrice}
          showStatus={showStatus}
          showDetails={showDetails}
          container={viewport.getElement()}
        />
      )}

      <PropertyDetails
        key={detailsId}
        property={detailsProperty}
        project={project}
        floors={floors}
        open={Boolean(detailsProperty)}
        onClose={() => setDetailsId(null)}
        showPrice={showPrice}
        showStatus={showStatus}
        fullPageHref={detailsProperty && detailsHref ? detailsHref(detailsProperty) : undefined}
        container={viewport.getElement()}
      />
    </div>
  );
}
