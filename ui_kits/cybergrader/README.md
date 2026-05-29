# CyberGrader.io UI Kit

A high-fidelity recreation of the CyberGrader.io app chrome — the workflow tool for cyber-teachers built by PercyCodes.

This kit is a **visual + interaction recreation** of the live single-file app at `cyberGrader/index.html`. It is *not* production code: Firebase auth, Firestore sync, the full template library, and all variation logic are stubbed. The job here is to give designers and design agents reusable, pixel-faithful UI building blocks.

## What's recreated

- **Topbar** — date pill (TODAY'S DATE eyebrow + value), centered logo, user chip, how-to button.
- **Sidebar panels** — Teacher Notes, School Year (with senior pink + Grades-7–11 green semantic colors).
- **Three-block selector** — Teacher Feedback / Email Generator / Gradebook Setup. Active state with cyan glow.
- **Forms & controls** — selects, inputs, textareas (read-only and edit-mode orange variants), audience toggle.
- **Buttons** — hero copy button (cyan gradient, uppercase, big), edit, save, reset, ghost, icon-only.
- **Modals** — School Year Setup, How to Use, Final-grade Reminder, Checklist (chrome only).
- **Senior/General callouts** — `NO EXTENSIONS FOR SENIORS`, dual-deadline grid.
- **Footer** — Percy dog mark with pink drop-shadow, "Created by PERCYCODES."

## How to use

Open `index.html` directly. Babel + React (UMD) load components from the `*.jsx` files in this folder. Each component is small and visually-focused — no real auth, no real persistence.

## Files

| File | What |
|---|---|
| `index.html` | Click-thru demo wiring everything together. |
| `Topbar.jsx` | Top bar with date pill, logo, user chip. |
| `Sidebar.jsx` | Notes + School Year panel. |
| `BlockSelector.jsx` | Three-up workflow picker. |
| `FeedbackBlock.jsx` | Teacher feedback workflow panel. |
| `EmailBlock.jsx` | Email-generator workflow panel (with audience toggle + dual deadlines). |
| `PortalBlock.jsx` | Gradebook Setup workflow panel. |
| `Modals.jsx` | School Year Setup + How to Use modal chrome. |
| `Footer.jsx` | Percy footer mark. |
| `controls.jsx` | Reusable Field, Select, Input, Textarea, Button primitives. |
