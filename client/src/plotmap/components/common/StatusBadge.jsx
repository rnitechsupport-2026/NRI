import { getStatus } from '../../utils/statusConfig';

export default function StatusBadge({ status, size = 'sm' }) {
  const config = getStatus(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${config.badgeClass} ${
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

export function PublishBadge({ project }) {
  if (project.publishStatus !== 'PUBLISHED') {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
        Draft
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        project.hasUnpublishedChanges
          ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
          : 'bg-indigo-50 text-indigo-700 ring-indigo-600/20'
      }`}
    >
      {project.hasUnpublishedChanges ? 'Published · changes pending' : 'Published'}
    </span>
  );
}

export function ProjectStatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    COMPLETED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status] || styles.INACTIVE}`}>
      {status?.charAt(0) + status?.slice(1).toLowerCase()}
    </span>
  );
}
