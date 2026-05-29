const Modal = ({ open, onClose, wide, narrow, children }) => {
  if (!open) return null;
  const modalCls = "cg-modal" + (wide ? " cg-modal--wide" : "") + (narrow ? " cg-modal--narrow" : "");
  return (
    <div className="cg-modal-overlay" onClick={onClose}>
      <div className={modalCls} onClick={(e) => e.stopPropagation()}>
        <button className="cg-modal__x" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
};

const SchoolYearModal = ({ open, onClose, onSave }) => (
  <Modal open={open} onClose={onClose} wide>
    <h2>School Year Setup</h2>
    <p>
      At the beginning of each school year, enter the dates for the first,
      second, third, and fourth nine-weeks grading periods. Remember: the
      fourth nine weeks{" "}
      <span className="cg-senior">end date for Seniors</span> is different than
      the <span className="cg-general">end date for Grades 7–11</span>.
    </p>

    {[
      { title: "First Nine Weeks", rows: [["Start / End", "q1_start", "q1_end"]] },
      { title: "Second Nine Weeks", rows: [["Start / End", "q2_start", "q2_end"]] },
      { title: "Third Nine Weeks", rows: [["Start / End", "q3_start", "q3_end"]] },
    ].map((s) => (
      <React.Fragment key={s.title}>
        <div className="cg-sy-section-title">{s.title}</div>
        {s.rows.map(([label, a, b]) => (
          <div className="cg-sy-row-form" key={a}>
            <label>{label}</label>
            <input type="date" id={"sy_" + a} />
            <input type="date" id={"sy_" + b} />
          </div>
        ))}
      </React.Fragment>
    ))}

    <div className="cg-sy-section-title">Fourth Nine Weeks — Split End Dates</div>
    <div className="cg-sy-row-form"><label>Shared Start</label><input type="date" /><div /></div>
    <div className="cg-sy-row-form cg-sy-row-form--senior"><label>Seniors End</label><input type="date" /><div /></div>
    <div className="cg-sy-row-form cg-sy-row-form--general"><label>Grades 7–11 End</label><input type="date" /><div /></div>

    <div className="cg-modal__actions">
      <Button kind="ghost" onClick={onClose}>Skip for now</Button>
      <Button kind="primary" onClick={onSave}>Save Dates</Button>
    </div>
  </Modal>
);

const HowToModal = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} wide>
    <h2>How to Use CyberGrader.io</h2>
    <p><strong>Three workflows, one tool.</strong> Each of the three blocks up top handles a different job.</p>
    <div className="cg-section-card"><h3 className="cg-h3">📝 Teacher Feedback</h3>
      <p>Pick an assignment type and output type. You'll get pre-generated feedback with today's date already filled in. Customize. Copy. Paste into the gradebook.</p>
    </div>
    <div className="cg-section-card"><h3 className="cg-h3">✉️ Email Generator</h3>
      <p>Pick the term first, then the email type. Toggle between All Students and Single Student. Fill in deadlines or progress as needed. Copy and send.</p>
    </div>
    <div className="cg-section-card"><h3 className="cg-h3">⚙️ Gradebook Setup</h3>
      <p>Pick which gradebook placeholder you're setting up. Copy the name and detail.</p>
    </div>
    <p className="cg-tip">💡 School year dates are set once at sign in and sync across devices.</p>
    <div className="cg-modal__actions">
      <Button kind="primary" onClick={onClose}>Got It</Button>
    </div>
  </Modal>
);

Object.assign(window, { Modal, SchoolYearModal, HowToModal });
