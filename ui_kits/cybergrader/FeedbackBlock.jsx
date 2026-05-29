const FeedbackBlock = ({
  workType, setWorkType, outputType, setOutputType,
  output, setOutput, editing, setEditing, onCopy, copied,
}) => {
  const workTypes = ["FIRST ASSIGNMENT", "ASSIGNMENT", "PROJECT"];
  const outputsBy = {
    "FIRST ASSIGNMENT": [
      "Welcome First Nine Weeks", "Welcome Second Nine Weeks",
      "Welcome Third Nine Weeks", "Welcome Fourth Nine Weeks",
    ],
    ASSIGNMENT: ["Perfect", "Partial Credit", "Assignment Resubmit"],
    PROJECT: ["Perfect", "Good Overall Project", "Missing Work"],
  };
  return (
    <div className="cg-block-panel">
      <div className="cg-info-callout">
        Pick an assignment type and nine weeks — you'll see pre-generated
        feedback you can customize further.
      </div>

      <div className="cg-form-grid">
        <Field label="Work Type" htmlFor="workType">
          <Select id="workType" value={workType} onChange={setWorkType} options={workTypes} />
        </Field>
        <Field label="Output Type" htmlFor="outputType">
          <Select id="outputType" value={outputType} onChange={setOutputType}
            options={outputsBy[workType] || []} />
        </Field>
      </div>

      <Toolbar
        left={
          <>
            <Button kind={editing ? "save" : "edit"} onClick={() => setEditing(!editing)}>
              {editing ? "Save" : "Edit Output"}
            </Button>
            <Button kind="reset">Reset Template</Button>
          </>
        }
      />

      <Field label="Generated Output" htmlFor="gradeOutput" full>
        <Textarea id="gradeOutput" value={output}
          readOnly={!editing} edit={editing}
          onChange={setOutput} />
      </Field>

      <div className="cg-status">{copied ? "Copied to clipboard ✓" : ""}</div>

      <Button kind="ghost" full>🔀 Generate Variation</Button>
      <Button kind={copied ? "copied" : "primary"} full big onClick={onCopy}>
        {copied ? "COPIED!" : "Copy Output"}
      </Button>
    </div>
  );
};

Object.assign(window, { FeedbackBlock });
