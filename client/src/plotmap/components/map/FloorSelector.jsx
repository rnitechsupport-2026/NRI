import { Layers } from 'lucide-react';

export default function FloorSelector({ floors, activeId, onChange }) {
  if (!floors.length) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Floors">
      <Layers size={16} className="flex-none text-slate-400" />
      {floors.map((floor) => {
        const active = floor._id === activeId;
        return (
          <button
            key={floor._id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(floor._id)}
            className={`flex-none rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              active
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {floor.floorName}
          </button>
        );
      })}
    </div>
  );
}
