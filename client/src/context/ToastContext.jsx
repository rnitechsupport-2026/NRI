import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle, Alert, Info, X } from '../components/Icons.jsx';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

let nextId = 1;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => setItems((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message, type = 'info', ms = 4200) => {
    const id = nextId++;
    setItems((t) => [...t, { id, message, type }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    success: (m) => push(m, 'ok'),
    error: (m) => push(m, 'err'),
    info: (m) => push(m, 'info'),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => {
          const Icon = t.type === 'ok' ? CheckCircle : t.type === 'err' ? Alert : Info;
          return (
            <div key={t.id} className={`toast ${t.type}`} role="status">
              <Icon />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X style={{ width: 14, height: 14, color: 'var(--muted)' }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
