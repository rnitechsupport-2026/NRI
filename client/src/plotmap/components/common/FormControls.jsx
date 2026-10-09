// Small labelled form controls so forms stay short and consistent.

export function Field({ label, htmlFor, required, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="pm-label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextInput({ label, name, required, error, hint, className, ...props }) {
  return (
    <Field label={label} htmlFor={name} required={required} error={error} hint={hint} className={className}>
      <input id={name} name={name} required={required} className="pm-input" {...props} />
    </Field>
  );
}

export function TextArea({ label, name, required, error, hint, className, rows = 3, ...props }) {
  return (
    <Field label={label} htmlFor={name} required={required} error={error} hint={hint} className={className}>
      <textarea id={name} name={name} rows={rows} required={required} className="pm-input resize-y" {...props} />
    </Field>
  );
}

// options: array of strings or { value, label }
export function SelectInput({ label, name, required, error, hint, className, options = [], placeholder, ...props }) {
  return (
    <Field label={label} htmlFor={name} required={required} error={error} hint={hint} className={className}>
      <select id={name} name={name} required={required} className="pm-input" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
