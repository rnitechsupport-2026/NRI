import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import usePlotToast from '../../toast';
import { ArrowLeft, Check, Eye, Rocket, Undo2, X } from 'lucide-react';

import useViewport from '../../hooks/useViewport';
import useMappingEditor from '../../hooks/useMappingEditor';
import useMediaQuery from '../../hooks/useMediaQuery';
import { useConfirm } from '../../confirm';
import { propertyService, projectService } from '../../services';
import { getBounds } from '../../utils/geometry';
import { propertyTitle } from '../../utils/format';
import { countByStatus } from '../../utils/statusConfig';

import PolygonCanvas from './PolygonCanvas';
import PolygonLayer from './PolygonLayer';
import PolygonEditor from './PolygonEditor';
import MappingToolbar from './MappingToolbar';
import PropertyForm from './PropertyForm';
import PropertyListPanel from './PropertyListPanel';
import Modal from '../common/Modal';
import { PublishBadge } from '../common/StatusBadge';
import StatusStats from '../common/StatusStats';
import { PageLoader, ErrorState, Spinner } from '../common/Feedback';
import MapPreview from '../map/MapPreview';

const CLOSE_SNAP_DISTANCE = 12; // screen px: clicking this close to the first point closes the shape

const MODE_HINTS = {
  select: 'Click a shape to view its details. Drag to pan · scroll to zoom.',
  draw: 'Click each corner of the plot or flat. Click the first point or press Enter to finish · Esc to cancel.',
  edit: 'Select a shape, then drag its corners. Click a + to add a corner · double-click or right-click a corner to delete it.',
  delete: 'Click a shape to delete it.',
};

// "A-402" -> "A-403", "07" -> "08"
const incrementNumber = (value) =>
  String(value).replace(/(\d+)(?!.*\d)/, (digits) => String(Number(digits) + 1).padStart(digits.length, '0'));

/**
 * The polygon editor for one image. LAND: every plot of the layout.
 * APARTMENT: `floor` is the floor being mapped — its flats are drawn on the
 * building's single image (`imageUrl`), the same image every other floor uses.
 */
export default function ImageMapper({ project, floor, floors = [], imageUrl, title, backTo, headerExtra, onProjectChange, onDirtyChange }) {
  const toast = usePlotToast();
  const editor = useMappingEditor();
  const viewport = useViewport({ minZoom: 0.5, maxZoom: 16 });
  const confirm = useConfirm();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cursorPoint, setCursorPoint] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const projectId = project._id;
  const floorId = floor?._id || null;
  const isApartment = project.type === 'APARTMENT';
  const noun = isApartment ? 'Flat' : 'Plot';
  const { items, mode, draft, selectedItem } = editor;
  const unsavedCount = editor.dirtyIds.length;

  // ---------- Load properties for this image ----------
  const loadProperties = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    propertyService
      .list(projectId, floorId ? { floorId } : undefined)
      .then((data) => editor.load(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
    // editor.load is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, floorId]);

  useEffect(loadProperties, [loadProperties]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!unsavedCount && !editor.newItemIds.length) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedCount, editor.newItemIds.length]);

  // Lets the page ask before switching floors (which reloads the shapes).
  useEffect(() => {
    onDirtyChange?.(unsavedCount > 0 || editor.newItemIds.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsavedCount, editor.newItemIds.length]);

  const markChanged = () => onProjectChange?.({ hasUnpublishedChanges: true });

  // ---------- Drawing ----------
  const nextPropertyNumber = () => {
    const withNumbers = items.filter((i) => /\d/.test(i.propertyNumber || ''));
    if (withNumbers.length) {
      const highest = withNumbers.reduce((best, item) =>
        Number(item.propertyNumber.match(/(\d+)(?!.*\d)/)[1]) > Number(best.propertyNumber.match(/(\d+)(?!.*\d)/)[1]) ? item : best
      );
      return incrementNumber(highest.propertyNumber);
    }
    if (floor) return floor.floorNumber > 0 ? `${floor.floorNumber}01` : 'G01';
    return '01';
  };

  const completeDraft = () => {
    if (draft.length < 3) {
      toast.error('A shape needs at least 3 corners');
      return;
    }
    const isRedraw = Boolean(editor.redrawId);
    editor.completeDraft({
      propertyNumber: nextPropertyNumber(),
      name: '',
      status: 'AVAILABLE',
      areaUnit: 'sq.ft',
      // Plots are priced per sq.ft, flats as a total — either can be changed in the form.
      priceType: isApartment ? 'TOTAL' : 'PER_SQFT',
      type: isApartment ? 'FLAT' : 'PLOT',
      floorId,
      images: [],
    });
    setCursorPoint(null);
    if (isRedraw) toast.success('Shape replaced. Click Save to keep it.');
  };

  const isNearFirstPoint = (point) => {
    const first = viewport.normalizedToClient(draft[0]);
    const current = viewport.normalizedToClient(point);
    return first && current && Math.hypot(first.x - current.x, first.y - current.y) <= CLOSE_SNAP_DISTANCE;
  };

  // ---------- Canvas interaction ----------
  const handleTap = ({ point, target }) => {
    if (!point) return;
    const id = target.closest?.('[data-id]')?.getAttribute('data-id') || null;

    if (mode === 'draw') {
      if (draft.length >= 3 && (target.closest?.('[data-draft-first]') || isNearFirstPoint(point))) {
        completeDraft();
        return;
      }
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
        toast('Click inside the image to add a corner');
        return;
      }
      editor.addPoint(point);
      return;
    }
    if (mode === 'delete') {
      if (id) requestDelete(id);
      return;
    }
    if (mode === 'edit' && (target.closest?.('[data-vertex]') || target.closest?.('[data-midpoint]'))) return;
    editor.select(id);
  };

  const handleDragStart = ({ point, target }) => {
    if (mode !== 'edit' || !editor.selectedId) return null;
    const id = editor.selectedId;

    const vertexEl = target.closest?.('[data-vertex]');
    if (vertexEl) {
      const index = Number(vertexEl.getAttribute('data-vertex'));
      editor.selectVertex(index);
      let started = false;
      return {
        move: (p) => {
          // Only record an undo step once the corner actually moves.
          if (!started) {
            editor.beginChange();
            started = true;
          }
          editor.moveVertex(id, index, p);
        },
      };
    }

    const midpointEl = target.closest?.('[data-midpoint]');
    if (midpointEl) {
      const index = Number(midpointEl.getAttribute('data-midpoint')) + 1;
      editor.insertVertex(id, index, point);
      return { move: (p) => editor.moveVertex(id, index, p) };
    }
    return null;
  };

  const handleHover = ({ point, target, pointerType }) => {
    if (mode === 'draw') setCursorPoint(point);
    if (pointerType === 'mouse') {
      const id = target.closest?.('[data-id]')?.getAttribute('data-id') || null;
      if (id !== hoveredId) setHoveredId(id);
    }
  };

  const deleteVertexAt = ({ target }) => {
    const vertexEl = mode === 'edit' && target.closest?.('[data-vertex]');
    if (!vertexEl || !editor.selectedId) return;
    const polygon = selectedItem?.polygon || [];
    if (polygon.length <= 3) {
      toast.error('A shape needs at least 3 corners');
      return;
    }
    editor.deleteVertex(editor.selectedId, Number(vertexEl.getAttribute('data-vertex')));
  };

  // ---------- Persistence ----------
  const saveProperty = async (item, values) => {
    const payload = { ...values, polygon: item.polygon, floorId: values.floorId || floorId };
    const sameImage = !floorId || String(payload.floorId) === String(floorId);
    if (sameImage && items.some((other) => other._id !== item._id && !other.isNew && other.propertyNumber === payload.propertyNumber)) {
      toast.error(`${noun} ${payload.propertyNumber} already exists on this ${floorId ? 'floor' : 'layout'}`);
      return;
    }
    try {
      const saved = item.isNew
        ? await propertyService.create(projectId, payload)
        : await propertyService.update(item._id, payload);

      if (floorId && String(saved.floorId) !== String(floorId)) {
        editor.itemRemoved(item._id);
        toast.success(`${saved.propertyNumber} moved to another floor`);
      } else {
        editor.itemSaved(saved, item.isNew ? item._id : undefined);
        editor.select(null);
        toast.success(`${propertyTitle(saved)} saved`);
      }
      markChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveAllShapes = async () => {
    const dirty = items.filter((item) => editor.dirtyIds.includes(item._id));
    if (!dirty.length) {
      if (editor.newItemIds.length) toast('New shapes need details: select them and click Save');
      return true;
    }
    setSavingAll(true);
    try {
      const results = await Promise.allSettled(dirty.map((item) => propertyService.update(item._id, { polygon: item.polygon })));
      results.forEach((result) => result.status === 'fulfilled' && editor.itemSaved(result.value));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) toast.error(`${failed.length} shape(s) could not be saved: ${failed[0].reason.message}`);
      else toast.success(`Saved ${dirty.length} shape change${dirty.length > 1 ? 's' : ''}`);
      markChanged();
      return failed.length === 0;
    } finally {
      setSavingAll(false);
    }
  };

  const requestDelete = async (id) => {
    const item = items.find((i) => i._id === id);
    if (!item) return;
    if (item.isNew) {
      editor.itemRemoved(id);
      return;
    }
    const ok = await confirm({
      title: `Delete ${propertyTitle(item)}?`,
      message: 'The shape and all of its details will be removed. This cannot be undone.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await propertyService.remove(id);
      editor.itemRemoved(id);
      toast.success(`${propertyTitle(item)} deleted`);
      markChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePublish = async () => {
    if (editor.newItemIds.length) {
      const ok = await confirm({
        title: 'Some shapes have no details yet',
        message: `${editor.newItemIds.length} new shape(s) are not saved and will not be published. Publish anyway?`,
        confirmText: 'Publish anyway',
        danger: false,
      });
      if (!ok) return;
    }
    if (unsavedCount && !(await saveAllShapes())) return;

    setPublishing(true);
    try {
      const result = await projectService.publish(projectId);
      onProjectChange?.(result.project);
      toast.success('Published! The listing\'s microsite now shows this version.');
      setPreviewOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const focusItem = (id) => {
    const item = items.find((i) => i._id === id);
    editor.select(id);
    if (item?.polygon?.length) viewport.focusBounds(getBounds(item.polygon));
    setListOpen(false);
  };

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        editor.redo();
      } else if (mod && key === 's') {
        e.preventDefault();
        saveAllShapes();
      } else if (mod) {
        // leave other browser shortcuts alone
      } else if (key === 'escape') {
        if (mode === 'draw') editor.cancelDraft();
        else if (editor.selectedId) editor.select(null);
        else editor.setMode('select');
      } else if (key === 'enter' && mode === 'draw') {
        completeDraft();
      } else if (key === 'backspace' && mode === 'draw') {
        e.preventDefault();
        editor.undoPoint();
      } else if (key === 'delete' || key === 'backspace') {
        if (mode === 'edit' && editor.selectedVertex !== null && editor.selectedId) {
          if ((selectedItem?.polygon?.length || 0) > 3) editor.deleteVertex(editor.selectedId, editor.selectedVertex);
        } else if (editor.selectedId) requestDelete(editor.selectedId);
      } else if (key === 'v') editor.setMode('select');
      else if (key === 'd') editor.setMode('draw');
      else if (key === 'e') editor.setMode('edit');
      else if (key === 'x') editor.setMode('delete');
      else if (key === '+' || key === '=') viewport.zoomIn();
      else if (key === '-') viewport.zoomOut();
      else if (key === '0') viewport.fit();
      else if (key === '1') viewport.resetZoom();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // ---------- Render ----------
  const cursor = mode === 'draw' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : 'grab';
  const editPolygon = mode === 'edit' && selectedItem ? selectedItem.polygon : null;

  const renderForm = (compact) =>
    selectedItem && (
      <PropertyForm
        key={selectedItem._id}
        property={selectedItem}
        projectType={project.type}
        floors={floors}
        compact={compact}
        onSave={(values) => saveProperty(selectedItem, values)}
        onCancel={() => (selectedItem.isNew ? editor.itemRemoved(selectedItem._id) : editor.select(null))}
        onDelete={() => requestDelete(selectedItem._id)}
        onEditShape={() => editor.setMode('edit')}
        onRedraw={() => editor.startRedraw(selectedItem._id)}
        onResetShape={() => editor.resetPolygon(selectedItem._id)}
        isShapeDirty={editor.isDirty(selectedItem._id)}
      />
    );

  const overlay = (
    <>
      {/* Mode hint */}
      <div className="pointer-events-auto absolute left-1/2 top-3 hidden max-w-[90%] -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-center text-xs text-white shadow-lg sm:block">
        {editor.redrawId ? `Redrawing ${selectedItem?.propertyNumber}: ` : ''}
        {MODE_HINTS[mode]}
      </div>

      {/* Drawing actions */}
      {mode === 'draw' && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <span className="px-2 text-xs font-medium text-slate-600">{draft.length} pts</span>
          <button type="button" className="pm-btn-ghost px-2.5 py-1.5 text-xs" onClick={editor.undoPoint} disabled={!draft.length}>
            <Undo2 size={14} /> <span className="hidden sm:inline">Undo point</span>
          </button>
          <button type="button" className="pm-btn-ghost px-2.5 py-1.5 text-xs" onClick={editor.cancelDraft}>
            <X size={14} /> Cancel
          </button>
          <button type="button" className="pm-btn-primary px-3 py-1.5 text-xs" onClick={completeDraft} disabled={draft.length < 3}>
            <Check size={14} /> Complete polygon
          </button>
        </div>
      )}

      {/* Mobile: finish editing a shape */}
      {!isDesktop && mode === 'edit' && selectedItem && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <span className="px-2 text-xs font-medium">Editing {selectedItem.propertyNumber}</span>
          <button type="button" className="pm-btn-primary px-3 py-1.5 text-xs" onClick={() => editor.setMode('select')}>
            <Check size={14} /> Done
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow">
        {viewport.zoomPercent}%
      </div>
    </>
  );

  return (
    <div className="pm-root flex h-full min-h-0 flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex flex-none flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
        <Link to={backTo} className="pm-btn-ghost px-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="truncate">{project.name}</span>
            <PublishBadge project={project} />
          </div>
        </div>
        {headerExtra}
        <div className="flex items-center gap-2">
          <button type="button" className="pm-btn-secondary px-3" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} /> <span className="hidden sm:inline">Preview</span>
          </button>
          <button type="button" className="pm-btn-primary px-3" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Spinner size={16} /> : <Rocket size={16} />}
            <span className="hidden sm:inline">
              {project.publishStatus === 'PUBLISHED' ? 'Publish changes' : 'Publish map'}
            </span>
          </button>
        </div>
      </header>

      {/* Floor statistics stay visible while mapping and follow every saved flat. */}
      {floor && (
        <div className="flex-none border-b border-slate-200 bg-white px-4 py-2">
          <StatusStats title={floor.floorName} counts={countByStatus(items.filter((item) => !item.isNew))} />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <MappingToolbar
          editor={editor}
          viewport={viewport}
          onSave={saveAllShapes}
          saving={savingAll}
          unsavedCount={unsavedCount}
          onToggleList={() => (isDesktop ? editor.select(null) : setListOpen(true))}
          onDeleteMode={() => editor.setMode('delete')}
        />

        <main className="relative min-h-0 flex-1">
          {loading ? (
            <PageLoader label="Loading shapes…" />
          ) : loadError ? (
            <div className="p-6">
              <ErrorState message={loadError} onRetry={loadProperties} />
            </div>
          ) : (
            <PolygonCanvas
              viewport={viewport}
              imageUrl={imageUrl}
              cursor={cursor}
              onTap={handleTap}
              onDragStart={handleDragStart}
              onHover={handleHover}
              onLeave={() => {
                setCursorPoint(null);
                setHoveredId(null);
              }}
              onDoubleClick={deleteVertexAt}
              onContextMenu={deleteVertexAt}
              overlay={overlay}
            >
              {({ width, height, scale }) => (
                <>
                  <PolygonLayer
                    properties={items}
                    width={width}
                    height={height}
                    scale={scale}
                    hoveredId={mode === 'draw' ? null : hoveredId}
                    selectedId={editor.selectedId}
                    dimmedId={editPolygon ? editor.selectedId : null}
                    interactive={mode !== 'draw'}
                  />
                  <PolygonEditor
                    width={width}
                    height={height}
                    scale={scale}
                    draft={draft}
                    cursorPoint={mode === 'draw' ? cursorPoint : null}
                    editPolygon={editPolygon}
                    selectedVertex={editor.selectedVertex}
                  />
                </>
              )}
            </PolygonCanvas>
          )}
        </main>

        {/* Desktop side panel */}
        {isDesktop && (
          <aside className="flex w-96 flex-none flex-col border-l border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="font-semibold text-slate-900">
                {selectedItem
                  ? selectedItem.isNew
                    ? `New ${noun.toLowerCase()}`
                    : `${noun} ${selectedItem.propertyNumber}`
                  : `${noun}s (${items.filter((i) => !i.isNew).length})`}
              </h2>
              {selectedItem && (
                <button type="button" className="pm-btn-ghost p-1.5" onClick={() => editor.select(null)} aria-label="Close">
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1">
              {selectedItem ? (
                renderForm(false)
              ) : (
                <PropertyListPanel items={items} dirtyIds={editor.dirtyIds} onSelect={focusItem} projectType={project.type} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile bottom sheets */}
      {!isDesktop && (
        <>
          <Modal
            open={Boolean(selectedItem) && mode === 'select'}
            onClose={() => (selectedItem?.isNew ? null : editor.select(null))}
            title={selectedItem?.isNew ? `New ${noun.toLowerCase()}` : `${noun} ${selectedItem?.propertyNumber || ''}`}
            variant="drawer"
          >
            {renderForm(true)}
          </Modal>
          <Modal open={listOpen} onClose={() => setListOpen(false)} title={`${noun}s`} variant="drawer">
            <div className="h-[70vh]">
              <PropertyListPanel items={items} dirtyIds={editor.dirtyIds} onSelect={focusItem} projectType={project.type} />
            </div>
          </Modal>
        </>
      )}

      <MapPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        project={project}
        floors={floor ? [floor] : []}
        properties={items.filter((i) => !i.isNew)}
        imageUrl={imageUrl}
        onSaveDraft={saveAllShapes}
        onPublish={handlePublish}
        savingDraft={savingAll}
        publishing={publishing}
        hasUnsaved={unsavedCount > 0}
      />
    </div>
  );
}
