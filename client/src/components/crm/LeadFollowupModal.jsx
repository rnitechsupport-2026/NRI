import { useState } from 'react';
import { Modal, Field } from '../ui.jsx';

export default function LeadFollowupModal({ lead, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [temperature, setTemperature] = useState(lead.temperature || 'cold');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await onSubmit({ text, temperature });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not log this follow-up');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Log a follow-up — ${lead.name}`} onClose={onClose}
           footer={
             <>
               <button className="btn btn-outline" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={busy || text.trim().length < 2}>
                 {busy ? <span className="spinner" /> : 'Save follow-up'}
               </button>
             </>
           }>
      <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
        {error && <p className="err">{error}</p>}
        <Field label="What happened?" required>
          <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)}
                    placeholder="Called, interested in a weekend site visit…" autoFocus />
        </Field>
        <Field label="Temperature" hint="How warm is this lead after this interaction?">
          <select className="select" value={temperature} onChange={(e) => setTemperature(e.target.value)}>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </Field>
      </form>
    </Modal>
  );
}
