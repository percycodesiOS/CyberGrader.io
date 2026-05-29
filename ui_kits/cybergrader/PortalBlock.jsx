const PortalBlock = ({ portalType, setPortalType }) => {
  const text =
    portalType === "weekly"
      ? "Assignment Name: Weekly Overall Grade Update\n\nAssignment Detail: This grade reflects the student's current weekly progress for the grading period and is updated weekly. Individual assignment and project grades are available in Microsoft Teams and/or Carnegie Learning platform(s)."
      : portalType === "final"
      ? "Assignment Name: Final Overall Grade\n\nAssignment Detail: This grade reflects the student's overall average for the nine-week grading period. Individual assignment and project grades can be viewed in Microsoft Teams and/or Carnegie Learning platform(s).\n\n⚠ REMINDER: After final grades are entered, delete the Weekly Overall Grade Update assignment from the gradebook."
      : "END OF GRADING PERIOD CHECKLIST\n\n1. Confirm all student grades are finalized.\n2. Enter Final Overall Grade in your gradebook.\n3. Delete the Weekly Overall Grade Update assignment.\n4. Honors / year-long / CHS courses: enter a quarterly grade.\n5. Any student with a \"C\" or lower needs comments.\n6. Load the next nine weeks course (if applicable).";

  return (
    <div className="cg-block-panel">
      <div className="cg-info-callout">
        Pick the assignment placeholder you need to set up in your
        gradebook. Copy the name and detail into the gradebook fields.
      </div>

      <div className="cg-form-grid">
        <Field label="Portal Assignment Type" htmlFor="portalType" full>
          <Select id="portalType" value={portalType} onChange={setPortalType}
            options={[
              { value: "weekly", label: "Weekly Overall Grade Update" },
              { value: "final", label: "Final Overall Grade" },
              { value: "checklist", label: "End of Grading Period Checklist" },
            ]} />
        </Field>
      </div>

      <Toolbar
        left={
          <>
            <Button kind="edit">Edit Output</Button>
            <Button kind="reset">Reset Template</Button>
          </>
        }
      />

      <Field label="Generated Output" htmlFor="portalOutput" full>
        <Textarea id="portalOutput" readOnly value={text} />
      </Field>

      {portalType === "final" ? (
        <div className="cg-warn">
          <div className="cg-warn__h">⚠ BEFORE YOU PUBLISH FINAL GRADES</div>
          <ul>
            <li><strong>Delete</strong> the Weekly Overall Grade Update assignment from the gradebook.</li>
            <li><strong className="cg-senior">Honors, year-long, and CHS courses</strong> require a grade in the quarterly grade section under "Enter Report Cards."</li>
            <li>Any student with a <strong>"C" or lower</strong> needs comments entered in the Comments section.</li>
          </ul>
        </div>
      ) : null}

      <Button kind="primary" full>Copy Output</Button>
    </div>
  );
};

Object.assign(window, { PortalBlock });
