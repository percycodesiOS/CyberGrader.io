# CyberGrader.io — CLEAN repo (the only files your live site needs)

This folder is the complete, clutter-free version of your website. Everything here
is used by the live site. Nothing here is junk. If you upload exactly this, the live
site works identically — just without 120+ leftover files cluttering your repo.

## The whole site, explained
```
app.html            ← the CyberGrader tool (feedback, emails, gradebook, Take a Break)
index.html          ← the marketing landing page
README.md           ← project notes
assets/             ← the ONLY 6 images the site uses
  cybergrader-logo.png
  sv-portal-logo.png
  favicon-16.png  favicon-32.png  favicon-180.png  favicon-512.png
game/
  mynecraft.html    ← the MYnecraft block game
gamebash-web/       ← the GameBash game platform
  index.html  gb-app.jsx  gb-editor.jsx  gb-presets.jsx  gb-room.jsx
  GAMEBASH_SETUP.md  firestore.rules
```

## How to clean GitHub safely (delete-all, upload-clean)

This is the safest method — you can't half-break it, because you replace everything
at once with a known-good set.

1. Go to your repo: github.com/percycodesiOS/CyberGrader.io
2. Delete the old files (see DELETE LIST below) — or, simplest: delete them all.
3. **Add file → Upload files**, then drag in the CONTENTS of this folder
   (the app.html, index.html, and the assets / game / gamebash-web folders).
4. Commit. Wait ~1 minute, then hard-refresh your live site (Ctrl+Shift+R).

Your live URLs do not change:
- Tool:      percycodesios.github.io/CyberGrader.io/app.html
- Landing:   percycodesios.github.io/CyberGrader.io/index.html
- MYnecraft: percycodesios.github.io/CyberGrader.io/game/mynecraft.html
- GameBash:  percycodesios.github.io/CyberGrader.io/gamebash-web/

## Safe to DELETE from GitHub (none of these are served by the live site)
- Duplicate copies of the site: cybergrader-site/, github-upload/, latest-two-files/, upload-bundle/, dist/
- Old build source (doesn't run on GitHub Pages): gamebash/, ui_kits/, preview/
- Pasted screenshots & old logos: uploads/, and in assets/ the files percy-logo*.png,
  percycodes-*.png, cybergrader-logo-280x80.png, "cybergrader-logo 2.png", "percy-logo 2.png"
- Stray root files: "PercyCodes Logo Options.html", "animations.jsx", "animations 2.jsx",
  "demo.html", "demo 2.html", "design-canvas.jsx", "colors_and_type.css",
  "feedback_rewrite_for_approval.md", "voice_examples.md", "SKILL.md", "BACKUP-README.md"
