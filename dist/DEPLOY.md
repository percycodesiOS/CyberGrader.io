# Deploy guide — adding the marketing landing to CyberGrader.io

**Goal:** add a marketing landing page to your live site without breaking the existing app.

This folder contains everything you need:

- `landing.html` — single self-contained file, all CSS inlined
- `assets/` — the three logos the page references

---

## Phase 1 · Add the landing page (zero risk, ~3 minutes)

Drop the new file in alongside your existing `index.html`. It does not replace anything.

1. Go to `github.com/PercyCodesIos/CyberGrader.io` (or wherever the repo lives).
2. Click **Add file → Upload files**.
3. Drag `landing.html` from this `dist/` folder into the upload area.
4. **Drag the `assets/` folder too** if your repo doesn't already have those three PNGs at `assets/cybergrader-logo.png`, `assets/sv-portal-logo.png` (filename kept for cache stability — it's the Gradebook Setup icon), and `assets/percy-logo.png`. If it does, skip this — the file will use the existing ones.
5. Scroll down → commit message: *"Add marketing landing page"* → **Commit changes**.
6. GitHub Pages auto-deploys in ~60 seconds.
7. Visit `percycodesios.github.io/CyberGrader.io/landing.html` to check.

The live app at `percycodesios.github.io/CyberGrader.io/` is untouched. You can sit on the landing page for as long as you want, share the URL, gather opinions.

---

## Phase 2 · Make the landing the homepage (reversible swap)

Once you're happy with the landing page, swap which file is the homepage. This is a rename, fully reversible.

1. In your repo, click `index.html` → ✏ pencil → click the filename at the top → rename to `app.html`. Commit.
2. Click `landing.html` → rename to `index.html`. Commit.
3. The "Sign In" and "Get Started" buttons in `landing.html` already point to `./` — but **after the rename, `./` resolves to `landing.html` (now the new index)**, which is wrong. Edit the new `index.html` and change every `href="./"` to `href="./app.html"`. Commit.
4. Wait ~60 seconds for GitHub Pages to redeploy.
5. Test:
   - `percycodesios.github.io/CyberGrader.io/` → marketing landing ✓
   - Click Sign In / Get Started → opens the app ✓
   - `percycodesios.github.io/CyberGrader.io/app.html` → app directly ✓

**If anything breaks:** rename `index.html` back to `landing.html` and `app.html` back to `index.html`. You're whole again. Total recovery time: ~60 seconds.

---

## What is NOT changed by this deploy

- Your Firebase auth config
- Your existing `index.html` app (until Phase 2 rename, which is reversible)
- Your DNS, custom domain (if any), or repo settings
- Your existing assets/icons/logos already in the repo

## Heads up

- The landing references `assets/cybergrader-logo.png`, `assets/sv-portal-logo.png` (the Gradebook Setup icon — filename kept for cache stability), `assets/percy-logo.png`. Confirm those paths match what's in your repo before committing — if your live repo keeps logos at the root (e.g. `cybergrader-logo.png`, no `assets/` folder), find and replace `assets/` → `` in the new `landing.html` before uploading.
- Inter and Sora fonts load from Google Fonts. No setup needed — they just work.
- The page is responsive and tested down to phone width.
