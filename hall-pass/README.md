# CIRC PassDesk

A supervised, single-device desk for reusable CIRC-001 through CIRC-100 cards.

**Live:** https://percycodesios.github.io/CyberGrader.io/hall-pass/

## Use on the desk iPad

1. Open Staff access and choose a private 6–12 digit PIN once on this browser profile.
2. Enter a card number, a short unique student code or initials, destination and approval window. Confirm teacher permission and tap Approve for today.
3. Staff controls lock immediately. Depart is selected automatically. Scan the card or type its number and tap Record departure.
4. Select Arrive when the student reaches the destination and scan again. Select Return when the card comes back and scan to close the trip.
5. Unlock staff controls to approve that same card for its next user. Unused approvals may be cancelled. Return can close a trip even if an arrival was missed.

A keyboard-wedge Bluetooth/USB scanner should end each code with Enter or Tab. CIRC-prefixed scanner bursts are captured globally outside PIN fields. In the approval card field a scan selects that card without recording a trip; other editable staff fields do not record trip scans. Fast three-digit scans work outside editable staff fields; the manual number box always accepts 1–100. Configure printed Code 39 cards to transmit the CIRC prefix; actual hardware pairing and scan quality still need a physical test. Code 39 is printed without an optional check digit.

Staff controls include printable barcode cards and private JSON backup download/restore. Restore validates the file and asks before replacing this device’s trip records; it leaves the PIN and legacy demo untouched. A local print dialog lets staff choose pages; the app does not send jobs to a printer itself.

## Permission and expiry

An approval is for one trip and the current **America/New_York** date. Staff choose 15/30/60/120 minutes or the rest of today. It never extends past New York midnight; DST boundaries are handled explicitly. The scanner never creates approval. Depart, Arrive and Return are distinct actions; repeat scans in the same action are idempotent.

Expired unused approvals cannot activate departure. An already departed student remains visible as overdue until returned. Late arrival/return can still be recorded for accountability. A card and student code cannot have overlapping assignments.

The local staff PIN is a casual kiosk lock, not district identity or tamper-proof authorization. It does not encrypt records. Staff controls lock after each approval, when the page is hidden, after reload, and after three minutes. The desk needs physical supervision and the iPad screen lock. There is no online PIN recovery.

## Storage and privacy

Operational records use `circ-passdesk-v2`; local staff setup uses `circ-passdesk-staff-v1`. The earlier `circ-hall-pass-demo-v1` key is untouched. Data stays in this browser profile, with no roster upload, account, analytics, backend or cross-device synchronization. This folder includes no real student records; tests use fictional codes.

All read/modify/write transactions use Web Locks across same-origin tabs. Failed writes never become saved UI state. Invalid data blocks mutations without overwriting the original. An updated browser with Web Locks and Web Crypto is required. If a staff setup survives but trip data is missing, recording is blocked. A complete browser-data wipe cannot be detected by this standalone app. Clearing site data, private browsing, or changing browser profiles can remove access. Keep private backups when records matter. The local file export contains student codes and is not automatically uploaded anywhere.

History retains up to 200 closed trips plus every open trip. The tool supplements desk supervision and does not replace official attendance. This release does not claim tested physical scanner, iPad Safari or printer compatibility.

## Verification

From the repository root:

```sh
node --test hall-pass/model.test.mjs
node hall-pass/browser.test.cjs
```

The browser check requires Playwright on Node's module path and an installed Chrome. `PASSDESK_BROWSER` can point to another compatible Chromium binary. It launches one isolated headless browser, serves only this folder on an ephemeral loopback port, uses fictional records, and closes the browser/server. Screenshots are written only to the operating system temporary directory.

The model/storage suite checks daily permission, DST, expiry, repeat scans, missing approval, reuse, duplicate student/card assignments, simultaneous tabs, corrupt storage, failed writes, history retention and Code 39 encoding. The browser suite checks staff setup/locking, manual and global scanning, reload, save failure, another actual tab and touch layouts at 768 and 390 CSS pixels. Touch emulation is not a physical iPad test.

Code 39 encoding constants were cross-checked against the primary [ZXing Code39Reader source](https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code39Reader.java); the small card renderer is local and makes no external barcode request.

The root repository also publishes MYnecraft and other apps. Change and release only `hall-pass/` for this tool.
