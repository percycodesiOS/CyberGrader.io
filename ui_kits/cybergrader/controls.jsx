// Reusable form + button primitives for the CyberGrader UI kit.
// Plain inline-style React, no css-in-js, talks via styles.css for shared rules.

const Field = ({ label, htmlFor, children, full }) => (
  <div className={"cg-field" + (full ? " cg-field--full" : "")}>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
  </div>
);

const Select = ({ id, value, onChange, options }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((o) => (
      <option key={o.value || o} value={o.value || o}>
        {o.label || o}
      </option>
    ))}
  </select>
);

const Input = ({ id, value, onChange, placeholder, type = "text" }) => (
  <input
    id={id}
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
  />
);

const Textarea = ({ id, value, onChange, readOnly, rows, edit }) => (
  <textarea
    id={id}
    value={value}
    readOnly={readOnly}
    rows={rows}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    className={edit ? "cg-textarea cg-textarea--edit" : "cg-textarea"}
  />
);

const Button = ({ kind = "ghost", children, onClick, full, big }) => {
  const cls = ["cg-btn", "cg-btn--" + kind];
  if (full) cls.push("cg-btn--full");
  if (big) cls.push("cg-btn--big");
  return (
    <button type="button" className={cls.join(" ")} onClick={onClick}>
      {children}
    </button>
  );
};

const Toolbar = ({ left, right }) => (
  <div className="cg-toolbar">
    <div className="cg-toolbar__row">{left}</div>
    {right ? <div className="cg-toolbar__row">{right}</div> : null}
  </div>
);

Object.assign(window, { Field, Select, Input, Textarea, Button, Toolbar });
