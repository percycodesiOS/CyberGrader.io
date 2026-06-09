# GameBash — Class Game Library

A small arcade of real, ready-to-play games for the classroom. No accounts, no setup,
no backend — every game is a self-contained page that runs straight from GitHub Pages.

## Structure
```
index.html                  ← the game library hub (links to each game)
games/
  yahtzee.html / .js        ← full Yahtzee, 1–6 players, pass-and-play
  connect-four.html / .js   ← Connect Four, 2 players, keeps score
```
MYnecraft lives one level up at `../game/mynecraft.html` and is linked from the hub.

## Live URL
`https://percycodesios.github.io/CyberGrader.io/gamebash-web/`

## Adding a game later
Drop a new self-contained `games/<name>.html` (+ optional `.js`) and add a card to
`index.html`. Nothing else to wire up.
