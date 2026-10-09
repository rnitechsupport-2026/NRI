import { Rocket, Save } from 'lucide-react';
import Modal from '../common/Modal';
import { Spinner } from '../common/Feedback';
import MapViewer from './MapViewer';

/**
 * Shows the DRAFT map exactly as visitors will see it, with Save Draft / Publish buttons.
 */
export default function MapPreview({
  open,
  onClose,
  project,
  floors,
  properties,
  imageUrl,
  onSaveDraft,
  onPublish,
  savingDraft,
  publishing,
  hasUnsaved,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview map"
      size="full"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {hasUnsaved ? 'You have unsaved shape changes.' : 'Visitors see this only after you publish.'}
          </p>
          <div className="flex gap-2">
            {onSaveDraft && (
              <button type="button" className="pm-btn-secondary flex-1 sm:flex-none" onClick={onSaveDraft} disabled={savingDraft || !hasUnsaved}>
                {savingDraft ? <Spinner size={16} /> : <Save size={16} />} Save draft
              </button>
            )}
            {onPublish && (
              <button type="button" className="pm-btn-primary flex-1 sm:flex-none" onClick={onPublish} disabled={publishing}>
                {publishing ? <Spinner size={16} /> : <Rocket size={16} />} Publish map
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-4">
        {open && (
          <MapViewer project={project} floors={floors} properties={properties} imageUrl={imageUrl} heightClass="h-[60vh] min-h-[300px]" />
        )}
      </div>
    </Modal>
  );
}
