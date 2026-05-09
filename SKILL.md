---
name: percycodes-design
description: Use this skill to generate well-branded interfaces and assets for PercyCodes / CyberGrader.io, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map

- `README.md` — full brand context (voice, palette, motion, layout, iconography rules).
- `colors_and_type.css` — every token as CSS custom properties + semantic classes. Import this as the design baseline.
- `assets/` — real PNG logos. **Always copy and link these — never redraw.**
- `preview/` — small spec cards (one concept each) used to populate the Design System tab.
- `ui_kits/cybergrader/` — pixel-faithful recreation of the CyberGrader.io app: `index.html` plus React/JSX components and a complete `styles.css`. Use as the canonical source for component visuals.

## Hard rules

- Never invent SVG icons. Use the real PNGs in `assets/`, or one of the documented emoji.
- Pink (`#ff4ec9`) is **semantic** — it means *senior-related deadline*. Do not use it as a decorative accent.
- Cyan glow text-shadows are reserved for ceremonial uppercase labels (panel titles, the date pill).
- Voice = "Kenny's voice": warm, run-on commas, "I'm here if you have any questions" closer.
- Background is dark slate with two faint cyan corner glows. No photography, no illustration.
