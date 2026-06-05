# GameBash — deploy it like MYnecraft (no terminal)

This is the single-folder, in-browser version of GameBash. It runs straight from
static files (React + Tailwind + Firebase all load from a CDN), so you deploy it the
same way as MYnecraft: drag the folder into GitHub. No Node, no npm, no Firebase CLI.

It talks to the **same Firebase project (`gamebash-92555`)** you already set up, so all
your auth + database work carries over.

---

## What works right now
- **Teacher sign-in** with Google, **student sign-in** with just a name
- **Lobby** — see all games and any games currently being played
- **Create game** — pick a board, click pieces onto it, drag to position, set dice, name it, save.
  Teachers' games publish instantly; students' games save as a request (teacher approval UI is still to come).
- **"Add starters"** (teacher) — adds the 7 starter games once (it won't make duplicates anymore)
- **"Tidy duplicates"** (teacher) — one click removes any duplicate piles from earlier
- **Delete** — hover any game card (teacher) and click the trash icon
- **Play a game live** — open a game, and you + your students share one board in real time:
  drag pieces (synced to everyone), roll dice, and chat

## What's NOT built yet (next milestone)
- A **teacher approval screen** for student-submitted games (students' games save but you can't review/approve them in this version yet)
- The **Classroom dashboard** and **card decks** in the editor

---

## 3 steps to go live

### 1. Put the folder on GitHub
Drop this whole `gamebash-web/` folder into your **CyberGrader.io** repo (same drag-and-drop
upload you already use). It'll be live at:
`https://percycodesios.github.io/CyberGrader.io/gamebash-web/`

### 2. Authorize that domain for sign-in (one click)
Firebase only allows sign-in from domains you approve.
- Go to: https://console.firebase.google.com/project/gamebash-92555/authentication/settings
- Under **Authorized domains**, click **Add domain** and add: `percycodesios.github.io`

### 3. Update the security rules (paste, no terminal)
The starter rules block students from *joining* a game they didn't create. This folder
includes a fixed `firestore.rules`. Publish it from the console:
- Go to: https://console.firebase.google.com/project/gamebash-92555/firestore/rules
- Open `firestore.rules` from this folder, copy everything, paste it over what's there
- Click **Publish**

That's it. Open the live URL, sign in with Google, click **Make demo games**, then **Play**.
Open the same URL on another device, join as a student, and you'll see each other's moves.

---

## Notes
- The old full React/Vite version still exists and is unchanged — this is a separate, simpler
  build made to deploy without a terminal. Both point at the same Firebase data.
- When you want the Editor + dashboard added here too, just ask — that's the next milestone.
