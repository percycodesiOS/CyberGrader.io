# CyberGrader.io

A purpose-built workflow tool for cyber teachers — so you stop copy-pasting the same grading feedback and check-in emails 50 times a day.

Two HTML files. Account required. Your setup syncs to every device automatically. Works on desktop, tablet, and phone.

**Live at:** https://percycodesios.github.io/CyberGrader.io/

---

## What It Does

### 📝 Teacher Feedback
Pick the type of work — **First Assignment**, **Assignment**, or **Project** — and the scenario (Perfect, Partial Credit, Missing Work, Welcome, etc.). Pre-written feedback appears with today's date auto-filled. Copy. Paste into the gradebook. Done.

Click **Generate Variation** to cycle through three alternate phrasings of the same feedback — written in a real teacher's voice from proven classroom feedback. Your saved custom edits become variation #1 so nothing you write ever gets wiped.

### ✉️ Email Generator
Every recurring student email you send throughout the year — in one place:

- Welcome Letter, Early Check-In, Zero Grade Clarification
- 25% / 50% / 75% Progress Check-Ins (each tuned to its moment in the term)
- Final Week Reminder, Upcoming Break
- Next Nine Weeks Loaded, Semester / Part Change
- Senior Final Reminder, End of Year (Grades 7–11), End of Year (Seniors)

Pick the term first. The tool filters the email list to only the types that make sense for that term (no "End of Year" emails available during the first nine weeks, no "Semester Change" during the fourth, etc.). Toggle between **All Students** and **Single Student**. Everything auto-fills — the term, the deadline, the progress target. Copy. Send.

**Split 4th Nine Weeks deadlines** auto-populate from your school year dates: pink senior deadline, cyan-green Grades 7–11 deadline. Side by side, impossible to confuse.

### ⚙️ Gradebook Setup
One-tap access to every gradebook placeholder text you need:

- Weekly Overall Grade Update (name + detail)
- Final Overall Grade (with a red warning box before you publish — delete the weekly placeholder, check honors/CHS quarterly grades, add comments for C-or-lower students)
- End of Grading Period Checklist (full modal walkthrough)

### 📅 School Year Setup
Enter your nine-weeks dates **once** at the start of the year — start and end dates for nine weeks 1–3, plus the shared fourth-nine-weeks start with split senior and grades 7–11 end dates. From that point on:

- Date card in the sidebar shows your whole year at a glance
- Every email auto-fills the correct deadline based on the selected term
- Senior-specific emails pull the pink senior end date
- Grades 7–11 emails pull the green general end date
- No more typing "Monday, June 2 at 11:59 p.m." into every email

Edit anytime from the user profile or by tapping the date pill.

---

## Account Required

CyberGrader.io is a personal workflow tool — your edits, saved templates, and school year dates belong to *you*, locked to your account. There is no anonymous mode and no shared classroom view.

1. Visit the site → marketing landing page loads
2. Click **Create Free Account** (or **Sign In** if you already have one)
3. Choose **Google** (one tap with your school account) or email/password
4. First sign-in triggers the School Year Setup modal
5. Every template edit, customization, and date change auto-saves to Firestore
6. Open the site on any device, sign in, your data pulls down automatically

### Session persistence

Your sign-in is **session-scoped** — when you close the browser tab or window, you're signed out. Open the site again? You'll need to sign in. This is intentional: shared classroom computers, faculty workstations, and the rare "I lent my laptop to a sub" moment all stay protected.

If you want to *stay* signed in on a personal device, just leave the tab open. Pinning it works great.

### Sign out anytime

User chip → **Sign Out**. Your data stays safe in Firestore until you sign back in.

---

## Privacy

Firestore security rules lock every user's data to their own Firebase UID. No one — not other users, not anyone who stumbles on the repo — can read or write your data unless they're signed in as you. The API key embedded in `app.html` is not a secret; security lives in the Firestore rules and the restricted referrer list on the Google API key itself.

---

## Pricing

**Free during beta.** No credit card. No monthly fee. Use the entire tool while the beta runs.

When the paid plan launches, **early-beta accounts lock in $4.99/month or $39/year** — the lowest tier the tool will ever offer. You'll see a notice in-app before any billing change happens, with plenty of warning.

---

## The Details That Make It Actually Usable

- **Today's date** shows in the top bar with a glowing "TODAY'S DATE" label — updates automatically every day
- **Senior-specific = pink.** Anywhere in the app. If it's pink, it's about fourth-nine-weeks seniors. No confusion.
- **Grades 7–11 fourth-nine-weeks = cyan-green.** Same visual language, different audience.
- **Edit Output** switches to **Save** on click — saves globally and syncs to the cloud
- **Reset Template** restores original wording; popup confirms only the current template is affected (school year dates and other templates stay safe)
- **Generate Variation** cycles your saved edit + 2 alternates — never wipes your work
- **Final Overall Grade warning** — red callout reminds you to delete the weekly placeholder, check honors/year-long/CHS quarterly grades, and add comments for students with C or lower
- **Mobile-friendly** — logo centers, date pill stays readable, buttons go full-width at narrow widths
- **How to Use** modal accessible via the ⓘ icon in the top bar

---

## Repo Layout

| File | Purpose |
|---|---|
| `index.html` | Marketing landing page — what visitors see first. Links to `app.html` for sign-in. |
| `app.html` | The actual tool. Auth-gated. Loads Firebase, renders the workflow UI. |
| `assets/cybergrader-logo.png` | Brand wordmark. Referenced by both `index.html` and `app.html`. |
| `assets/percy-logo.png` | Footer mark. |
| `assets/sv-portal-logo.png` | Gradebook Setup workflow icon. (Filename predates the rename — kept for cache stability.) |

---

## Hosting (GitHub Pages — Free)

GitHub Pages serves the whole site for free, auto-deploys on every commit. Setup:

1. Create a GitHub account if you don't have one
2. Create a new repo (name it whatever you want — e.g. `cybergrader`)
3. Upload all the files from this repo to the root
4. Go to **Settings → Pages**
5. Source: **Deploy from a branch** → Branch: `main`, folder: `/ (root)` → Save
6. Wait about a minute
7. Your site is live at `https://[your-username].github.io/[repo-name]/`

Bookmark it on desktop. Add it to your iPhone home screen so it feels like an app.

---

## How Firebase Is Set Up

Already configured — documented here in case a rebuild is ever needed.

| Setting | Value |
|---|---|
| Project | `cybergrader-v2` |
| Auth methods | Email/Password, Google sign-in |
| Auth persistence | `browserSessionPersistence` — auto-signs-out when browser closes |
| Firestore | Production mode, `us-east1` |
| Security rules | Users read/write only their own `/users/{uid}/...` paths |
| Authorized domains | `percycodesios.github.io`, `localhost` |
| API key restrictions | HTTP referrers: percycodesios.github.io, cybergrader-v2.firebaseapp.com, cybergrader-v2.web.app |
| Plan | Spark (free) — hard-stops at free-tier limits, no credit card, no surprise charges |

The `firebaseConfig` block is embedded directly in `app.html`. The API key is safe to be public — it's not a secret. The Firestore security rules + HTTP referrer restrictions are what protect the data.

---

## How to Update the Tool

When you get a new `app.html` (or `index.html`):

1. Go to your GitHub repo
2. Click the file you're replacing
3. Click the pencil icon (Edit)
4. Select all → delete → paste the new code
5. Click **Commit changes**
6. Wait ~60 seconds — the live site updates automatically
7. Hard-refresh the browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) to bypass cache

Your data survives every update — it lives in Firestore, not in the HTML file. The HTML file is just the app engine.

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS — no build step, no framework, no dependencies to break
- **Auth:** Firebase Auth (modular v10 SDK via CDN), session-scoped persistence
- **Database:** Cloud Firestore (user preferences + school year dates)
- **Hosting:** GitHub Pages (free, auto-deploys on commit)
- **Images:** Transparent PNGs, cache-busted via `?v=` query strings

---

## Credits

Built by **PercyCodes**.
