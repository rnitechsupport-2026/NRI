import { useMemo, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { statusConfig, STATUS_KEYS } from '../../utils/statusConfig';
import { formatArea, formatPrice } from '../../utils/format';

export default function PropertyListPanel({ items, dirtyIds = [], onSelect, projectType }) {
  const [search, setSearch] = useState('');
  const counts = useMemo(
    () => STATUS_KEYS.reduce((acc, key) => ({ ...acc, [key]: items.filter((i) => i.status === key && !i.isNew).length }), {}),
    [items]
  );
  const filtered = items.filter((item) =>
    `${item.propertyNumber} ${item.name}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const noun = projectType === 'APARTMENT' ? 'flats' : 'plots';

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {STATUS_KEYS.map((key) => (
            <div key={key} className="rounded-lg bg-slate-50 px-1 py-2">
              <p className="text-lg font-bold" style={{ color: statusConfig[key].color }}>
                {counts[key]}
              </p>
              <p className="text-[11px] text-slate-500">{statusConfig[key].label}</p>
            </div>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="pm-input pl-9" placeholder={`Search ${noun}…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            <MapPin className="mx-auto mb-2 text-slate-300" />
            {items.length === 0 ? `No ${noun} mapped yet. Choose "Draw polygon" and click the corners on the image.` : 'No matches'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  onClick={() => onSelect(item._id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="h-8 w-1.5 flex-none rounded-full" style={{ background: statusConfig[item.status]?.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.propertyNumber || 'Untitled'}
                      {item.isNew && <span className="ml-2 text-xs font-medium text-indigo-600">new</span>}
                      {dirtyIds.includes(item._id) && <span className="ml-2 text-xs font-medium text-amber-600">edited</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[item.bhk, formatArea(item.area, item.areaUnit), item.price != null && formatPrice(item.price, item.priceType, { short: true })]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  {!item.isNew && <StatusBadge status={item.status} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
