const EmailBlock = ({ term, setTerm, audience, setAudience }) => {
  const isFourth = term === "fourth";
  const emailOptions =
    term === "first"
      ? ["Welcome Letter", "Early Check-In", "Zero Grade Clarification", "25% Progress Check-In", "50% Progress Check-In", "75% Progress Check-In"]
      : term === "fourth"
      ? ["Senior Final Reminder", "Final Week Reminder", "End of Year (Grades 7–11)", "End of Year (Seniors)"]
      : ["Welcome Back", "25% Progress Check-In", "50% Progress Check-In", "75% Progress Check-In", "Final Week Reminder", "Next Nine Weeks Loaded"];

  return (
    <div className="cg-block-panel">
      <div className="cg-info-callout">
        Pick the current term first — the tool filters email options
        accordingly. Use the audience toggle to switch between a single student
        and your whole class.
      </div>

      <div className="cg-form-grid">
        <Field label="Current Term" htmlFor="term">
          <Select id="term" value={term} onChange={setTerm}
            options={[
              { value: "first", label: "First Nine Weeks" },
              { value: "second", label: "Second Nine Weeks" },
              { value: "third", label: "Third Nine Weeks" },
              { value: "fourth", label: "Fourth Nine Weeks" },
            ]} />
        </Field>
        <Field label="Email Type" htmlFor="emailType">
          <Select id="emailType" value={emailOptions[0]} onChange={() => {}}
            options={emailOptions} />
        </Field>
      </div>

      <div className="cg-audience">
        {["All Students", "Single Student"].map((a) => (
          <button
            key={a}
            type="button"
            className={"cg-audience__btn" + (audience === a ? " cg-audience__btn--active" : "")}
            onClick={() => setAudience(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {isFourth ? (
        <div className="cg-deadline-callouts">
          <div className="cg-deadline cg-deadline--senior">
            <label>⬡ SENIOR DEADLINE</label>
            <Input id="seniorDeadline" value="Monday, May 19 at 11:59 p.m." onChange={() => {}} />
          </div>
          <div className="cg-deadline cg-deadline--general">
            <label>◆ GRADES 7–11 DEADLINE</label>
            <Input id="generalDeadline" value="Monday, June 2 at 11:59 p.m." onChange={() => {}} />
          </div>
        </div>
      ) : null}

      <Toolbar
        left={
          <>
            <Button kind="edit">Edit Subject</Button>
            <Button kind="edit">Edit Body</Button>
            <Button kind="save">Save Changes Globally</Button>
            <Button kind="reset">Reset Template</Button>
          </>
        }
        right={<Button kind="ghost">🔀 Variation</Button>}
      />

      <Field label="Email Subject" htmlFor="emailSubjectOutput" full>
        <Textarea id="emailSubjectOutput" rows={2} readOnly value="Quick check-in on your progress this term" />
      </Field>

      <Field label="Email Body" htmlFor="emailBodyOutput" full>
        <Textarea id="emailBodyOutput" readOnly value={
`Hey,

Just checking in — you're at the 25% mark of the term. Your grade right now reflects what you've turned in, and that's totally fixable if you need to catch up.

If you have any questions or want help getting back on track, just reply to this email and I'll get you sorted.

— Mr. ${audience === "Single Student" ? "(student name)" : "Macek"}`
        } />
      </Field>

      <div className="cg-toolbar__row" style={{marginTop: 10, gap: 10, flexWrap: "wrap"}}>
        <Button kind="ghost">Copy Subject</Button>
        <Button kind="ghost">Copy Combined</Button>
      </div>
      <Button kind="primary" full>Copy Email Body</Button>
    </div>
  );
};

Object.assign(window, { EmailBlock });
