import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { Document, Shield, Check } from '../Icons.jsx';

/**
 * Document bot. Explains which papers the buyer/tenant needs to produce, and —
 * more usefully — which ones they should *demand to see* from the seller before
 * paying anything. The "why" line on each is the point: a checklist without
 * reasons is just a list.
 */
export default function DocsBot({ purpose = 'sale' }) {
  const [data, setData] = useState(null);
  const [side, setSide] = useState('seller');   // start on what protects the buyer
  const [ticked, setTicked] = useState({});

  useEffect(() => {
    let live = true;
    api.get('/bots/documents/checklist', { params: { purpose } })
      .then((r) => live && setData(r.data.data))
      .catch(() => {});
    return () => { live = false; };
  }, [purpose]);

  if (!data) {
    return <div className="bot-loading"><span className="spinner spinner-dark" /><span className="small muted">Loading…</span></div>;
  }

  const list = side === 'seller' ? data.seller : data.buyer;
  const doneCount = list.filter((d) => ticked[`${side}:${d.key}`]).length;

  return (
    <div>
      <div className="flow-toggle mb-2">
        <button className={side === 'seller' ? 'on' : ''} onClick={() => setSide('seller')}>
          Ask the seller for
        </button>
        <button className={side === 'buyer' ? 'on' : ''} onClick={() => setSide('buyer')}>
          You&apos;ll need
        </button>
      </div>

      {side === 'seller' && (
        <div className="alert alert-info mb-2" style={{ padding: '10px 12px' }}>
          <Shield />
          <span className="tiny">
            Verify these <b>before</b> paying any token amount. A missing EC or title
            deed is the single most common cause of a stuck deal.
          </span>
        </div>
      )}

      <p className="tiny muted mb-2">{doneCount} of {list.length} checked</p>

      <ul className="docs">
        {list.map((d) => {
          const id = `${side}:${d.key}`;
          const on = !!ticked[id];
          return (
            <li key={d.key}>
              <button className={`docs-item ${on ? 'on' : ''}`}
                      onClick={() => setTicked((t) => ({ ...t, [id]: !on }))}>
                <span className="docs-box">{on && <Check />}</span>
                <span>
                  <b>{d.label}</b>
                  <em>{d.why}</em>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="tiny muted mt-2">
        <Document style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-2px' }} />
        {' '}General guidance, not legal advice. Our legal partners do title checks
        and EC verification if you want it done properly.
      </p>
    </div>
  );
}
