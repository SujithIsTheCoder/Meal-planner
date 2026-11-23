import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ───────── emoji "food imagery" (works offline, no image downloads) ─────────
const EMOJI_RULES = [
  [/idli/i, '🍙'], [/dosa|uttapam|pesarattu|rotti|neer/i, '🥞'], [/upma|poha|avalakki|khichdi|puttu|pongal/i, '🥣'],
  [/poori|puri|paratha|roti|chapati/i, '🫓'], [/biryani|pulao|rice|bath/i, '🍚'], [/sambar|rasam|sundal/i, '🍲'],
  [/chicken|65|kebab/i, '🍗'], [/mutton/i, '🍖'], [/egg|bhurji/i, '🥚'], [/fish|pulimunchi/i, '🐟'],
  [/chutney/i, '🥥'], [/curd|raita/i, '🥛'], [/salad|cucumber/i, '🥗'], [/papad|vada|chaat/i, '🥠'],
  [/pickle/i, '🫙'], [/fruit|banana/i, '🍌'], [/paneer|palak|matar/i, '🧀'], [/mushroom/i, '🍄'],
  [/potato|aloo|bhaji|jeera/i, '🥔'], [/beans|palya|fry|gobi|bendekai|vegetable|kurma|curry|masala|kadai|dal|rajma|chana|kadala/i, '🍛'],
];
export function foodEmoji(name = '') {
  for (const [re, e] of EMOJI_RULES) if (re.test(name)) return e;
  return '🍽️';
}

export function formatDate(str, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts);
}

// ───────── buttons & small controls ─────────
export function Button({ variant = 'primary', size = 'md', icon, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...rest}>
      {icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, disabled, title }) {
  return (
    <button type="button" className={`chip ${active ? 'chip-on' : ''}`} onClick={onClick} disabled={disabled} aria-pressed={!!active} title={title}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, disabled, id }) {
  return (
    <label className={`toggle ${disabled ? 'toggle-disabled' : ''}`}>
      <input type="checkbox" id={id} checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-knob" /></span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      {label && <label className="field-label">{label}</label>}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-msg" role="alert">{error}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ className = '', children, ...rest }) {
  return <section className={`card ${className}`} {...rest}>{children}</section>;
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

// ───────── toast + confirm context ─────────
const Ctx = createContext(null);
export const useNotify = () => useContext(Ctx);

export function NotifyProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const show = useCallback((message, tone = 'ok') => setToast({ message, tone, key: Date.now() }), []);
  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Yes', danger = false }) =>
      new Promise((resolve) => setDialog({ title, message, confirmLabel, danger, resolve })),
    []
  );
  const close = (v) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ show, confirm }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.tone}`} key={toast.key} role="status" aria-live="polite">{toast.message}</div>
      )}
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => close(false)}>No, go back</Button>
              <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{dialog.confirmLabel}</Button>
            </>
          }>
          <p className="confirm-text">{dialog.message}</p>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
