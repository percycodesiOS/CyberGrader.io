# CyberGrader.io

I built this because I was tired of copy-pasting the same grading feedback and check-in emails over and over. If you teach any kind of online or cyber course — sending the same progress reminders every nine weeks and typing the same grading comments 50 times a day — this might help you too.

One HTML file. No monthly fee. Cloud sync via Google sign-in so your overrides and year setup follow you to every device automatically. Works on desktop and mobile.

**Live at:** <https://percycodesios.github.io/CyberGrader.io/>

-----

## What It Does

### Grading Tab

Pick the type of work (First Assignment, Assignment, Project, or Portal Information) and the scenario (Perfect, Partial Credit, Missing Work, etc.). The exact locked wording appears in the box. Click Copy. Paste into your gradebook. Done — no retyping, no “close enough” variations.

### Email Tab

All your check-in emails in one place: welcome letter, early check-in, 25/50/75% progress reminders, final week, next nine weeks loaded, semester/part change, and spring break. Pick the email type, set the term, and it fills in automatically. Output comes out with `Subject:` on top, a blank line, then the body — ready to paste.

When you set the term to **4th Nine Weeks**, check-in templates automatically switch to the dual-deadline version listing both the Grades 7–11 and Senior deadlines separately — because that’s the one time of year they differ, and you’re sending one email to all your classes.

### Library Tab

All reusable SV Portal text in one place. Weekly Progress Update name and detail. Final Nine Weeks Grade name and detail. Start-of-year class announcement. Remote Instruction Day (FID) announcement. Each has its own copy button — grab just the assignment name, just the detail, or the full announcement.

### Year Setup Tab

Enter all your nine weeks start and end dates once at the beginning of the year — including the split 4th nine weeks dates for Seniors vs. Grades 7–11. From that point on, every email auto-fills with the correct deadline based on the term you select. No more typing “Monday, June 2 at 11:59 p.m.” into every single email.

-----

## Cloud Sync (Firebase)

Sign in once with your Google account and everything follows you.

1. Click **Sign In** in the top bar
1. Choose Google (one tap with your school account) or email/password
1. The **Synced ✓** indicator turns green in the top bar
1. Every edit — grading overrides, email overrides, announcement edits, year setup dates — auto-saves to the cloud in the background
1. Open the site on any device, sign in, and your data pulls down automatically

Sign out anytime. Your data stays on that device but stops syncing until you sign back in.

**No internet?** The tool falls back to localStorage and keeps working. When you’re back online, the next save syncs everything. Nothing breaks.

**Manual backup:** Export / Import JSON buttons are in the sidebar if you want a local file backup to email yourself or drop in Drive.

### Privacy

Firestore security rules lock your data to your user ID only. No one — not other users, not anyone who finds the repo — can read or write your data unless they’re signed in as you.

-----

## The Details That Make It Actually Usable

- Today’s date is in the top right and updates automatically every day
- **Edit Output** switches the button to **Save** — click Save to lock in your edit globally and sync it to the cloud
- **Reset Template** restores the original locked wording if you mess something up
- 4th nine weeks templates switch automatically when you set the term — no separate email types to navigate
- Mobile-friendly — tabs stack, buttons go full width, works with one thumb
- No internet required once the page loads — safe to use during an FID day if WiFi flakes out
- Sync status is always visible in the top bar

-----

## How to Host It (Free Forever)

GitHub Pages. Free. Your file is one HTML file.

1. Create a [GitHub account](https://github.com) if you don’t have one
1. Create a new repo — name it whatever you want (e.g. `cybergrader`)
1. Upload `index.html` to the root of the repo
1. Go to **Settings → Pages**
1. Source: *Deploy from a branch* → Branch: `main`, folder: `/ (root)` → Save
1. Wait about a minute
1. Your site is live at `https://[your-username].github.io/[repo-name]/`

Bookmark it on desktop. Add it to your iPhone home screen so it feels like an app.

To update later, just replace `index.html` in the repo. GitHub Pages redeploys automatically within about a minute.

-----

## How Firebase Is Set Up

Already configured — documented here in case a rebuild is ever needed.

|Setting          |Value                                                                             |
|-----------------|----------------------------------------------------------------------------------|
|Project          |cybergrader-v2                                                                    |
|Auth methods     |Email/Password, Google sign-in                                                    |
|Firestore        |Production mode, us-east1                                                         |
|Security rules   |Users read/write only their own `/users/{uid}/...` paths                          |
|Authorized domain|percycodesios.github.io                                                           |
|Plan             |Spark (free) — hard-stops at free tier limits, no credit card, no surprise charges|

The `firebaseConfig` block is embedded directly in `index.html`. The API key is safe to be public — it’s not a secret. The Firestore security rules are what protect the data.

-----

## How to Update the Tool

When you get a new `index.html`:

1. Go to your GitHub repo
1. Click the existing `index.html`
1. Click the pencil icon (Edit)
1. Select all → delete → paste the new code
1. Click **Commit changes**
1. Wait ~60 seconds — the live site updates automatically

Your data survives every update because it lives in Firestore and localStorage, not in the HTML file. The HTML file is just the app engine.

> **Pro move:** Before any big update, click Export in the sidebar and save the JSON locally. That’s your insurance policy.

-----

## Still in Progress

- **Welcome Third / Fourth Nine Weeks grading wording** — only 1st and 2nd Nine Weeks are currently in the First Assignment dropdown. When the wording is finalized, they’ll be added.
- Email copy will keep getting refined as the tool gets used in the real workflow. That’s what Edit Output and Save are for — and every edit now auto-syncs to every device.

-----

*Created by percycodes*
