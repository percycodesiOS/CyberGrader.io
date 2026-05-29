const BlockSelector = ({ value, onChange }) => {
  const blocks = [
    { id: "feedback", title: "Teacher Feedback", desc: "Student feedback for the gradebook", icon: "📝" },
    { id: "email", title: "Email Generator", desc: "Recurring student emails for the school year", icon: "✉️" },
    { id: "portal", title: "Gradebook Setup", desc: "Gradebook placeholder text + checklist", img: "../../assets/sv-portal-logo.png" },
  ];
  return (
    <div className="cg-block-selector">
      {blocks.map((b) => (
        <button
          key={b.id}
          type="button"
          className={"cg-block-btn" + (value === b.id ? " cg-block-btn--active" : "")}
          onClick={() => onChange(b.id)}
        >
          <span className="cg-block-btn__icon">
            {b.img ? <img src={b.img} alt="" /> : b.icon}
          </span>
          <span className="cg-block-btn__title">{b.title}</span>
          <span className="cg-block-btn__desc">{b.desc}</span>
        </button>
      ))}
    </div>
  );
};

Object.assign(window, { BlockSelector });
