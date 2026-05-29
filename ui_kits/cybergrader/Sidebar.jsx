const Sidebar = ({ schoolYear, onEditDates }) => {
  const has = schoolYear && Object.keys(schoolYear).length > 0;
  return (
    <aside className="cg-panel cg-sidebar">
      <div className="cg-panel__inner">
        <section>
          <h2 className="cg-panel-title">Teacher Notes</h2>
          <div className="cg-section-card cg-notes-card">
            <h3 className="cg-notes-heading">Nine Weeks 1–3 Info</h3>
            <p>
              Same start and end date for grades 7–12. Deadlines and pacing
              apply equally during those grading periods.
            </p>
          </div>
          <div className="cg-section-card cg-notes-card">
            <h3 className="cg-notes-heading">4th Nine Weeks – Split Deadlines</h3>
            <ul>
              <li>
                <span className="cg-senior">Seniors: due date is earlier</span>{" "}
                — typically a week or two sooner.
              </li>
              <li>
                <span className="cg-general">
                  Grades 7–11: typical end-of-year deadline.
                </span>
              </li>
            </ul>
            <div className="cg-no-extensions">NO EXTENSIONS FOR SENIORS</div>
          </div>
        </section>

        <section>
          <h2 className="cg-panel-title">School Year</h2>
          <div className="cg-section-card cg-notes-card">
            {has ? (
              <div className="cg-sy-display">
                {Object.entries(schoolYear).map(([k, v]) => (
                  <div key={k} className="cg-sy-row">
                    <span>{k}</span>
                    <span className="cg-sy-row__v">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cg-sy-empty">No dates set yet.</div>
            )}
            <button className="cg-edit-dates" type="button" onClick={onEditDates}>
              ✏️ Edit Dates
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
};

Object.assign(window, { Sidebar });
