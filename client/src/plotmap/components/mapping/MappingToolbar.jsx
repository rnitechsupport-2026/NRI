import {
  MousePointer2,
  PenTool,
  Spline,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Scan,
  Maximize,
  Save,
  List,
} from 'lucide-react';
import { Spinner } from '../common/Feedback';

export const TOOLS = [
  { mode: 'select', label: 'Select', icon: MousePointer2, shortcut: 'V' },
  { mode: 'draw', label: 'Draw polygon', icon: PenTool, shortcut: 'D' },
  { mode: 'edit', label: 'Edit polygon', icon: Spline, shortcut: 'E' },
  { mode: 'delete', label: 'Delete polygon', icon: Trash2, shortcut: 'X' },
];

function ToolButton({ icon: Icon, label, shortcut, active, danger, disabled, onClick, badge }) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex h-10 w-10 flex-none items-center justify-center rounded-lg transition lg:h-11 lg:w-full lg:justify-start lg:gap-3 lg:px-3 ${
        active
          ? danger
            ? 'bg-red-600 text-white shadow'
            : 'bg-indigo-600 text-white shadow'
          : 'text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent'
      }`}
    >
      <Icon size={18} className="flex-none" />
      <span className="hidden text-sm font-medium lg:inline">{label}</span>
      {shortcut && <kbd className="ml-auto hidden text-[10px] font-medium opacity-60 xl:inline">{shortcut}</kbd>}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

const Divider = () => <div className="mx-1 h-6 w-px flex-none bg-slate-200 lg:mx-0 lg:my-2 lg:h-px lg:w-full" />;

/** Left rail on desktop, horizontal scrolling bar on mobile. */
export default function MappingToolbar({ editor, viewport, onSave, saving, unsavedCount, onToggleList, onDeleteMode }) {
  return (
    <div className="flex flex-none items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5 lg:w-52 lg:flex-col lg:items-stretch lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3">
      <p className="mb-1 hidden px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">Tools</p>
      {TOOLS.map((tool) => (
        <ToolButton
          key={tool.mode}
          {...tool}
          active={editor.mode === tool.mode}
          danger={tool.mode === 'delete'}
          onClick={() => (tool.mode === 'delete' ? onDeleteMode() : editor.setMode(tool.mode))}
        />
      ))}
      <Divider />
      <ToolButton icon={Undo2} label="Undo" shortcut="Ctrl+Z" disabled={!editor.canUndo} onClick={editor.undo} />
      <ToolButton icon={Redo2} label="Redo" shortcut="Ctrl+Y" disabled={!editor.canRedo} onClick={editor.redo} />
      <Divider />
      <p className="mb-1 hidden px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">View</p>
      <ToolButton icon={ZoomIn} label="Zoom in" shortcut="+" onClick={viewport.zoomIn} />
      <ToolButton icon={ZoomOut} label="Zoom out" shortcut="-" onClick={viewport.zoomOut} />
      <ToolButton icon={Scan} label="Reset view (100%)" shortcut="1" onClick={viewport.resetZoom} />
      <ToolButton icon={Maximize} label="Fit image" shortcut="0" onClick={viewport.fit} />
      <Divider />
      <ToolButton icon={List} label="Properties" onClick={onToggleList} />
      <div className="lg:mt-auto lg:pt-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || unsavedCount === 0}
          title="Save shape changes (Ctrl+S)"
          className="pm-btn-primary h-10 whitespace-nowrap px-3 lg:w-full"
        >
          {saving ? <Spinner size={16} /> : <Save size={16} />}
          <span className="hidden sm:inline">Save</span>
          {unsavedCount > 0 && <span className="rounded bg-white/20 px-1.5 text-xs">{unsavedCount}</span>}
        </button>
      </div>
    </div>
  );
}
