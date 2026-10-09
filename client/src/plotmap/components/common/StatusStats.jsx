import { statusConfig, STATUS_KEYS } from '../../utils/statusConfig';

function Dot({ status }) {
  return <span className="h-2 w-2 flex-none rounded-full" style={{ background: statusConfig[status].color }} />;
}

/**
 * Total + per-status counts for a floor or a whole project.
 * `counts` is { total, AVAILABLE, RESERVED, BOOKED, SOLD }, always derived from real
 * plots/flats (see countByStatus) so it cannot disagree with the map.
 *
 * layout "inline": one wrapping row, used above maps and in the mapping editor.
 * layout "list":   label/value rows, used on floor cards.
 * layout "tiles":  big numbers, used for project totals.
 */
export default function StatusStats({ counts = {}, title, noun = 'flats', layout = 'inline', className = '' }) {
  const total = counts.total || 0;

  if (layout === 'list') {
    return (
      <dl className={`space-y-1.5 text-sm ${className}`} data-stats>
        {STATUS_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <Dot status={key} />
            <dt className="text-slate-600">{statusConfig[key].label}</dt>
            <dd className="ml-auto font-semibold tabular-nums text-slate-900" data-stat={key}>
              {counts[key] || 0}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (layout === 'tiles') {
    return (
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-5 ${className}`} data-stats>
        <div className="col-span-2 rounded-xl bg-slate-900 px-4 py-3 text-white sm:col-span-1">
          <p className="text-xs text-slate-300">Total {noun}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums" data-stat="total">
            {total}
          </p>
        </div>
        {STATUS_KEYS.map((key) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Dot status={key} /> {statusConfig[key].label}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900" data-stat={key}>
              {counts[key] || 0}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${className}`} data-stats>
      {title && <span className="font-semibold text-slate-900">{title}</span>}
      <span className="text-slate-600">
        <strong className="font-semibold tabular-nums text-slate-900" data-stat="total">
          {total}
        </strong>{' '}
        {noun}
      </span>
      {STATUS_KEYS.map((key) => (
        <span key={key} className="inline-flex items-center gap-1.5 text-slate-600">
          <Dot status={key} />
          {statusConfig[key].label}
          <strong className="font-semibold tabular-nums text-slate-900" data-stat={key}>
            {counts[key] || 0}
          </strong>
        </span>
      ))}
    </div>
  );
}
