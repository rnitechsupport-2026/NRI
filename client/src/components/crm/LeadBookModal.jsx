import { useState } from 'react';
import { Modal, Field } from '../ui.jsx';

export default function LeadBookModal({ lead, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await onSubmit({ amount: Number(amount), unit, booking_date: bookingDate, notes });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not mark this lead as booked');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Mark booked — ${lead.name}`} onClose={onClose}
           footer={
             <>
               <button className="btn btn-outline" onClick={onClose}>Cancel</button>
               <button className="btn btn-primary" onClick={submit} disabled={busy || !amount}>
                 {busy ? <span className="spinner" /> : 'Confirm booking'}
               </button>
             </>
           }>
      <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
        {error && <p className="err">{error}</p>}
        <Field label="Booking amount" required hint="Token / booking amount received">
          <input className="input" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                 placeholder="500000" autoFocus required />
        </Field>
        <Field label="Unit / Flat no." hint="Optional">
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="A-204" />
        </Field>
        <Field label="Booking date">
          <input className="input" type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
        </Field>
        <Field label="Notes" hint="Optional">
          <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
