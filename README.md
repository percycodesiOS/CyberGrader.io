# CyberGrader.io

A single-file grading and email tool for Mr. Macek's cyber/tech ed courses.
Built to live as one `index.html` so it can be hosted free on GitHub Pages.

---

## What's in the box

**Three tabs:**
1. **Grading Output** — locked grading wording (verbatim from `grading_wording.txt`)
2. **Email Generator** — bulk and single-student emails, auto-switches templates for 4th nine weeks
3. **SV Portal Library** — reusable grade setup names/details and class announcements

**Features:**
- Today's date in the top right (auto-updates daily from device clock)
- Local override system: edit any text, save it on the device, reset back to original
- Export / Import for cross-device sync (JSON file)
- Dark UI, mobile-friendly
- No backend, no dependencies, no build step

---

## How to host on GitHub Pages (free, no payment)

1. **Create a new repo** on GitHub. Name it `cybergrader` (or whatever you want).
2. **Upload `index.html`** to the root of the repo. Either drag-drop in the browser or `git push`.
3. **Enable Pages**:
   - Repo → Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main`, folder: `/ (root)`
   - Save
4. Wait ~1 minute. Your site is live at:
   `https://[your-username].github.io/cybergrader/`
5. **Bookmark it** on desktop and iPhone home screen.

That's it. Free forever. No credit card.

**Optional:** if you want a custom domain like `cybergrader.io`, that costs ~$10/year for the domain registration only — Pages still hosts free. Add a `CNAME` file in the repo with the domain name and point your domain's DNS at GitHub.

---

## Updating the file

Anytime you want changes (new email templates, wording fixes, new library items), just replace `index.html` in the repo. GitHub Pages redeploys automatically in about a minute.

---

## Cross-device sync (current state)

Right now, sync is **manual** via Export / Import:
- On Device A: click Export → save the JSON file
- Email/AirDrop/Drive it to Device B
- On Device B: click Import → pick the file
- Your overrides merge in

Storage is `localStorage` per browser, so each browser/device has its own copy until you sync.

---

## Next phase: Firebase Auth (real cloud sync with login)

You said you have a Firebase account. Here's exactly what's needed to add real sync with login. **Only do this if you actually want it** — the manual export/import covers basic needs and adds zero complexity.

### What Firebase will give you
- Sign in once with email/password or Google
- Your overrides auto-save to the cloud
- Open CyberGrader on any device → sign in → everything is there
- Free tier easily covers a single-user use case (1 GB storage, 50K reads/day, 20K writes/day — you'll use a fraction of that)

### Setup steps (one-time, ~10 minutes)
1. Go to https://console.firebase.google.com/
2. **Create a new project** → name it `cybergrader` → disable Google Analytics (you don't need it)
3. **Enable Authentication**:
   - Build → Authentication → Get started
   - Sign-in method → enable **Email/Password** (and optionally **Google**)
4. **Create Firestore Database**:
   - Build → Firestore Database → Create database
   - Start in **production mode**, region: `us-east1` (closest to PA)
5. **Set security rules** (paste this in Firestore → Rules):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   This means: only the signed-in user can read/write their own data. No one else can touch it.
6. **Register a web app**:
   - Project Overview → click the `</>` icon
   - App nickname: `cybergrader-web`
   - Don't enable Hosting (we use GitHub Pages)
   - Copy the `firebaseConfig` block it gives you — looks like this:
     ```js
     const firebaseConfig = {
       apiKey: "AIza...",
       authDomain: "cybergrader.firebaseapp.com",
       projectId: "cybergrader",
       storageBucket: "cybergrader.firebasestorage.app",
       messagingSenderId: "...",
       appId: "..."
     };
     ```
7. **Send me that `firebaseConfig` block.** I'll wire it into the next version of `index.html` along with:
   - A "Sign In" button in the top bar
   - Auto-sync of overrides on save
   - Auto-load of overrides on sign-in
   - A small "synced ✓" indicator

The API key is **not a secret** — it's safe to commit to GitHub. The security rules are what protect your data.

---

## Naming

Honestly, **CyberGrader is the right name.** It's specific, memorable, and tells you what it does. I'd keep it.

If you ever want alternatives that came up: GradeVault, TeachFlow, ClassDeck. None of them are better — keep CyberGrader.

---

## Items still pending your approval

These are flagged in the rebuild because they're either typos in source material or templates I derived from your patterns:

1. **4th nine weeks 25%, 50%, Final Week templates** — I only had your verbatim example for the 75% Check-In. The others (25%, 50%, Final Week) I wrote following the same structure: dual-deadline block, "no extensions" warning, "you can finish on senior schedule if you want" line. Sign off on these or rewrite and I'll lock them in.

2. **75% template typos preserved verbatim**: "we've", "let's", "dues dates" (should be "due dates"), and the em-dash style. I kept everything exact. Want them fixed? Tell me and I'll fix.

3. **Start of Year Welcome announcement**: I changed `[Microsoft TEAM for your Edgenuity course]` → `[Microsoft TEAM for your course]` because the rest of the announcement says "Carnegie Learning (not Edgenuity)". The "Edgenuity" reference was a leftover and contradicted itself. Also made the join code a `[TEAM CODE]` placeholder since it varies by class. Both flagged here so you can tell me if you want them reverted.

4. **Welcome Third / Fourth Nine Weeks grading wording** — still not in your locked source file. The dropdown only shows First and Second until you give me wording for Third and Fourth.

---

## Bug fixes from previous build

1. **Edit/Save Override was broken**: when you edited and saved, then changed any field, the render function force-overwrote your text. Also, while in edit mode, any input event clobbered what you typed. Both fixed by checking `readOnly` state before any write to the textarea, and locking the textarea back to read-only after Save.

2. **Copy buttons failing**: the Clipboard API needs a secure context (https) and proper focus. Added `document.execCommand("copy")` fallback that works on `file://`, GitHub Pages, and anywhere else.

3. **Three confusing copy buttons** → **one Copy button**: output is now `Subject: X\n\nbody` combined. Paste into your email body, then cut the subject line up to the SUBJECT field. Matches your email screenshot workflow.

4. **Form auto-narrowing**: scope/term/deadline fields now hide when the email type doesn't need them. Welcome Email shows scope + course name. Check-ins show term + deadline. 4th nine weeks check-ins show dual deadlines. No more clutter.

5. **Removed dead "Welcome Third/Fourth Nine Weeks" grading options** that had no source wording.

6. **Removed senior-specific email types** since your distribution lists are by class, not grade level. The 4th nine weeks variants of the regular check-ins handle both deadlines in one message — that matches your actual workflow.
