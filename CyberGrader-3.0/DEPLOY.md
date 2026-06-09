# CyberGrader.io — 3.0 (clean, complete site)

This folder is the entire website, clutter-free. Everything here is used. Upload the
**contents** of this folder to your GitHub repo root and the whole site goes live.

## What's in 3.0
- **app.html** — the teacher tool (Feedback, Email Generator, Gradebook Setup, Take a Break)
- **index.html** — the marketing landing page (now with a Games section)
- **assets/** — the only 6 images the site uses (logo, portal icon, 4 favicons)
- **game/mynecraft.html** — MYnecraft, now with block targeting, break particles, and a
  coordinates + time-of-day display
- **gamebash-web/** — the GameBash Game Library
  - `index.html` — the hub
  - `games/yahtzee.html` + `.js` — full Yahtzee, 1–6 players, pass-and-play
  - `games/connect-four.html` + `.js` — Connect Four, 2 players, keeps score

## What changed in 3.0
- **GameBash is real now.** Replaced the half-built board sandbox with actual, complete,
  polished games (Yahtzee + Connect Four). No login, no Firebase — just open and play.
- **MYnecraft leveled up** — the block you're aiming at is highlighted, breaking blocks
  bursts particles, and a HUD shows your coordinates and the in-game time.
- **Email bugs fixed** — 4th-nine-weeks emails always populate with the correct default,
  the audience no longer sticks on "Seniors," and the End of Year message is your exact text.
- **Games linked everywhere** — landing nav + section, the tool's "Take a Break" button,
  and both footers.
- **Honest copy** — game descriptions now match exactly what's built.

## Deploy (no terminal)
1. Unzip this folder.
2. On GitHub (percycodesiOS/CyberGrader.io): **Add file → Upload files**.
3. Drag in the **contents** — `app.html`, `index.html`, `README.md`, and the
   `assets`, `game`, and `gamebash-web` folders.
4. Commit. Wait ~1 minute, then hard-refresh (Ctrl+Shift+R).

Live URLs (unchanged):
- Tool:       percycodesios.github.io/CyberGrader.io/app.html
- Landing:    percycodesios.github.io/CyberGrader.io/index.html
- GameBash:   percycodesios.github.io/CyberGrader.io/gamebash-web/
- MYnecraft:  percycodesios.github.io/CyberGrader.io/game/mynecraft.html
