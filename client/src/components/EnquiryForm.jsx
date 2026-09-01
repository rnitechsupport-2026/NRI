import { useState } from 'react';
import api, { errMsg, errFields } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Notice } from './ui.jsx';
import { Phone, Whatsapp, CheckCircle } from './Icons.jsx';

/**
 * Shared enquiry form. Pass exactly one of propertyId / projectId / serviceId
 * (or none for the general contact form).
 */
export default function EnquiryForm({
  propertyId, projectId, serviceId, contactPhone,
  title = 'Interested in this property?',
  compact = false,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      await api.post('/leads', {
        ...form,
        property_id: propertyId, project_id: projectId, service_id: serviceId,
      });
      setSent(true);
      toast.success('Enquiry sent — the owner will contact you shortly.');
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card card-p center">
        <CheckCircle style={{ width: 42, height: 42, color: 'var(--green)', margin: '0 auto 12px' }} />
        <h3>Enquiry sent!</h3>
        <p className="muted small mt-1">
          Your details have been shared. Expect a call on <b>{form.phone}</b> shortly.
        </p>
        {contactPhone && (
          <a className="btn btn-outline btn-block mt-3" href={`tel:${contactPhone}`}>
            <Phone /> Call now: {contactPhone}
          </a>
        )}
      </div>
    );
  }

  return (
    <form className={compact ? '' : 'card card-p'} onSubmit={submit}>
      {title && <h3 className="mb-1">{title}</h3>}
      {!compact && <p className="muted small mb-3">Share your details and get a call back within 24 hours.</p>}

      <div className="stack">
        {error && <Notice type="err">{error}</Notice>}

        <Field label="Your name" required error={errors.name}>
          <input className={`input ${errors.name ? 'invalid' : ''}`} value={form.name}
                 onChange={set('name')} placeholder="Full name" required />
        </Field>

        <Field label="Mobile number" required error={errors.phone}>
          <input className={`input ${errors.phone ? 'invalid' : ''}`} value={form.phone}
                 onChange={set('phone')} placeholder="10 digit mobile" inputMode="numeric"
                 maxLength={10} required />
        </Field>

        <Field label="Email" error={errors.email}>
          <input className={`input ${errors.email ? 'invalid' : ''}`} type="email" value={form.email}
                 onChange={set('email')} placeholder="you@example.com" />
        </Field>

        <Field label="Message">
          <textarea className="textarea" rows={3} value={form.message} onChange={set('message')}
                    placeholder="I am interested. Please share more details and arrange a site visit." />
        </Field>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <><span className="spinner" /> Sending…</> : 'Send Enquiry'}
        </button>

        {contactPhone && (
          <div className="grid g-2" style={{ gap: 10 }}>
            <a className="btn btn-outline btn-sm" href={`tel:${contactPhone}`}><Phone /> Call</a>
            <a className="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer"
               href={`https://wa.me/91${contactPhone}?text=${encodeURIComponent('Hi, I saw your listing on RNI Realestate and I am interested.')}`}>
              <Whatsapp /> WhatsApp
            </a>
          </div>
        )}

        <p className="tiny muted center">
          By submitting you agree to be contacted by the advertiser and RNI Realestate.
        </p>
      </div>
    </form>
  );
}
