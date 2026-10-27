/* The Basics Quest: a quick first-time tutorial where kids learn each control by
 * doing it. Pure step logic plus a small card; the host page feeds it the
 * player's state and the actions it sees. It never reads or writes the world
 * save; only a separate "finished" preference is remembered by the host. */
(function (root) {
  'use strict';
  const DONE_KEY = 'mynecraft_tutorial_done';
  const STEPS = Object.freeze([
    { id: 'move', icon: '🕹️', title: 'Walk around', keys: 'Press W A S D (or the arrow keys) to walk.', touch: 'Push the round stick to walk.' },
    { id: 'look', icon: '👀', title: 'Look around', keys: 'Move the mouse to look around. Click and drag if it stays still.', touch: 'Drag the screen to look around.' },
    { id: 'jump', icon: '🦘', title: 'Jump!', keys: 'Press Space to jump.', touch: 'Tap JUMP.' },
    { id: 'fly', icon: '🚀', title: 'Fly up high', keys: 'Press F (or double-tap Space) to fly, then hold Space to go up!', touch: 'Tap FLY, then hold JUMP to go up. Tap FLY again to land.', creativeOnly: true },
    { id: 'place', icon: '🧱', title: 'Place a block', keys: 'Aim the + at the ground and right click.', touch: 'Aim the + at the ground and tap PLACE.' },
    { id: 'break', icon: '⛏️', title: 'Break a block', keys: 'Aim the + at a block and left click.', touch: 'Aim the + at a block and tap BREAK.' },
    { id: 'inventory', icon: '🎒', title: 'Pick a block', keys: 'Press I (or click Blocks / Inventory), then choose any block.', touch: 'Tap Blocks / Inventory, then choose any block.' },
    { id: 'interact', icon: '🏀', title: 'Shoot a hoop', keys: 'Walk up to the basketball and press E.', touch: 'Walk up to the basketball and tap the yellow button.', helper: 'Take me to the ball' },
    { id: 'save', icon: '💾', title: 'Save your world', keys: 'Click Save at the top of the screen.', touch: 'Tap Save at the top of the screen.' }
  ]);
  // Steps finished by what the player does (events) or by where they end up (checks).
  const EVENT_STEPS = { place: 'placed', break: 'broke', inventory: 'picked', interact: 'interacted', save: 'saved' };

  function createQuest({ creative = true } = {}) {
    const steps = STEPS.filter(s => creative || !s.creativeOnly);
    let index = 0, start = null, finished = false, exited = false;
    const listeners = new Set();
    const emit = kind => listeners.forEach(fn => fn(kind, quest.state()));
    function begin(p) { start = p ? { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, flying: !!p.flying } : null; }
    function advance(kind) {
      if (finished || exited) return;
      index++; start = null;
      if (index >= steps.length) { finished = true; emit('finished'); } else emit(kind);
    }
    const quest = {
      steps,
      state: () => ({ index, total: steps.length, step: finished || exited ? null : steps[index], finished, exited }),
      onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      // Called every frame with the player's position, view and flight state.
      update(p) {
        if (finished || exited || !p) return false;
        const step = steps[index];
        if (!start) { begin(p); return false; }
        const moved = Math.hypot(p.x - start.x, p.z - start.z);
        const turned = Math.abs(p.yaw - start.yaw) + Math.abs(p.pitch - start.pitch);
        let done = false;
        if (step.id === 'move') done = moved >= 3;
        else if (step.id === 'look') done = turned >= 1;
        else if (step.id === 'jump') done = p.y - start.y >= .7;
        else if (step.id === 'fly') done = !!p.flying && p.y - start.y >= 2;
        if (done) advance('done');
        return done;
      },
      // Called when the player does something the host can see.
      signal(event) {
        if (finished || exited) return false;
        const step = steps[index];
        if (EVENT_STEPS[step.id] !== event) return false;
        advance('done'); return true;
      },
      skip() { advance('skipped'); },
      exit() { if (finished || exited) return; exited = true; emit('exited'); }
    };
    return quest;
  }

  // The quest card: one short, big instruction at a time, with Skip and Exit.
  function mount(doc, quest, hooks = {}) {
    const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const card = el('section', 'quest-card'); card.id = 'questCard'; card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
    const progress = el('p', 'quest-progress'), icon = el('div', 'quest-icon'), title = el('h2', 'quest-title'), text = el('p', 'quest-text');
    const row = el('div', 'quest-buttons');
    const helper = el('button', 'quest-helper'); helper.type = 'button';
    const speak = el('button', 'quest-speak', '🔊 Read'); speak.type = 'button'; speak.setAttribute('aria-label', 'Read step out loud');
    const skip = el('button', 'quest-skip', 'Skip'); skip.type = 'button';
    const exit = el('button', 'quest-exit', '✕ Exit'); exit.type = 'button';
    row.append(helper, speak, skip, exit);
    card.append(progress, icon, title, text, row);
    doc.body.appendChild(card);
    let cheerTimer = null, autoSpeak = false;
    function sayAloud() {
      try {
        const synth = root.speechSynthesis, Utter = root.SpeechSynthesisUtterance;
        if (!synth || !Utter) return;
        synth.cancel();
        const u = new Utter(`${title.textContent}. ${text.textContent}`);
        u.rate = 0.96; synth.speak(u);
      } catch (e) {}
    }
    function paint(kind) {
      const s = quest.state();
      if (s.exited) { card.hidden = true; try { root.speechSynthesis?.cancel?.(); } catch (e) {} return; }
      if (s.finished) {
        progress.textContent = 'Basics quest complete!'; icon.textContent = '🎉'; title.textContent = 'You did it!';
        text.textContent = 'You know the basics. Go build something amazing!';
        helper.hidden = false; helper.textContent = 'Keep playing'; speak.hidden = true; skip.hidden = true; exit.hidden = true;
        card.dataset.cheer = 'true'; if (autoSpeak) sayAloud(); return;
      }
      const step = s.step, touch = hooks.isTouch ? hooks.isTouch() : false;
      progress.textContent = `Step ${s.index + 1} of ${s.total}`;
      icon.textContent = step.icon; title.textContent = step.title; text.textContent = touch ? step.touch : step.keys;
      helper.hidden = !step.helper; helper.textContent = step.helper || '';
      speak.hidden = false; skip.hidden = false; exit.hidden = false;
      // A quick "Nice!" so every finished step feels like a win.
      if (kind === 'done') { card.dataset.cheer = 'true'; progress.textContent = 'Nice! ✓  ' + progress.textContent; clearTimeout(cheerTimer); cheerTimer = setTimeout(() => { card.dataset.cheer = 'false'; }, 900); }
      else card.dataset.cheer = 'false';
      if (autoSpeak) sayAloud();
    }
    speak.addEventListener('click', () => { autoSpeak = true; sayAloud(); });
    helper.addEventListener('click', () => {
      const s = quest.state();
      if (s.finished) { card.hidden = true; hooks.onClose && hooks.onClose('finished'); return; }
      hooks.onHelper && hooks.onHelper(s.step.id);
    });
    skip.addEventListener('click', () => quest.skip());
    exit.addEventListener('click', () => quest.exit());
    quest.onChange(kind => { paint(kind); if (kind === 'finished' || kind === 'exited') hooks.onEnd && hooks.onEnd(kind); if (kind === 'exited') hooks.onClose && hooks.onClose('exited'); });
    paint('start');
    // While playing, the card sits at the top. With the menu or Inventory open it moves
    // to a corner, so the mouse is free to press Skip or Exit and the menu stays readable.
    return { card, paint, setDocked(docked) { const place = docked ? 'corner' : 'top'; if (card.dataset.place !== place) card.dataset.place = place; } };
  }
  root.MYNE_TUTORIAL = Object.freeze({ STEPS, DONE_KEY, createQuest, mount });
})(globalThis);
