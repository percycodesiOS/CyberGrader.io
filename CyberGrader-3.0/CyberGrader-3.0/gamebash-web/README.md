# GameBash — login-gated class game studio (no terminal to deploy)

This is the **private, login-gated** GameBash. It runs from plain static files
(React + Firebase load from a CDN), so you deploy it like everything else: drag the
folder into GitHub. No Node, no npm, no Firebase CLI.

It uses your **`gamebash-92555`** Firebase project, so your accounts, your students,
and your security rules all carry over.

## Who can get in
- **You (teacher):** "Sign in with Google" — only `kmacek715@gmail.com` is the admin
- **Students:** type their name → "Join as Student" (anonymous accounts, no password)
- **Everyone else:** nothing. All data is gated behind your published Firestore rules,
  and sign-in only works from web addresses you authorized in Firebase.

## What you can do
- **Build a game** — pick a board, click pieces onto it, drag to place, set dice, save.
  Your games publish instantly. Student games go to your **approval queue** first.
- **Play live** — open a game, and everyone in the room shares one board in real time:
  drag pieces (synced to all), roll dice, take turns, and chat.
- **Classroom** (teacher) — see every student who has joined.
- **Approve / reject / edit / delete** games, and **tidy duplicates** in one click.
- **Quick games** — Yahtzee, Connect Four, and MYnecraft are built in, ready to play.

## Files
```
index.html      — loads everything (Firebase config baked in)
gb-app.jsx      — auth, lobby, classroom dashboard, routing
gb-presets.jsx  — starter games + board & piece libraries
gb-editor.jsx   — the build-a-game editor
gb-room.jsx     — the live multiplayer room
games/          — Yahtzee + Connect Four (self-contained)
```

## Deploy (3 steps, all in the browser)
1. **Upload** this whole `gamebash-web/` folder to your CyberGrader.io repo.
   It lives at `percycodesios.github.io/CyberGrader.io/gamebash-web/`.
2. **Authorize the domain** (one time): Firebase console → Authentication → Settings →
   Authorized domains → add `percycodesios.github.io`. (Already done if GameBash worked before.)
3. **Publish the rules** (one time): the project's `gamebash/firestore.rules` is already
   published to `gamebash-92555`. Nothing to change unless you reset them.

Then open the live URL, sign in with Google, click **Add starters** or **Build a game**,
and **Play**. Open it on a second device, join with a name, and you'll see each other move.
