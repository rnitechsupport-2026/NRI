import { useMemo, useState } from 'react';
import { money, rupees } from '../../utils/format.js';

/**
 * EMI calculator. Runs entirely in the browser — the maths is a closed-form
 * formula, so a round trip would only add latency, and nothing here is secret.
 */
export default function EmiBot({ price }) {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const calc = useMemo(() => {
    const p = Number(price) || 0;
    const down = Math.round((p * downPct) / 100);
    const principal = Math.max(0, p - down);
    const r = Number(rate) / 12 / 100;
    const n = Number(years) * 12;

    // Standard amortisation: E = P·r·(1+r)^n / ((1+r)^n − 1)
    const emi = r > 0 && n > 0
      ? Math.round((principal * r * (1 + r) ** n) / ((1 + r) ** n - 1))
      : Math.round(principal / Math.max(1, n));

    const total = emi * n;
    const interest = Math.max(0, total - principal);
    // Lenders generally want the EMI under ~40% of take-home pay.
    const incomeNeeded = Math.round(emi / 0.4);

    return { down, principal, emi, total, interest, incomeNeeded };
  }, [price, downPct, rate, years]);

  const interestShare = calc.total ? Math.round((calc.interest / calc.total) * 100) : 0;

  return (
    <div className="emi">
      <div className="emi-out">
        <span className="tiny muted">Estimated monthly EMI</span>
        <strong>{rupees(calc.emi)}</strong>
        <span className="tiny muted">
          on a {money(calc.principal)} loan over {years} years at {rate}%
        </span>
      </div>

      <label className="emi-row">
        <span>Down payment <b>{downPct}%</b> · {money(calc.down)}</span>
        <input type="range" min="0" max="60" step="5" value={downPct}
               onChange={(e) => setDownPct(Number(e.target.value))} />
      </label>

      <label className="emi-row">
        <span>Interest rate <b>{rate}%</b></span>
        <input type="range" min="6" max="14" step="0.05" value={rate}
               onChange={(e) => setRate(Number(e.target.value))} />
      </label>

      <label className="emi-row">
        <span>Tenure <b>{years} years</b></span>
        <input type="range" min="5" max="30" step="1" value={years}
               onChange={(e) => setYears(Number(e.target.value))} />
      </label>

      {/* how much of what you pay is interest vs the property itself */}
      <div className="emi-split" title={`${interestShare}% of your payments are interest`}>
        <span className="emi-split-principal" style={{ flex: 100 - interestShare }} />
        <span className="emi-split-interest" style={{ flex: interestShare }} />
      </div>
      <div className="emi-legend">
        <span><i className="dot-principal" /> Principal {money(calc.principal)}</span>
        <span><i className="dot-interest" /> Interest {money(calc.interest)}</span>
      </div>

      <dl className="emi-facts">
        <div><dt>Total repayment</dt><dd>{money(calc.total)}</dd></div>
        <div><dt>Interest paid</dt><dd>{money(calc.interest)} ({interestShare}%)</dd></div>
        <div><dt>Income usually needed</dt><dd>{rupees(calc.incomeNeeded)}/mo</dd></div>
      </dl>

      <p className="tiny muted">
        An estimate only. Banks price on your credit profile, and processing fees,
        insurance and stamp duty are not included. Our home-loan partners can give
        you an exact figure.
      </p>
    </div>
  );
}
