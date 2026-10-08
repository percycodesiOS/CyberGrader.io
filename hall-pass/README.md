# CIRC Check-In

A supervised digital visit list for the teacher’s school computer. Keep using the existing address:

**https://percycodesios.github.io/CyberGrader.io/hall-pass/**

## Daily use

1. When a student asks to visit, open **Staff access**. Set a local 6–12 digit PIN once, or enter the existing PIN.
2. Enter the **student name**, a **code from 1–100**, **expected visit time today**, and CIRC or ECTV. Confirm permission and choose **Approve visit**.
3. Staff controls lock, and **Register** is selected. The student scans that code to register the approved visit.
4. When the student arrives, select **Arrive** and scan the same code.
5. When the visit is finished, select **Finish / return** and scan. The code can then receive another approval.

The list is ordered by expected time. It shows approval, registration and arrival status. Open Staff access to see names; names disappear when staff controls lock. The code can stay at the desk. No handwritten date, signature or carried paper pass is required by the app.

The front screen shows three short steps: teacher approval, registration, and scanning in/out. **Need help scanning? > Reset screen** clears only unfinished input, returns to Register and locks staff controls. It does not change saved visits, names, codes, history or the staff PIN. Reopen **Staff access** with the existing PIN to unlock; a new device/profile instead asks the teacher to create its own private PIN. This is not a forgotten-PIN bypass. Never clear website data to fix a locked screen.

All steps use this **same school computer, browser and browser profile**. There is no sync to another classroom device. Staff can cancel an unused approval. Finish can close a registered visit if arrival was missed. Repeated scans in the same step do not advance to the next step or create duplicate records.

## Handheld scanner

Click **Ready to scan** before scanning. A USB/Bluetooth keyboard-wedge scanner should send **Enter or Tab** after the code. The visible scan box accepts the code at any typing speed; if there is no suffix, click **Record**. A fast barcode burst also works with focus on a button or the page. Staff editing fields do not record visits. Scanning the approval-code field selects a code only; it never approves the visit.

Accepted inputs resolve to the same saved code, for example:

- `1`, `001`, `CIRC001`, `CIRC-001`
- `*CIRC001*`, `*CIRC-001*` (Code 39 start/stop characters)
- `]A0CIRC-001`, `]C0CIRC-001` (Code 39 / Code 128 scanner identifiers)

A rejected attempt clears the scan box, keeps the error visible and returns focus for the next attempt. Empty Enter/Tab suffixes do not add records. Ordinary typing in staff fields is kept separate. A scan without staff permission is rejected.

The existing master card files were inspected on October 5, 2026:

- `CIRC-passes-001-100-v2.pdf`: Code 39. First/last page barcode vectors decode to `CIRC-001`, `CIRC-002`, `CIRC-099`, `CIRC-100`.
- `ECMS-CIRC-Passes-001-100-Presigned.pdf`: Code 128. All 100 vector barcodes decode to `CIRC-001` through `CIRC-100`; all checksums match.
- `ECMS CIRC Passes 001 to 200 Grayscale.pdf`: Code 128. All 200 vector barcodes decode in order with valid checksums. This app remains limited to **1–100**; do not use 101–200 here.

The app’s optional printed code cards use Code 39 without an optional check digit. The school scanner must support and enable the barcode type actually printed. The software does not configure the scanner.

## Optional reusable cards

Staff access includes **Print code cards**. The default **Starter 8 cards** prints one Letter page, codes CIRC-001 through CIRC-008. **All 100 cards** prints 13 pages, eight cards per page and four on the last. Cards measure 3.5 × 2.15 inches. Print at **100% / Actual size**, with browser headers and footers off. Color is optional; the barcode remains black on white and the text remains readable in grayscale. Test one code on the actual school scanner before printing a full set.

The design carries a large code, short scan sequence, and the reminder that teacher approval is recorded in CIRC Check-In. There are no dates, signatures or student names to write. A card alone never grants permission. Codes can remain at the supervised desk; the app does not require students to carry or replace paper passes. Existing CIRC-001 through CIRC-100 cards still work, so this redesign does not require reprinting them.

## Remaining physical school test

Software verification does **not** prove the handheld scanner works on the school computer. Use a fictional test visit and one of the actual printed codes:

1. Connect the handheld scanner to that computer. Open Notepad, focus the document, and scan once. Confirm the exact text and whether Enter/Tab follows it. If nothing appears, resolve the scanner connection and enabled Code 39/Code 128 setting before retrying the app.
2. In CIRC Check-In, approve the test name/code for a stated time. Click Ready to scan. Scan to Register and check the confirmation and expected time.
3. Select Arrive and scan; select Finish / return and scan. Check that all three timestamps were saved and the visit closed. Repeat a scan in the same step and confirm no duplicate.
4. Try an unapproved code, then the approved code. Confirm rejection is clear and the next scan works. Reload and verify the saved result.
5. If scanner output fails, type the number and click Record to verify the manual fallback. Do not report the hardware repaired until the real scanner sequence passes.

Stop repeating software changes if Notepad receives no barcode text. That isolates the remaining problem to the physical scanner/computer route. No school hardware, Safari or printer test is claimed by this release.

## Records, permission and privacy

The existing keys remain unchanged: `circ-passdesk-v2` for records, `circ-passdesk-staff-v1` for staff setup, and the untouched `circ-hall-pass-demo-v1` for the old demo. Existing names, codes, approvals, timestamps, PINs and backup files are preserved. Existing records without an expected time display **Expected time not set**; the app does not invent a historical time. New records optionally add `expectedAt` within the existing v2 record structure. Refresh older open app tabs after a release; the older app cannot read the extended records.

UI **Register** maps to the existing `departedAt` field so historical data remains usable. Arrive and Finish use `arrivedAt` and `returnedAt`. New approvals last until New York midnight. Older approvals retain their saved expiry. Expected time uses **America/New_York**, regardless of the computer’s time zone. An expired unused approval cannot register. A registered visit stays visible until finished, including after expiry, so it cannot silently vanish or release its code.

Data stays in this browser profile. This folder contains no real student records, roster upload, account, analytics, backend or cloud sync. Names are rendered as plain text. Downloaded JSON backups contain student names and belong in private school storage. Restore validates the backup and asks before replacing records; it preserves the staff PIN and old demo. There is no scan-undo function; unused approvals can be cancelled and backups can be restored deliberately.

The local PIN prevents casual clicks; it is not district identity or encryption. Staff controls lock after each approval, on reload, when the page is hidden and after three minutes, even during scanning. Supervise and screen-lock the school computer.

Web Locks serialize writes between same-origin tabs. Failed writes do not become saved UI state. Invalid or missing records after setup block recording without resetting data. A complete browser-data wipe cannot be detected. An updated browser with Web Locks and Web Crypto is required. Clearing site data, private browsing or switching profiles can lose access; retain private backups. History keeps up to 200 closed visits plus every open visit. This supplements supervision and does not replace official attendance.

## Verification

From the repository root:

```sh
node --test hall-pass/model.test.mjs
node hall-pass/browser.test.cjs
```

The browser suite requires Playwright on Node’s module path and installed Chrome. `PASSDESK_BROWSER` remains a compatible override for another Chromium binary. It launches isolated headless contexts, serves this folder on an ephemeral loopback port, uses fictional records, and closes the browser/server. It never uses the shared Chrome profile. Screenshots go to the operating system temporary directory.

Coverage includes scheduled named visits, legacy record preservation, canonical code normalization, scanner wrappers, Enter/Tab, focus changes, failed/empty/duplicate scans, staff field isolation, permission and expiry, private export/restore, same-origin tabs, failed writes, reload, staff locking, and 768px/390px touch layouts. Browser checks also assert no page errors or external requests. Touch emulation is not a physical-device test.

The local Code 39 renderer’s constants were cross-checked against the primary [ZXing Code39Reader source](https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code39Reader.java).

Change and release only `hall-pass/` for this tool. The repository also hosts MYnecraft compatibility files and other apps; preserve their latest commits when publishing.
