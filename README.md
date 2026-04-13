# CyberGrader.io

I built this because I was tired of copy-pasting the same grading feedback and check-in emails over and over. If you teach any kind of online or cyber course where you send the same progress reminders every nine weeks and type the same grading comments 50 times a day, this might help you too.

It's one HTML file. No login, no database, no monthly fee. Open it in your browser and go. Works on desktop and on your phone.

---

## What it does

**Grading tab** — My locked grading feedback. I pick the type of work (First Assignment, Assignment, or Project) and the scenario (Perfect, Partial Credit, Missing Work, etc). The exact wording I use shows up in the box. I click Copy. I paste it into my gradebook. Done. No retyping, no "close enough" variations.

**Email tab** — All my check-in emails: welcome letter, early check-in, 25%/50%/75% progress reminders, final week, next nine weeks loaded, welcome to the next nine weeks, and spring break. I pick the email type, it fills in based on the term I'm in. The output comes out with `Subject: ...` on top, a blank line, then the body. I paste the body into my email, then grab the subject line for the subject field.

When I set the term to **4th Nine Weeks**, the check-in templates automatically switch to the dual-deadline version that lists both Grades 7–11 and Senior deadlines — because that's the one time of year they're different and I send one email to all my classes instead of separating by grade level.

**Library tab** — All the reusable SV Portal text I need every nine weeks in one place. Weekly Progress Update name and detail. Final Nine Weeks Grade name and detail. Start of Year class announcement. Remote Instruction Day (FID) announcement. Each one has its own copy button so I can grab just the assignment name, just the detail, or the whole announcement.

**Year Setup tab** — The thing that makes this actually save time. I enter all my nine weeks start and end dates once at the beginning of the year, including the separate 4th nine weeks dates for Seniors vs Grades 7–11. From that point on, every email auto-fills with the correct deadline based on the term I pick. No more typing "Monday, June 2 at 11:59 p.m." into every single email.

---

## The stuff that makes it actually usable

- **Today's date** is in the top right and updates every day on its own
- **Edit any template**, click Save Override, your edit is saved on that device
- **Reset** button goes back to the original locked wording if I mess something up
- **Export / Import** JSON so I can move my saved edits and year setup between my desktop and phone
- **4th nine weeks templates** switch automatically when I set the term — no separate email types to pick
- **Mobile-friendly** — tabs stack, buttons go full width, everything still works with one thumb
- **No internet required** once the page loads — I can work on it during an FID day without panicking if WiFi flakes out

---

## How I host it (free forever)

I use GitHub Pages because it's free and my file is just one HTML file.

1. Make a GitHub account if you don't have one (free)
2. Create a new repo called `cybergrader` (or whatever you want)
3. Upload `index.html` to the root of the repo
4. Go to Settings → Pages
5. Source: "Deploy from a branch" → Branch: `main`, folder: `/ (root)` → Save
6. Wait about a minute
7. Your site is live at `https://[your-username].github.io/cybergrader/`
8. Bookmark it on desktop. Add it to your iPhone home screen so it feels like an app.

Zero cost. To update it later, just replace `index.html` in the repo. GitHub Pages redeploys automatically in about a minute.

If you ever want a custom domain like `cybergrader.io`, that's about $10/year for the domain name through a registrar like Porkbun or Namecheap. Pages still hosts free.

---

## Syncing between devices (right now)

For now it's manual:

- On Device A: click Export → save the JSON file somewhere (email it to yourself, drop it in Drive, AirDrop it)
- On Device B: click Import → pick the file
- All your overrides and year setup merge in

Each browser keeps its own copy until you sync. This works fine for me because I mostly use my school laptop and my phone.

---

## What I need to set up Firebase for real cloud sync

I already have a Firebase/Google account but haven't wired this up yet. When I'm ready, here's exactly what I need to send to Alex to get real login + cloud sync working so my overrides follow me everywhere automatically:

### Step-by-step

1. Go to https://console.firebase.google.com
2. Click **Add project** (or **Create a project**)
3. Project name: `cybergrader` → Continue
4. **Disable Google Analytics** — I don't need it, just turn off the toggle → Create project
5. Wait for it to finish, click Continue

### Enable login
6. Left sidebar → **Build → Authentication** → Get started
7. **Sign-in method** tab → click **Email/Password** → toggle Enable → Save
8. (Optional) Also enable **Google** sign-in if I want one-tap login with my Google account

### Create the database
9. Left sidebar → **Build → Firestore Database** → Create database
10. Start in **production mode** → Next
11. Location: `us-east1` (closest to PA) → Enable
12. After it creates, click the **Rules** tab and paste this exact text:
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
    → Publish

    This locks it down so only I can see my own data. No one else can touch it.

### Register a web app
13. Click the **gear icon** top-left → Project settings
14. Scroll down to **Your apps** → click the **`</>`** (web) icon
15. App nickname: `cybergrader-web`
16. **Don't** check "Also set up Firebase Hosting" — I'm using GitHub Pages
17. Click **Register app**
18. Firebase shows a code block with `firebaseConfig` in it. It looks like this:
    ```js
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "cybergrader-xxxxx.firebaseapp.com",
      projectId: "cybergrader-xxxxx",
      storageBucket: "cybergrader-xxxxx.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abc123def456"
    };
    ```

### Send that block to Alex
19. Copy the **entire `firebaseConfig` block** (all 6 lines inside the braces)
20. Paste it in my next message
21. Alex will wire up a Sign In button, auto-sync on save, and auto-load on sign-in

**Note on security:** that `apiKey` looks scary but it is **not a secret**. Firebase web API keys are public by design — the security rules I pasted above are what actually protect my data. It's safe to commit the config to GitHub.

---

## Items still open

- **Welcome Third / Fourth Nine Weeks grading wording** — I haven't given Alex the wording for these yet, so only 1st and 2nd are in the First Assignment dropdown. When I send the wording, they'll get added.
- I'll probably keep tweaking email copy as I use this more. That's what the Edit / Save Override buttons are for.

---

Created by percycodes.
