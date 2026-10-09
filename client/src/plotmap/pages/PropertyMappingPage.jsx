import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Code2, ImagePlus, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import '../../microsite/microsite.css';
import '../plotmap.css';
import usePlotToast from '../toast';
import { useConfirm } from '../confirm';
import { mapService, floorService, uploadService, validateImageFile } from '../services';
import ImageMapper from '../components/mapping/ImageMapper';
import Modal from '../components/common/Modal';
import EmbedCodeGenerator from '../components/embed/EmbedCodeGenerator';
import { TextInput } from '../components/common/FormControls';
import { PageLoader, ErrorState, EmptyState, Spinner } from '../components/common/Feedback';

const BACK_TO = '/dashboard/properties';

// 0 -> "Ground Floor", 3 -> "Floor 3", -1 -> "Basement 1"
const defaultFloorName = (n) => (n === 0 ? 'Ground Floor' : n < 0 ? `Basement ${-n}` : `Floor ${n}`);

/** Step 1 of mapping: the listing's ONE map image. */
function LayoutUpload({ project, replacing, onSaved, onCancel }) {
  const toast = usePlotToast();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [url, setUrl] = useState('');
  const isApartment = project.type === 'APARTMENT';

  const save = async (image) => {
    try {
      onSaved(await mapService.save(project.propertyId, { layoutImage: image }));
      toast.success(isApartment ? 'Building image saved. Add floors and start mapping flats!' : 'Layout saved. Start drawing plots!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return toast.error(problem);
    setProgress(0);
    try {
      await save(await uploadService.uploadImage(file, setProgress));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };

  const addUrl = (e) => {
    e.preventDefault();
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) return toast.error('Enter a full image URL starting with https://');
    save({ url: clean });
  };

  return (
    <div className="pm-root min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link to={BACK_TO} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> {project.name}
        </Link>
        <div className="pm-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <ImagePlus size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {replacing ? 'Replace the map image' : isApartment ? 'Upload the building layout image' : 'Upload the land layout'}
              </h1>
              <p className="text-sm text-slate-500">
                {isApartment
                  ? 'One image for the complete building / floor layout. You pick a floor while mapping and draw its flats on this same image — no separate image per floor.'
                  : 'One clear, high-resolution image of the whole layout. Every plot is drawn on top of it.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
          >
            {progress !== null ? (
              <><Spinner size={24} /> <span className="text-sm">Uploading… {progress}%</span></>
            ) : (
              <>
                <ImagePlus size={28} />
                <span className="text-sm font-semibold">Click to choose the image, or drop it here</span>
                <span className="text-xs">JPG, PNG or WEBP · up to 5 MB · one image only</span>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                 onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

          <form className="mt-4 flex gap-2" onSubmit={addUrl}>
            <input className="pm-input" placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="submit" className="pm-btn-secondary flex-none">Use URL</button>
          </form>

          {replacing && (
            <button type="button" className="pm-btn-secondary mt-4" onClick={onCancel}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Add one floor, or a run of them (e.g. Ground to 14) in one go. */
function AddFloorsForm({ floors, totalFloors, onAdd, onCancel }) {
  const used = floors.map((f) => f.floorNumber);
  const next = used.length ? Math.max(...used) + 1 : 0;
  const [from, setFrom] = useState(String(next));
  const [to, setTo] = useState(!used.length && totalFloors ? String(totalFloors) : '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const first = Number(from);
  const last = to === '' ? first : Number(to);
  const single = last === first;

  const submit = async (e) => {
    e.preventDefault();
    if (from === '' || !Number.isInteger(first) || !Number.isInteger(last)) return setError('Enter whole floor numbers (0 = ground floor)');
    if (last < first) return setError('"Up to" must not be lower than the first floor number');
    if (last - first >= 100) return setError('Add at most 100 floors at a time');
    const list = [];
    for (let n = first; n <= last; n++) {
      if (used.includes(n)) return setError(`Floor number ${n} already exists`);
      list.push({ floorNumber: n, floorName: single && name.trim() ? name.trim() : defaultFloorName(n) });
    }
    setSaving(true);
    try {
      await onAdd(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <p className="text-sm text-slate-600">
        Floors are only names here — all of them are mapped on the building's one image.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Floor number" name="from" type="number" step="1" required value={from}
                   onChange={(e) => { setFrom(e.target.value); setError(''); }} hint="0 = ground floor" />
        <TextInput label="Up to (optional)" name="to" type="number" step="1" value={to}
                   onChange={(e) => { setTo(e.target.value); setError(''); }} hint="Adds every floor in between" />
      </div>
      {single && (
        <TextInput label="Floor name" name="name" value={name} onChange={(e) => setName(e.target.value)}
                   placeholder={Number.isInteger(first) ? defaultFloorName(first) : 'Floor name'} maxLength={60} />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" className="pm-btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="pm-btn-primary" disabled={saving}>
          {saving ? <Spinner size={16} /> : <Plus size={16} />}
          {single ? 'Add floor' : `Add ${Number.isInteger(last - first) && last >= first ? last - first + 1 : ''} floors`}
        </button>
      </div>
    </form>
  );
}

/**
 * /dashboard/property/:id/mapping — the PlotMapper editor for one listing.
 * LAND listing: one layout image, every plot on it.
 * APARTMENT listing: one building image; pick a floor in the header and map
 * that floor's flats on the same image.
 */
export default function PropertyMappingPage() {
  const { id } = useParams();
  const toast = usePlotToast();
  const confirm = useConfirm();

  const [project, setProject] = useState(null);
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState(null);
  const [error, setError] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [addingFloors, setAddingFloors] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const dirty = useRef(false);

  const load = useCallback(() => {
    setError(null);
    mapService.get(id)
      .then((data) => { setProject(data.project); setFloors(data.floors); })
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  // Keep a valid floor selected as floors come and go.
  useEffect(() => {
    if (!floors.some((f) => f._id === floorId)) setFloorId(floors[0]?._id || null);
  }, [floors, floorId]);

  if (error) return <div className="pm-root p-6"><ErrorState message={error} onRetry={load} /></div>;
  if (!project) return <div className="pm-root"><PageLoader /></div>;

  const isApartment = project.type === 'APARTMENT';
  const applySaved = (data) => { setProject(data.project); setFloors(data.floors); setReplacing(false); };

  if (!project.layoutImage?.url || replacing) {
    return <LayoutUpload project={project} replacing={replacing} onSaved={applySaved} onCancel={() => setReplacing(false)} />;
  }

  const leaveOk = async () => !dirty.current || confirm({
    title: 'Leave this floor?',
    message: 'Shapes you have not saved on this floor will be lost.',
  });

  const addFloors = async (list) => {
    const updated = await floorService.create(project._id, list.length === 1 ? list[0] : { floors: list });
    setFloors(updated);
    setProject((p) => ({ ...p, hasUnpublishedChanges: true }));
    // Jump to the first floor just added, unless there are unsaved shapes on screen.
    const added = updated.find((f) => f.floorNumber === list[0].floorNumber);
    if (added && !dirty.current) setFloorId(added._id);
    setAddingFloors(false);
    toast.success(list.length === 1 ? `${list[0].floorName} added` : `${list.length} floors added`);
  };

  // Apartment with no floors yet: that is the only thing to do next.
  if (isApartment && !floors.length) {
    return (
      <div className="pm-root min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-lg px-4 py-10">
          <Link to={BACK_TO} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
            <ArrowLeft size={16} /> {project.name}
          </Link>
          <div className="pm-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Layers size={22} /></div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Add the building's floors</h1>
                <p className="text-sm text-slate-500">Then pick a floor and draw its flats on the image.</p>
              </div>
            </div>
            <AddFloorsForm floors={floors} totalFloors={project.totalFloors} onAdd={addFloors} />
          </div>
          <button type="button" className="pm-btn-ghost mt-3 text-xs" onClick={() => setReplacing(true)}>
            <ImagePlus size={14} /> Replace the building image
          </button>
        </div>
      </div>
    );
  }

  const floor = isApartment ? floors.find((f) => f._id === floorId) || floors[0] : null;

  const switchFloor = async (nextId) => {
    if (nextId !== floor?._id && (await leaveOk())) setFloorId(nextId);
  };

  const renameFloor = async () => {
    const name = window.prompt('Floor name', floor.floorName);
    if (name === null || !name.trim() || name.trim() === floor.floorName) return;
    try {
      setFloors(await floorService.update(project._id, floor._id, { floorName: name.trim() }));
      setProject((p) => ({ ...p, hasUnpublishedChanges: true }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteFloor = async () => {
    const flats = floor.stats?.total || 0;
    const ok = await confirm({
      title: `Delete ${floor.floorName}?`,
      message: flats ? `Its ${flats} mapped flat${flats > 1 ? 's' : ''} will be deleted too. This cannot be undone.` : 'This cannot be undone.',
    });
    if (!ok) return;
    try {
      const data = await floorService.remove(project._id, floor._id);
      dirty.current = false;
      setFloors(data.floors);
      setProject((p) => ({ ...p, hasUnpublishedChanges: true }));
      toast.success(`${floor.floorName} deleted`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const askReplace = async () => {
    const ok = await confirm({
      title: 'Replace the map image?',
      message: 'Existing shapes are stored relative to the image size. They stay aligned only if the new image has the same framing (e.g. a sharper version of the same layout).',
    });
    if (ok) setReplacing(true);
  };

  return (
    <div className="h-screen">
      <ImageMapper
        key={floor?._id || 'land'}
        project={project}
        floor={floor}
        floors={floors}
        imageUrl={project.layoutImage.url}
        title={isApartment ? `${floor.floorName} · Flat mapping` : 'Plot mapping'}
        backTo={BACK_TO}
        onProjectChange={(patch) => setProject((p) => ({ ...p, ...patch }))}
        onDirtyChange={(value) => { dirty.current = value; }}
        headerExtra={
          <div className="flex flex-none items-center gap-1.5">
            {isApartment && (
              <>
                <Layers size={16} className="hidden flex-none text-slate-400 sm:block" />
                <select
                  className="pm-input w-auto py-1.5 text-xs"
                  value={floor._id}
                  onChange={(e) => switchFloor(e.target.value)}
                  aria-label="Floor being mapped"
                  title="Floor being mapped — its flats are drawn on this same image"
                >
                  {floors.map((f) => (
                    <option key={f._id} value={f._id}>{f.floorName} ({f.stats?.total || 0})</option>
                  ))}
                </select>
                <button type="button" className="pm-btn-ghost px-2" onClick={() => setAddingFloors(true)} title="Add floors" aria-label="Add floors">
                  <Plus size={16} />
                </button>
                <button type="button" className="pm-btn-ghost px-2" onClick={renameFloor} title="Rename this floor" aria-label="Rename this floor">
                  <Pencil size={15} />
                </button>
                <button type="button" className="pm-btn-ghost px-2 text-red-600 hover:bg-red-50" onClick={deleteFloor} title="Delete this floor" aria-label="Delete this floor">
                  <Trash2 size={15} />
                </button>
              </>
            )}
            <button type="button" className="pm-btn-ghost whitespace-nowrap px-2 text-xs" onClick={() => setEmbedOpen(true)} title="Embed this map on another website">
              <Code2 size={15} /> <span className="hidden xl:inline">Embed</span>
            </button>
            <button type="button" className="pm-btn-ghost hidden whitespace-nowrap text-xs md:inline-flex" onClick={askReplace}>
              <ImagePlus size={14} /> Replace image
            </button>
          </div>
        }
      />

      <Modal open={embedOpen} onClose={() => setEmbedOpen(false)} title="Embed this map on any website" size="full">
        {project.publishStatus === 'PUBLISHED' ? (
          <EmbedCodeGenerator project={project} />
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Code2}
              title="Publish the map to get the embed code"
              message="The iframe always loads the latest PUBLISHED version, so there is nothing to show until you publish."
            />
          </div>
        )}
      </Modal>

      <Modal open={addingFloors} onClose={() => setAddingFloors(false)} title="Add floors" size="sm">
        <AddFloorsForm floors={floors} totalFloors={project.totalFloors} onAdd={addFloors} onCancel={() => setAddingFloors(false)} />
      </Modal>
    </div>
  );
}
