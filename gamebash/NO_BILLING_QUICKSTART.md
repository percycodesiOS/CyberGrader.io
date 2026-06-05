# GameBash — No-Billing Quickstart (≈10 min)

Your Firebase project `gamebash-92555` is already created, auth is on, Firestore exists,
and your real config is already in this ZIP (`firebase-applet-config.json` + `.firebaserc`).
So you skip all the setup steps in DEPLOY.md — you're just installing tools and shipping.

**We are NOT using Storage, so you do NOT need billing / a credit card.**
(The only thing Storage would add is student image uploads, which were never wired up.
I removed the Storage block from `firebase.json` so deploy won't ask for it.)

---

## Do these in order, in a terminal

### 1. Install Node.js (skip if you already have it)
Download the **LTS** build from <https://nodejs.org>, install, then check:
```bash
node --version
npm --version
```
Both should print numbers.

### 2. Install the Firebase CLI
```bash
npm install -g firebase-tools
```
(Mac: add `sudo` in front if it complains about permissions.)

### 3. Open a terminal INSIDE this unzipped folder
- Mac: right-click the folder → Services → "New Terminal at Folder"
- Windows: Shift + right-click inside the folder → "Open in Terminal"

Confirm you're in the right place — you should see `package.json` when you run `ls` (Mac) or `dir` (Windows).

### 4. Install the app's dependencies
```bash
npm install
```
Takes 1–2 minutes. Warnings are fine; errors → paste them to me.

### 5. Log in to Firebase
```bash
firebase login
```
A browser opens — sign in with **kmacek715@gmail.com** (the account that owns the project).

### 6. Test it locally
```bash
npm run dev
```
Open <http://localhost:5173>. Sign in with Google. You'll see the Lobby.
Click **"Make a demo game"** (teacher-only) to seed 3 sample games. Try the editor and a game room.
Permission errors in the console (F12) are expected until the next step.

### 7. Deploy the security rules
```bash
npm run deploy:rules
```
Refresh the local app — the permission errors should be gone.

### 8. Ship it live
```bash
npm run deploy
```
This builds the app and pushes it to Firebase Hosting. It prints a URL like
`https://gamebash-92555.web.app` — **that's your live site.**

### 9. Authorize the live domain for Google sign-in
Go to <https://console.firebase.google.com/project/gamebash-92555/authentication/settings>
→ **Authorized domains** → make sure these are listed (add if missing):
- `gamebash-92555.web.app`
- `gamebash-92555.firebaseapp.com`
- `localhost`

Done. Share the `.web.app` URL with students.

---

## Day-to-day after this
```bash
npm run dev      # test changes locally
npm run deploy   # ship them live
```

---

## About GitHub (optional)
GameBash does NOT deploy through GitHub — the live site comes from `npm run deploy` above.
GitHub is only useful here as a source backup. If you still want it there:
- Upload everything in this folder EXCEPT `firebase-applet-config.json` if the repo is **public**
  (it's already in `.gitignore`). For a private repo it doesn't matter.

I can't push to GitHub for you — my connection only reads repos, it can't write to them.

---

## If anything breaks
Paste me: (1) which step number, (2) the exact error text, (3) a console screenshot if it's in the browser.
