# PercyCodes GameBash

A classroom platform where students design, build, and play board & card games together in real time.

**Stack:** React 19 + Vite + TypeScript + TailwindCSS + Firebase (Auth, Firestore, Storage) + Konva.

## Features

- 🧑‍🏫 **Teacher / Student roles** — Google sign-in for teachers, name-only anonymous join for students
- 🎲 **Game Editor** — design boards, place pieces, write card decks, configure dice
- 🎮 **Live Game Rooms** — real-time multiplayer with chat, piece sync, turns, dice
- 📊 **Classroom Dashboard** — see all students who have joined
- 🔒 **Firestore security rules** — role-aware, validated

## Run Locally

See [`DEPLOY.md`](./DEPLOY.md) for full first-time setup. Quick version once you've got the Firebase config in place:

```bash
npm install
npm run dev
```

App runs at <http://localhost:5173>.

## Deploy

See [`DEPLOY.md`](./DEPLOY.md). Short version:

```bash
npm run deploy
```

## Project Structure

```
src/
  App.tsx                  — top-level routing + auth
  firebase.ts              — Firebase SDK init + error helpers
  types.ts                 — TypeScript types for Game, Room, Player, etc.
  seedData.ts              — 3 demo game templates
  components/
    Lobby.tsx              — game template grid + active rooms list
    Editor.tsx             — game template editor (board, pieces, cards, dice)
    GameRoom.tsx           — live multiplayer game session + chat
    ClassroomDashboard.tsx — teacher view of students
    Board.tsx              — Konva canvas board renderer
    Dialog.tsx             — confirm dialog primitive

firestore.rules            — Firestore security rules
firebase.json              — Firebase Hosting + rules config
firebase-applet-config.example.json — template for your Firebase web config
```

## Admin

The admin email is hardcoded in `src/App.tsx` and `firestore.rules` as `kmacek715@gmail.com`. Change both if you want a different admin.
