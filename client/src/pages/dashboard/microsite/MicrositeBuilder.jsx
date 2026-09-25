import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Notice, PageLoader } from '../../../components/ui.jsx';
import {
  Plus, Trash, Eye, EyeOff, Menu as GripIcon, Monitor, Tablet, Smartphone, Send,
} from '../../../components/Icons.jsx';
import MicrositeRenderer from '../../../microsite/property/MicrositeRenderer.jsx';
import IframePreview from '../../../microsite/property/IframePreview.jsx';
import { SECTION_REGISTRY } from '../../../microsite/property/registry.js';
import { resolveTheme } from '../../../microsite/property/theme.js';

const GROUPS = ['Basic', 'Property', 'Lead Generation', 'Other'];
const WIDTHS = { desktop: '100%', tablet: '768px', mobile: '390px' };
let tmpId = 0;
const newId = () => `new-${++tmpId}`;

function defaultSectionData(type) {
  if (type === 'highlights') return { heading: 'Highlights', items: ['', ''] };
  if (type === 'testimonials') return { heading: 'What People Say', items: [{ name: '', text: '' }] };
  if (type === 'faq') return { heading: 'Frequently Asked Questions', items: [{ question: '', answer: '' }] };
  if (type === 'text') return { heading: '', text: '' };
  return {};
}

function SortableRow({ id, section, active, onSelect, onToggle, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const label = SECTION_REGISTRY[section.sectionType]?.label || section.sectionType;

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: active ? 'var(--line)' : 'transparent', cursor: 'pointer' }}
         onClick={() => onSelect(id)}>
      <button type="button" {...attributes} {...listeners} className="btn btn-xs" style={{ cursor: 'grab', background: 'transparent' }} onClick={(e) => e.stopPropagation()}>
        <GripIcon style={{ width: 14, height: 14 }} />
      </button>
      <span className="small" style={{ flex: 1, opacity: section.isVisible === false ? 0.45 : 1 }}>{label}</span>
      <button type="button" className="btn btn-xs" style={{ background: 'transparent' }}
              onClick={(e) => { e.stopPropagation(); onToggle(id); }} title={section.isVisible === false ? 'Hidden' : 'Visible'}>
        {section.isVisible === false ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
      </button>
      <button type="button" className="btn btn-xs" style={{ background: 'transparent', color: 'var(--red-600, #dc2626)' }}
              onClick={(e) => { e.stopPropagation(); onRemove(id); }} title="Remove">
        <Trash style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

export default function MicrositeBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();

  const [property, setProperty] = useState(null);
  const [microsite, setMicrosite] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState('section'); // 'section' | 'theme' | 'navbar'
  const [width, setWidth] = useState('desktop');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    api.get(`/microsites/${id}`)
      .then((r) => {
        const { microsite: m, sections: s, property: p } = r.data.data;
        setMicrosite(m);
        setProperty(p);
        const withIds = s.map((sec) => ({ ...sec, _localId: sec.id }));
        setSections(withIds);
        if (withIds[0]) setSelectedId(withIds[0]._localId);
      })
      .catch((e) => setError(errMsg(e, 'Could not load this microsite')));
  }, [id]);

  const selected = sections.find((s) => s._localId === selectedId) || null;

  function updateSection(localId, patch) {
    setSections((cur) => cur.map((s) => (s._localId === localId ? { ...s, ...patch } : s)));
  }
  function updateSectionData(localId, patch) {
    setSections((cur) => cur.map((s) => (s._localId === localId ? { ...s, sectionData: { ...s.sectionData, ...patch } } : s)));
  }
  function updateSectionSettings(localId, patch) {
    setSections((cur) => cur.map((s) => (s._localId === localId ? { ...s, settings: { ...s.settings, ...patch } } : s)));
  }

  function addSection(type) {
    const localId = newId();
    setSections((cur) => [...cur, {
      _localId: localId, sectionType: type, isVisible: true,
      sectionData: defaultSectionData(type), settings: {},
    }]);
    setSelectedId(localId);
    setPanel('section');
  }
  function removeSection(localId) {
    setSections((cur) => cur.filter((s) => s._localId !== localId));
    if (selectedId === localId) setSelectedId(null);
  }
  function toggleVisible(localId) {
    setSections((cur) => cur.map((s) => (s._localId === localId ? { ...s, isVisible: s.isVisible === false } : s)));
  }

  function handleDragEnd(evt) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    setSections((cur) => {
      const oldIndex = cur.findIndex((s) => s._localId === active.id);
      const newIndex = cur.findIndex((s) => s._localId === over.id);
      return arrayMove(cur, oldIndex, newIndex);
    });
  }

  const rendererSections = useMemo(
    () => sections.map((s, i) => ({ ...s, sectionOrder: i, id: s._localId })),
    [sections]
  );

  async function saveDraft(silent = false) {
    setSaving(true);
    try {
      await api.put(`/microsites/${id}/sections`, {
        sections: sections.map((s, i) => ({
          sectionType: s.sectionType, sectionOrder: i, isVisible: s.isVisible !== false,
          sectionData: s.sectionData || {}, settings: s.settings || {},
        })),
      });
      await api.put(`/microsites/${id}`, { theme: microsite.theme, navbar: microsite.navbar });
      if (!silent) toast.success('Draft saved');
    } catch (e) {
      toast.error(errMsg(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    try {
      await saveDraft(true);
      window.open(`/site/${microsite.slug}?preview=1`, '_blank');
    } catch { /* toast already shown */ }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await saveDraft(true);
      await api.post(`/microsites/${id}/publish`);
      toast.success('Microsite published!');
      const url = `${window.location.origin}/site/${microsite.slug}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.info(`Live at ${url} (link copied)`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPublishing(false);
    }
  }

  if (error) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <Notice type="err">{error}</Notice>
        <Link to="/dashboard/microsites" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>Back to My Microsites</Link>
      </div>
    );
  }
  if (!property || !microsite) return <PageLoader label="Loading builder…" />;

  const theme = resolveTheme(microsite.theme);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row-between">
        <div>
          <h2>{property.title}</h2>
          <p className="muted small mt-1">
            {microsite.status === 'published' ? 'Published' : 'Draft'} · /site/{microsite.slug}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-outline btn-sm" disabled={saving} onClick={() => saveDraft()}>
            {saving ? <span className="spinner" /> : 'Save Draft'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handlePreview}>Preview</button>
          <button className="btn btn-primary btn-sm" disabled={publishing} onClick={handlePublish}>
            {publishing ? <span className="spinner" /> : <><Send style={{ width: 14, height: 14 }} /> Publish</>}
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        {[['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]].map(([k, Icon]) => (
          <button key={k} className={`btn btn-xs ${width === k ? 'btn-dark' : 'btn-outline'}`} onClick={() => setWidth(k)}>
            <Icon style={{ width: 14, height: 14 }} /> {k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 14, alignItems: 'start' }}>
        {/* ---- left: palette + section list ---- */}
        <div className="card card-p stack" style={{ gap: 14, maxHeight: '80vh', overflowY: 'auto' }}>
          <div>
            <div className="row-between mb-2">
              <button className={`btn btn-xs ${panel === 'section' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPanel('section')}>Sections</button>
              <button className={`btn btn-xs ${panel === 'theme' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPanel('theme')}>Theme</button>
              <button className={`btn btn-xs ${panel === 'navbar' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setPanel('navbar')}>Navbar</button>
            </div>
          </div>

          <div>
            <div className="tiny muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>Current Page</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s._localId)} strategy={verticalListSortingStrategy}>
                <div className="stack" style={{ gap: 4 }}>
                  {sections.map((s) => (
                    <SortableRow key={s._localId} id={s._localId} section={s}
                                 active={s._localId === selectedId}
                                 onSelect={(lid) => { setSelectedId(lid); setPanel('section'); }}
                                 onToggle={toggleVisible} onRemove={removeSection} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div>
            {GROUPS.map((g) => (
              <div key={g} className="mb-3">
                <div className="tiny muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{g}</div>
                <div className="stack" style={{ gap: 4 }}>
                  {Object.entries(SECTION_REGISTRY).filter(([, v]) => v.group === g).map(([type, v]) => (
                    <button key={type} type="button" className="btn btn-xs btn-outline" style={{ justifyContent: 'flex-start' }} onClick={() => addSection(type)}>
                      <Plus style={{ width: 12, height: 12 }} /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- center: live canvas ----
            A real <iframe> (not a width-clamped div) so Tailwind's sm:/md:
            breakpoints — which key off the viewport, not the nearest
            container — actually respond to the Desktop/Tablet/Mobile toggle
            instead of staying frozen in their desktop arrangement. */}
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--line)', display: 'flex', justifyContent: 'center', background: '#e5e7eb', maxHeight: '80vh' }}>
          <IframePreview width={WIDTHS[width]} style={{ maxWidth: '100%', height: '80vh' }}>
            <MicrositeRenderer property={property} sections={rendererSections} theme={microsite.theme} navbar={microsite.navbar} />
          </IframePreview>
        </div>

        {/* ---- right: settings ---- */}
        <div className="card card-p stack" style={{ gap: 14, maxHeight: '80vh', overflowY: 'auto' }}>
          {panel === 'section' && (
            selected ? (
              <SectionSettings section={selected} onData={(p) => updateSectionData(selected._localId, p)}
                                onSettings={(p) => updateSectionSettings(selected._localId, p)} />
            ) : <p className="muted small">Select a section to edit its settings, or add one from the left.</p>
          )}
          {panel === 'theme' && (
            <ThemeSettings theme={microsite.theme} onChange={(t) => setMicrosite((m) => ({ ...m, theme: { ...m.theme, ...t } }))} />
          )}
          {panel === 'navbar' && (
            <NavbarSettings navbar={microsite.navbar} onChange={(n) => setMicrosite((m) => ({ ...m, navbar: { ...m.navbar, ...n } }))} />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <label className="stack" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
    </label>
  );
}

function SectionSettings({ section, onData, onSettings }) {
  const type = section.sectionType;
  const data = section.sectionData || {};
  const settings = section.settings || {};
  const label = SECTION_REGISTRY[type]?.label || type;

  const listField = (key, itemFields) => {
    const items = Array.isArray(data[key]) ? data[key] : [];
    return (
      <div className="stack" style={{ gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} className="card card-p stack" style={{ gap: 6, padding: 8 }}>
            {itemFields.map((f) => (
              <input key={f.key} className="input input-sm" placeholder={f.label}
                     value={typeof item === 'string' ? item : (item[f.key] || '')}
                     onChange={(e) => {
                       const next = [...items];
                       next[i] = typeof item === 'string' ? e.target.value : { ...item, [f.key]: e.target.value };
                       onData({ [key]: next });
                     }} />
            ))}
            <button type="button" className="btn btn-xs btn-outline" onClick={() => onData({ [key]: items.filter((_, idx) => idx !== i) })}>Remove</button>
          </div>
        ))}
        <button type="button" className="btn btn-xs btn-outline"
                onClick={() => onData({ [key]: [...items, itemFields.length === 1 ? '' : Object.fromEntries(itemFields.map((f) => [f.key, '']))] })}>
          <Plus style={{ width: 12, height: 12 }} /> Add
        </button>
      </div>
    );
  };

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="strong small">{label} settings</div>

      {(type === 'hero' || type === 'splitHero' || type === 'overview' || type === 'highlights' || type === 'gallery' || type === 'masonryGallery' || type === 'amenities' ||
        type === 'floorPlan' || type === 'location' || type === 'ownerInfo' || type === 'pricing' || type === 'enquiryForm' ||
        type === 'callCta' || type === 'whatsappCta' || type === 'siteVisitCta' || type === 'brochureCta' ||
        type === 'testimonials' || type === 'faq' || type === 'text') && type !== 'splitHero' && (
        <Row label="Heading">
          <input className="input input-sm" value={data.heading || ''} onChange={(e) => onData({ heading: e.target.value })} />
        </Row>
      )}

      {(type === 'hero' || type === 'splitHero') && (
        <>
          <Row label="Title (blank = property title)"><input className="input input-sm" value={data.title || ''} onChange={(e) => onData({ title: e.target.value })} /></Row>
          <Row label="Subtitle"><input className="input input-sm" value={data.subtitle || ''} onChange={(e) => onData({ subtitle: e.target.value })} /></Row>
          <Row label="Button text"><input className="input input-sm" value={data.buttonText || ''} onChange={(e) => onData({ buttonText: e.target.value })} /></Row>
        </>
      )}
      {type === 'hero' && (
        <>
          <Row label="Alignment">
            <select className="select select-sm" value={settings.alignment || 'center'} onChange={(e) => onSettings({ alignment: e.target.value })}>
              <option value="center">Center</option><option value="left">Left</option>
            </select>
          </Row>
          <Row label="Height">
            <select className="select select-sm" value={settings.height || 'normal'} onChange={(e) => onSettings({ height: e.target.value })}>
              <option value="normal">Normal</option><option value="tall">Tall</option>
            </select>
          </Row>
          <Row label="Overlay darkness">
            <input type="range" min="0" max="0.8" step="0.05" value={settings.overlay ?? 0.5} onChange={(e) => onSettings({ overlay: Number(e.target.value) })} />
          </Row>
        </>
      )}
      {type === 'splitHero' && (
        <Row label="Photo side">
          <select className="select select-sm" value={settings.imagePosition || 'right'} onChange={(e) => onSettings({ imagePosition: e.target.value })}>
            <option value="right">Right</option><option value="left">Left</option>
          </select>
        </Row>
      )}

      {(type === 'floorPlan' || type === 'callCta' || type === 'whatsappCta' || type === 'siteVisitCta' || type === 'brochureCta' || type === 'hero') && (
        <Row label="Button text override"><input className="input input-sm" value={data.buttonText || ''} onChange={(e) => onData({ buttonText: e.target.value })} /></Row>
      )}
      {(type === 'callCta' || type === 'whatsappCta' || type === 'siteVisitCta' || type === 'brochureCta') && (
        <Row label="Description"><textarea className="textarea" rows={2} value={data.description || ''} onChange={(e) => onData({ description: e.target.value })} /></Row>
      )}

      {type === 'gallery' && (
        <>
          <Row label="Columns">
            <select className="select select-sm" value={settings.columns || 3} onChange={(e) => onSettings({ columns: Number(e.target.value) })}>
              <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </Row>
        </>
      )}

      {type === 'highlights' && listField('items', [{ key: 'value', label: 'Highlight' }])}
      {type === 'testimonials' && listField('items', [{ key: 'name', label: 'Name' }, { key: 'text', label: 'Quote' }])}
      {type === 'faq' && listField('items', [{ key: 'question', label: 'Question' }, { key: 'answer', label: 'Answer' }])}
      {type === 'text' && <Row label="Text"><textarea className="textarea" rows={4} value={data.text || ''} onChange={(e) => onData({ text: e.target.value })} /></Row>}
      {(type === 'image' || type === 'imageText') && (
        <>
          <Row label="Image URL"><input className="input input-sm" value={data.image || ''} onChange={(e) => onData({ image: e.target.value })} /></Row>
          {type === 'imageText' && <Row label="Text"><textarea className="textarea" rows={3} value={data.text || ''} onChange={(e) => onData({ text: e.target.value })} /></Row>}
        </>
      )}

      <Row label="Section background">
        <select className="select select-sm" value={settings.tone || 'light'} onChange={(e) => onSettings({ tone: e.target.value })}>
          <option value="light">Light</option><option value="dark">Dark (brand color)</option>
        </select>
      </Row>
    </div>
  );
}

function ThemeSettings({ theme, onChange }) {
  const t = resolveTheme(theme);
  const colorField = (key, label) => (
    <Row label={label}>
      <input type="color" value={t[key]} onChange={(e) => onChange({ [key]: e.target.value })} style={{ height: 32, width: '100%' }} />
    </Row>
  );
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="strong small">Theme</div>
      {colorField('primaryColor', 'Primary color')}
      {colorField('secondaryColor', 'Secondary color')}
      {colorField('backgroundColor', 'Background color')}
      {colorField('textColor', 'Text color')}
      <Row label="Button style">
        <select className="select select-sm" value={t.buttonStyle} onChange={(e) => onChange({ buttonStyle: e.target.value })}>
          <option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Pill</option>
        </select>
      </Row>
      <Row label="Corner radius">
        <select className="select select-sm" value={t.borderRadius} onChange={(e) => onChange({ borderRadius: e.target.value })}>
          <option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="full">Full</option>
        </select>
      </Row>
      <Row label="Font style">
        <select className="select select-sm" value={t.fontStyle} onChange={(e) => onChange({ fontStyle: e.target.value })}>
          <option value="modern">Modern (sans)</option><option value="classic">Classic (serif)</option><option value="editorial">Editorial (serif)</option>
        </select>
      </Row>
      <Row label="Section spacing">
        <select className="select select-sm" value={t.sectionSpacing} onChange={(e) => onChange({ sectionSpacing: e.target.value })}>
          <option value="compact">Compact</option><option value="normal">Normal</option><option value="spacious">Spacious</option>
        </select>
      </Row>
    </div>
  );
}

function NavbarSettings({ navbar = {}, onChange }) {
  const items = navbar.items || [];
  function updateItem(i, patch) {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange({ items: next });
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="strong small">Navbar</div>
      <Row label="Background color">
        <input type="color" value={navbar.background || '#ffffff'} onChange={(e) => onChange({ background: e.target.value })} style={{ height: 32, width: '100%' }} />
      </Row>
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={navbar.sticky !== false} onChange={(e) => onChange({ sticky: e.target.checked })} />
        <span className="small">Sticky on scroll</span>
      </label>
      <div>
        <div className="tiny muted mb-1">Menu items</div>
        <div className="stack" style={{ gap: 6 }}>
          {items.map((it, i) => (
            <div key={it.key} className="row" style={{ gap: 6 }}>
              <input className="input input-sm" style={{ flex: 1 }} value={it.label} onChange={(e) => updateItem(i, { label: e.target.value })} />
              <button type="button" className="btn btn-xs" style={{ background: 'transparent' }} onClick={() => updateItem(i, { visible: it.visible === false })}>
                {it.visible === false ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
