import { useEffect, useMemo, useState } from 'react';
import api, { errMsg } from '../../api/client.js';
import { Notice } from '../ui.jsx';
import { Sparkle, Check, ChevronLeft } from '../Icons.jsx';
import { money } from '../../utils/format.js';

/**
 * Renders a server-defined question flow as a chat, one question at a time.
 *
 * The qualification, site-visit and feedback bots are all the same interaction
 * with a different script, so they share this component. The script — including
 * the wording — comes from GET /api/bots/flows/:name so copy lives server-side.
 */
export default function FlowRunner({ flow: flowName, extra = {}, onSubmit, onDone }) {
  const [flow, setFlow] = useState(null);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true;
    api.get(`/bots/flows/${flowName}`)
      .then((r) => live && setFlow(r.data.data))
      .catch((e) => live && setError(errMsg(e, 'Could not load this form')));
    return () => { live = false; };
  }, [flowName]);

  /** Steps whose `skipIf` matches the answers so far are dropped. */
  const steps = useMemo(() => {
    if (!flow) return [];
    return flow.steps.filter((s) => {
      if (!s.skipIf) return true;
      return !s.skipIf.in.includes(answers[s.skipIf.key]);
    });
  }, [flow, answers]);

  const step = steps[idx];
  const done = flow && idx >= steps.length;

  function answer(value) {
    setAnswers((a) => ({ ...a, [step.key]: value }));
    setDraft('');
    setIdx((i) => i + 1);
  }

  function back() {
    if (idx === 0) return;
    setIdx((i) => i - 1);
    setDraft('');
  }

  function validate(value) {
    if (!step) return null;
    const v = String(value ?? '').trim();
    if (!v && !step.optional) return 'This one is required';
    if (step.type === 'phone' && v && !/^[0-9]{10}$/.test(v)) return 'Enter a valid 10 digit mobile number';
    if (step.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) return 'Enter a valid email';
    return null;
  }

  function submitText(e) {
    e.preventDefault();
    const err = validate(draft);
    if (err) { setError(err); return; }
    setError('');
    answer(draft.trim());
  }

  async function finish() {
    setBusy(true); setError('');
    try {
      const data = await onSubmit({ ...answers, ...extra });
      setResult(data);
      onDone?.(data);
    } catch (e) {
      setError(errMsg(e, 'Could not submit'));
    } finally {
      setBusy(false);
    }
  }

  if (error && !flow) return <Notice type="err">{error}</Notice>;
  if (!flow) return <div className="bot-loading"><span className="spinner spinner-dark" /><span className="small muted">Loading…</span></div>;

  if (result) {
    return (
      <div className="flow-done">
        <span className="flow-done-ic"><Check /></span>
        <p className="strong">{result.message || 'All done — thank you!'}</p>
        {result.summary && <p className="small muted mt-1">{result.summary}</p>}
      </div>
    );
  }

  return (
    <div className="flow">
      {/* what has been answered so far, as a transcript */}
      {steps.slice(0, idx).map((s) => (
        <div key={s.key} className="flow-turn">
          <p className="flow-q">{s.question}</p>
          <p className="flow-a">{labelFor(s, answers[s.key]) || <em className="muted">skipped</em>}</p>
        </div>
      ))}

      {error && <Notice type="err">{error}</Notice>}

      {!done && step && (
        <div className="flow-active">
          <div className="flow-ask">
            <Sparkle />
            <div>
              <p className="flow-q current">{step.question}</p>
              {step.help && <p className="tiny muted">{step.help}</p>}
            </div>
          </div>

          {step.type === 'choice' && (
            <div className="flow-options">
              {step.options.map((o) => (
                <button key={o.value} className="flow-option" onClick={() => answer(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {step.type === 'budget' && <BudgetStep onPick={answer} />}

          {['text', 'phone', 'email'].includes(step.type) && (
            <form className="flow-input" onSubmit={submitText}>
              <input
                className="input" autoFocus
                type={step.type === 'email' ? 'email' : 'text'}
                inputMode={step.type === 'phone' ? 'numeric' : undefined}
                maxLength={step.type === 'phone' ? 10 : 200}
                placeholder={step.placeholder || ''}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button className="btn btn-primary btn-sm">
                {step.optional && !draft.trim() ? 'Skip' : 'Next'}
              </button>
            </form>
          )}

          <div className="flow-foot">
            <button className="btn btn-xs btn-ghost" onClick={back} disabled={idx === 0}>
              <ChevronLeft /> Back
            </button>
            <span className="tiny muted">{idx + 1} of {steps.length}</span>
          </div>
        </div>
      )}

      {done && (
        <div className="flow-submit">
          <p className="small muted mb-2">That&apos;s everything. Ready to send?</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={back}>Change something</button>
            <button className="btn btn-primary" onClick={finish} disabled={busy}>
              {busy ? <><span className="spinner" /> Sending…</> : (flow.submitLabel || 'Submit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(step, value) {
  if (step.type === 'budget') {
    if (!value) return null;
    const [min, max] = String(value).split('-');
    return max ? `${money(min)} – ${money(max)}` : `Up to ${money(min)}`;
  }
  if (step.options) return step.options.find((o) => String(o.value) === String(value))?.label ?? value;
  return value;
}

/** Budget is a range picker rather than free text — easier on a phone. */
const BANDS = [
  ['0-2500000', 'Under ₹25 Lac'],
  ['2500000-5000000', '₹25 – 50 Lac'],
  ['5000000-10000000', '₹50 Lac – 1 Cr'],
  ['10000000-20000000', '₹1 – 2 Cr'],
  ['20000000-50000000', '₹2 – 5 Cr'],
  ['50000000-0', 'Above ₹5 Cr'],
];
const RENT_BANDS = [
  ['0-15000', 'Under ₹15,000'],
  ['15000-30000', '₹15 – 30,000'],
  ['30000-60000', '₹30 – 60,000'],
  ['60000-0', 'Above ₹60,000'],
];

function BudgetStep({ onPick }) {
  const [rent, setRent] = useState(false);
  const bands = rent ? RENT_BANDS : BANDS;
  return (
    <div>
      <div className="flow-toggle">
        <button className={!rent ? 'on' : ''} onClick={() => setRent(false)}>Purchase</button>
        <button className={rent ? 'on' : ''} onClick={() => setRent(true)}>Monthly rent</button>
      </div>
      <div className="flow-options">
        {bands.map(([value, label]) => (
          <button key={value} className="flow-option" onClick={() => onPick(value)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
