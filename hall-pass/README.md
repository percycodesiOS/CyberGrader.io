# CIRC Pass Desk — sample-only prototype

Open `/CyberGrader.io/hall-pass/` on the existing GitHub Pages host. This standalone folder does not change the game, legacy apps or CIRC-HQ.

Practice issuing numbered CIRC-001 through CIRC-100 cards, returning them, and reissuing the same card. Choose only the built-in fictional sample students and CIRC/ECTV destinations. The approval checkbox is simulated.

## Limits

- **No real student data.** Public sample-only demo, no editable name field, sign-in, authorization or backend.
- Saved trips stay in this browser's localStorage under `circ-hall-pass-demo-v1`. No cross-device sync. Other apps' keys are untouched.
- Web Locks serialize each saved-data transaction between same-origin tabs; the model checks active-pass and active-student uniqueness inside the lock. Unsupported browsers require temporary demo mode.
- Corrupt or inaccessible storage blocks saved operations and offers retry, explicit reset, or a separate temporary demo. A failed write is never reported as saved. Temporary changes disappear on reload.
- Scanner input only selects a card. Issue and Return remain explicit. A real keyboard-wedge scanner and actual classroom devices have not been verified.
- Recent history retains up to 100 completed trips and all active trips. This is not an official attendance, permission or student-record system.

## Tomorrow's dry run

1. Enter 1, select a sample student, confirm demo approval, Issue.
2. Reload and verify the trip remains.
3. Return it, reload, then issue CIRC-001 again.
4. Try a physical scanner in the pass-number box.
5. Test two tabs in the same browser. Try the same card from both; only one trip should be active.
6. Reset the demo when done.

## Local check

Serve the repository over HTTP; then open `hall-pass/`. From the repository root:

```sh
node --test hall-pass/model.test.mjs
```

No dependency install or build step is needed. Claude Code authored the model and model tests; Codex authored the interface and browser storage controls and performed the independent verification. Release details are kept in the task's private receipt folder.
