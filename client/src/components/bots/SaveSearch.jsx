import { useState } from 'react';
import api, { errMsg } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Bell, Check } from '../Icons.jsx';

/**
 * "Alert me about new matches" — creates a saved search that the new-listing
 * bot re-runs, notifying the user when a fresh listing fits.
 */
export default function SaveSearch({ params, label }) {
  const { isAuthed } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = Object.keys(params || {}).filter((k) => !['page', 'sort', 'limit'].includes(k));
  if (!active.length) return null;

  async function save() {
    if (!isAuthed) { toast.info('Login to get alerts for this search'); return; }
    setBusy(true);
    try {
      await api.post('/bots/saved-searches', {
        label: label || 'My search',
        params: Object.fromEntries(active.map((k) => [k, String(params[k])])),
      });
      setSaved(true);
      toast.success("Saved — we'll alert you when new listings match");
    } catch (e) {
      toast.error(errMsg(e, 'Could not save this search'));
    } finally { setBusy(false); }
  }

  return (
    <button className={`btn btn-sm ${saved ? 'btn-outline' : 'btn-dark'}`} onClick={save} disabled={busy || saved}>
      {saved ? <><Check /> Alerts on</> : <><Bell /> Alert me</>}
    </button>
  );
}
