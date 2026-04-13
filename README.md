# CyberGrader.io

I built this because I was tired of copy-pasting the same grading feedback and check-in emails over and over. If you teach any kind of online or cyber course where you send the same progress reminders every nine weeks and type the same grading comments 50 times a day, this might help you too.

It's one HTML file. No monthly fee. Cloud sync with Google sign-in so my overrides and year setup follow me to every device automatically. Works on desktop and on my phone.

**Live at:** https://percycodesios.github.io/CyberGrader.io/

---

## What it does

**Grading tab** — My locked grading feedback. I pick the type of work (First Assignment, Assignment, or Project) and the scenario (Perfect, Partial Credit, Missing Work, etc). The exact wording I use shows up in the box. I click Copy. I paste it into my gradebook. Done. No retyping, no "close enough" variations.

**Email tab** — All my check-in emails: welcome letter, early check-in, 25%/50%/75% progress reminders, final week, next nine weeks loaded, welcome to the next nine weeks, and spring break. I pick the email type, it fills in based on the term I'm in. The output comes out with `Subject: ...` on top, a blank line, then the body. I paste the body into my email, then grab the subject line for the subject field.

When I set the term to **4th Nine Weeks**, the check-in templates automatically switch to the dual-deadline version that lists both Grades 7–11 and Senior deadlines — because that's the one time of year they're different and I send one email to all my classes instead of separating by grade level.

**Library tab** — All the reusable SV Portal text I need every nine weeks in one place. Weekly Progress Update name and detail. Final Nine Weeks Grade name and detail. Start of Year class announcement. Remote Instruction Day (FID) announcement. Each one has its own copy button so I can grab just the assignment name, just the detail, or the whole announcement.

**Year Setup tab** — The thing that makes this actually save time. I enter all my nine weeks start and end dates once at the beginning of the year, including the separate 4th nine weeks dates for Seniors vs Grades 7–11. From that point on, every email auto-fills with the correct deadline based on the term I pick. No more typing "Monday, June 2 at 11:59 p.m." into every single email.

---

## Cloud sync (Firebase)

This is the part I'm most proud of. I sign in once with my Google account and everything follows me.

- Click **Sign In** in the top bar
- Pick Google (one tap with my school account) or use email/password
- "Synced ✓" indicator turns green in the top bar
- Every edit I make — grading overrides, email overrides, announcement edits, year setup dates — auto-saves to the cloud in the background
- Open the site on my laptop, phone, or school Chromebook → sign in → all my data pulls down automatically within a second
- Sign out anytime and my data stays on that device but stops syncing

**Privacy:** The Firestore security rules lock my data to my user ID only. No one — not other users, not anyone who finds the repo — can read or write my data unless they're signed in as me. It's as tight as it gets for a client-side app.

**If I lose internet:** The tool falls back to localStorage and keeps working. When I'm online again, the next save syncs everything back up. Nothing ever breaks.

**Manual backup (still available):** Export / Import JSON buttons are still in the sidebar if I want a local file backup I can email to myself or drop in Drive.

---

## The stuff that makes it actually usable

- **Today's date** is in the top right and updates every day on its own
- **Edit any template**, click Save Override, your edit is saved locally AND synced to the cloud (if signed in)
- **Reset** button goes back to the original locked wording if I mess something up
- **4th nine weeks templates** switch automatically when I set the term — no separate email types to pick
- **Mobile-friendly** — tabs stack, buttons go full width, everything still works with one thumb
- **No internet required** once the page loads — I can work on it during an FID day without panicking if WiFi flakes out
- **Sync status visible in the top bar** — I always know if my changes made it to the cloud

---

## How I host it (free forever)

I use GitHub Pages because it's free and my file is just one HTML file.

1. Make a GitHub account if you don't have one (free)
2. Create a new repo called `cybergrader` (or whatever you want)
3. Upload `index.html` to the root of the repo
4. Go to Settings → Pages
5. Source: "Deploy from a branch" → Branch: `main`, folder: `/ (root)` → Save
6. Wait about a minute
7. Your site is live at `https://[your-username].github.io/[repo-name]/`
8. Bookmark it on desktop. Add it to your iPhone home screen so it feels like an app.

Zero cost. To update it later, just replace `index.html` in the repo. GitHub Pages redeploys automatically in about a minute.

---

## How Firebase is set up

Already done — but for reference if I ever need to rebuild:

- **Project:** cybergrader-v2
- **Auth methods enabled:** Email/Password, Google sign-in
- **Firestore:** production mode, us-east1 region
- **Security rules:** users can only read/write their own `/users/{uid}/...` paths
- **Authorized domains:** `percycodesios.github.io` added so OAuth redirects work
- **Plan:** Spark (free). Firebase hard-stops at free tier limits — no credit card, no surprise charges

The `firebaseConfig` block is embedded in the `index.html` file itself. The API key is safe to be public — it's not a secret, the security rules are what protect the data.

---

## Updating the tool

Whenever I get a new version of `index.html`:

1. Go to my GitHub repo
2. Click the existing `index.html`
3. Click the pencil icon (edit)
4. Select all, delete, paste the new code
5. Scroll down, click "Commit changes"
6. Wait ~60 seconds — live site updates automatically

**My data survives updates** because it lives in Firestore and localStorage, not in the HTML file. The HTML file is just the app engine.

**Pro move:** before any big update, click Export in the sidebar and save the JSON as a local backup. That's my insurance policy.

---

## Items still open

- **Welcome Third / Fourth Nine Weeks grading wording** — I haven't given Alex the wording for these yet, so only 1st and 2nd are in the First Assignment dropdown. When I send the wording, they'll get added.
- I'll probably keep tweaking email copy as I use this more. That's what the Edit / Save Override buttons are for, and now every edit auto-syncs to every device.

---

Created by percycodes.
