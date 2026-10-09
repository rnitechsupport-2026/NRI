import { useState } from 'react';
import { PenTool, RotateCcw, Save, Spline, Trash2, X } from 'lucide-react';
import { TextInput, TextArea, SelectInput } from '../common/FormControls';
import MultiImageUpload from '../common/MultiImageUpload';
import { Spinner } from '../common/Feedback';
import { statusConfig, STATUS_KEYS } from '../../utils/statusConfig';
import { AREA_UNITS, BHK_OPTIONS, FACINGS, FLAT_TYPES, PRICE_TYPES } from '../../utils/constants';

const toFormValues = (property) => ({
  floorId: property.floorId || '',
  propertyNumber: property.propertyNumber || '',
  name: property.name || '',
  dimensions: property.dimensions || '',
  area: property.area ?? '',
  areaUnit: property.areaUnit || 'sq.ft',
  flatType: property.flatType || '',
  bhk: property.bhk || '',
  facing: property.facing || '',
  price: property.price ?? '',
  priceType: property.priceType || 'TOTAL',
  status: property.status || 'AVAILABLE',
  description: property.description || '',
  contactName: property.contactName || '',
  contactPhone: property.contactPhone || '',
  images: property.images || [],
});

/**
 * Details form for a plot (LAND) or a flat (APARTMENT).
 * The parent should render it with key={property._id} so it resets per property.
 */
export default function PropertyForm({
  property,
  projectType,
  floors = [],
  onSave,
  onCancel,
  onDelete,
  // Shape actions (only shown inside the mapping editor)
  onRedraw,
  onEditShape,
  onResetShape,
  isShapeDirty = false,
  compact = false,
}) {
  const [values, setValues] = useState(() => toFormValues(property));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isFlat = projectType === 'APARTMENT';

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.propertyNumber.trim()) next.propertyNumber = `${isFlat ? 'Flat' : 'Plot'} number is required`;
    if (values.area !== '' && (Number.isNaN(Number(values.area)) || Number(values.area) < 0)) next.area = 'Enter a valid area';
    if (values.price !== '' && (Number.isNaN(Number(values.price)) || Number(values.price) < 0)) next.price = 'Enter a valid price';
    if (isFlat && !values.floorId) next.floorId = 'Select a floor';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        ...values,
        propertyNumber: values.propertyNumber.trim(),
        area: values.area === '' ? null : Number(values.area),
        price: values.price === '' ? null : Number(values.price),
        flatType: isFlat ? values.flatType : '',
        bhk: isFlat ? values.bhk || null : null,
        floorId: isFlat ? values.floorId : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const showShapeActions = Boolean(onRedraw || onEditShape);

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className={`flex-1 space-y-4 overflow-y-auto ${compact ? 'p-4' : 'p-5'}`}>
        {property.isNew && (
          <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            Shape drawn with {property.polygon?.length} corners. Fill in the details and save.
          </div>
        )}

        {showShapeActions && (
          <div className="flex flex-wrap gap-2">
            {onEditShape && (
              <button type="button" className="pm-btn-secondary px-2.5 py-1.5 text-xs" onClick={onEditShape}>
                <Spline size={14} /> Edit shape
              </button>
            )}
            {onRedraw && (
              <button type="button" className="pm-btn-secondary px-2.5 py-1.5 text-xs" onClick={onRedraw}>
                <PenTool size={14} /> Redraw
              </button>
            )}
            {onResetShape && isShapeDirty && (
              <button type="button" className="pm-btn-secondary px-2.5 py-1.5 text-xs text-amber-700" onClick={onResetShape}>
                <RotateCcw size={14} /> Reset shape
              </button>
            )}
          </div>
        )}

        {/* Status as big colored buttons – the most frequently changed field */}
        <div>
          <p className="pm-label">Status</p>
          <div className="grid grid-cols-4 gap-2">
            {STATUS_KEYS.map((key) => {
              const active = values.status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('status')(key)}
                  className={`rounded-lg border px-1 py-2 text-xs font-semibold transition ${
                    active ? 'text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  style={active ? { background: statusConfig[key].color, borderColor: statusConfig[key].color } : undefined}
                >
                  {statusConfig[key].label}
                </button>
              );
            })}
          </div>
        </div>

        {isFlat && (
          <SelectInput
            label="Floor"
            name="floorId"
            required
            value={values.floorId}
            onChange={set('floorId')}
            error={errors.floorId}
            placeholder="Select floor"
            options={floors.map((f) => ({ value: f._id, label: f.floorName }))}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label={isFlat ? 'Flat number' : 'Plot number'}
            name="propertyNumber"
            required
            value={values.propertyNumber}
            onChange={set('propertyNumber')}
            error={errors.propertyNumber}
            placeholder={isFlat ? 'A-402' : '01'}
          />
          <TextInput
            label={isFlat ? 'Flat name' : 'Plot name'}
            name="name"
            value={values.name}
            onChange={set('name')}
            placeholder="Optional"
          />
        </div>

        {isFlat && (
          <div className="grid grid-cols-2 gap-3">
            <SelectInput label="Flat type" name="flatType" value={values.flatType} onChange={set('flatType')} placeholder="Select" options={FLAT_TYPES} />
            <SelectInput label="BHK" name="bhk" value={values.bhk} onChange={set('bhk')} placeholder="Select" options={BHK_OPTIONS} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Area" name="area" type="number" min="0" step="any" value={values.area} onChange={set('area')} error={errors.area} />
          <SelectInput label="Area unit" name="areaUnit" value={values.areaUnit} onChange={set('areaUnit')} options={AREA_UNITS} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Measurements" name="dimensions" value={values.dimensions} onChange={set('dimensions')} placeholder={isFlat ? 'e.g. 36 × 42 ft' : 'e.g. 30 × 40 ft'} maxLength={80} />
          <SelectInput label="Facing" name="facing" value={values.facing} onChange={set('facing')} placeholder="Select" options={FACINGS} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Price (₹)"
            name="price"
            type="number"
            min="0"
            step="any"
            value={values.price}
            onChange={set('price')}
            error={errors.price}
            disabled={values.priceType === 'ON_REQUEST'}
          />
          <SelectInput label="Price type" name="priceType" value={values.priceType} onChange={set('priceType')} options={PRICE_TYPES} />
        </div>

        <TextArea label="Description" name="description" value={values.description} onChange={set('description')} rows={3} />

        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Contact name" name="contactName" value={values.contactName} onChange={set('contactName')} />
          <TextInput label="Contact phone" name="contactPhone" type="tel" value={values.contactPhone} onChange={set('contactPhone')} />
        </div>

        <MultiImageUpload value={values.images} onChange={set('images')} />
      </div>

      <div className="flex flex-none items-center gap-2 border-t border-slate-200 bg-white p-3">
        {onDelete && (
          <button type="button" className="pm-btn-ghost px-2.5 text-red-600 hover:bg-red-50" onClick={onDelete} title="Delete">
            <Trash2 size={16} />
          </button>
        )}
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <button type="button" className="pm-btn-secondary" onClick={onCancel}>
              <X size={16} /> {property.isNew ? 'Discard' : 'Close'}
            </button>
          )}
          <button type="submit" className="pm-btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
