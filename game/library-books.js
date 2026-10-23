/* The Little Library: short, original stories that MYnecraft can read aloud.
 * Pure data plus a small reading session; the host page owns pausing the game.
 * Speech uses the browser's own speechSynthesis, so nothing is sent anywhere. */
(function (root) {
  'use strict';
  const STORIES = Object.freeze([
    { id: 'roof-tea', title: 'Tea on the Roof', color: '#c9764b', pages: [
      'Mira climbed to the top of the school, one careful step at a time. She carried a warm cup of tea in both hands.',
      'From the roof, the whole campus looked small and friendly. The buses were yellow dots. The lake was a silver coin.',
      'She sat down and took a slow sip. The tea tasted like honey and a little bit like lemon.',
      'A bird landed beside her. "Nice view," Mira whispered. The bird fluffed its feathers, as if it agreed.',
      'When the cup was empty, the sky was turning pink. Mira decided this was the best seat in the whole world.'
    ] },
    { id: 'little-library', title: 'The Library That Grew', color: '#5a7fc0', pages: [
      'Theo wanted a library, so he placed one bookshelf. It looked lonely all by itself.',
      'So he placed another, and another, until the shelves made a cozy room with a door and a window.',
      'He added a glowing light in the ceiling. Now the room was warm and golden, even at night.',
      'Every shelf held a story waiting to be read. Some were funny, some were brave, and some were quiet.',
      'Theo picked one, sat on the floor and began to read. The library did not feel lonely anymore. Neither did he.'
    ] },
    { id: 'dogs-day', title: 'Percy and Ellie Go Exploring', color: '#3f9b8f', pages: [
      'Percy and Ellie were best friends with four legs each and one big idea: explore everything.',
      'They sniffed the flower beds. They raced along the path. They peeked around the corner of the gym.',
      'Ellie found a stick. Percy found a bigger stick. They carried them together, side by side.',
      'When they were tired, they flopped down in the sunny grass and watched the clouds drift by.',
      'Exploring is fun, they decided. But resting with a friend is even better.'
    ] },
    { id: 'patient-fish', title: 'The Patient Little Fish', color: '#3d8ccf', pages: [
      'In a small blue pond lived a very small orange fish named Pip.',
      'Pip wanted to be big right away. "Patience," said the water. "Growing takes time."',
      'So Pip swam in slow circles. Pip counted bubbles. Pip watched the sky ripple above.',
      'One day Pip looked at its reflection and gasped. It had grown, a little bit every day, without noticing.',
      'Pip learned that the best things grow slowly, one bubble at a time.'
    ] },
    { id: 'missed-shot', title: 'The Shot That Missed', color: '#e08a2e', pages: [
      'Jada lined up her shot, took a breath and threw. The ball bounced off the rim. Clang!',
      'She frowned. Then she picked up the ball and tried again. Clang! Another miss.',
      'Her friend Sam said, "Step a little closer, and look right at the hoop."',
      'Jada stepped closer. She looked at the hoop. She threw. Swish! Confetti filled the air.',
      'Jada laughed. The misses were not mistakes, she realized. They were practice for the swish.'
    ] },
    { id: 'blue-car', title: 'The Little Blue Car', color: '#2e8dce', pages: [
      'In the parking lot sat a little blue car who dreamed of going for a drive.',
      'One morning, a student climbed in. "Ready?" she asked. The car felt its wheels tingle.',
      'Slowly they rolled forward, bumping gently over the curb. Left around the flag. Right past the buses.',
      'They did not go fast. They did not need to. The little blue car was simply happy to be moving.',
      'Back in its spot, the car sighed a happy sigh and dreamed about tomorrow\'s drive.'
    ] },
    { id: 'garden', title: 'A Garden of Every Color', color: '#5bab5f', pages: [
      'Rosa planted a red poppy. Then a white daisy. Then a sunflower taller than her knees.',
      'She added purple lavender that smelled like a soft, sleepy afternoon.',
      'Bees came to visit. Butterflies came too. Even a curious cat sat down to watch.',
      'Rosa looked at her garden and smiled. Every flower was different, and every one belonged.',
      'That, she thought, is what makes a garden beautiful.'
    ] },
    { id: 'rainy-day', title: 'The Quiet Rainy Day', color: '#7a6fb0', pages: [
      'Rain tapped on the windows, soft and steady, like a song with no words.',
      'Noah found a blanket, a pillow and a book about a dragon who loved to bake bread.',
      'He read about the dragon\'s warm oven and the smell of fresh loaves drifting through the castle.',
      'Outside the rain kept singing. Inside, Noah turned the pages and felt cozy all the way to his toes.',
      'Some days are for running and jumping. Some days are for reading. Both kinds are good days.'
    ] }
  ]);
  const byId = id => STORIES.find(s => s.id === id) || null;

  // A small adapter around speechSynthesis. Each spoken page has a generation
  // number, because some browsers fire "end" after cancel and would skip pages.
  function browserSpeech(win) {
    const synth = win && win.speechSynthesis, Utterance = win && win.SpeechSynthesisUtterance;
    if (!synth || typeof Utterance !== 'function') return null;
    return {
      speak(text, onEnd) {
        const u = new Utterance(text); u.rate = .92; u.pitch = 1.05; u.lang = 'en-US';
        u.onend = () => onEnd && onEnd(); u.onerror = () => onEnd && onEnd(true);
        synth.speak(u);
      },
      pause() { synth.pause(); }, resume() { synth.resume(); }, cancel() { synth.cancel(); }
    };
  }

  function createSession(speech, onChange) {
    let book = null, page = 0, reading = false, paused = false, generation = 0;
    const notify = () => onChange && onChange(state());
    function state() { return { book: book && book.id, title: book && book.title, page, pages: book ? book.pages.length : 0, text: book ? book.pages[page] : '', reading, paused, canSpeak: !!speech }; }
    function silence() { generation++; reading = false; paused = false; if (speech) speech.cancel(); }
    function speakPage() {
      const mine = ++generation;
      speech.cancel();
      speech.speak(book.pages[page], failed => {
        if (mine !== generation || !reading) return;
        if (!failed && page < book.pages.length - 1) { page++; notify(); speakPage(); }
        else { reading = false; paused = false; notify(); }
      });
    }
    return {
      state,
      open(id) { const next = byId(id); if (!next) return false; silence(); book = next; page = 0; notify(); return true; },
      next() { if (!book || page >= book.pages.length - 1) return false; const keep = reading; silence(); page++; if (keep) { reading = true; speakPage(); } notify(); return true; },
      prev() { if (!book || page <= 0) return false; const keep = reading; silence(); page--; if (keep) { reading = true; speakPage(); } notify(); return true; },
      readAloud() { if (!book || !speech) return false; reading = true; paused = false; speakPage(); notify(); return true; },
      pause() { if (!reading || paused) return false; paused = true; speech.pause(); notify(); return true; },
      resume() { if (!reading || !paused) return false; paused = false; speech.resume(); notify(); return true; },
      stop() { silence(); notify(); },
      closeBook() { silence(); book = null; page = 0; notify(); }
    };
  }

  // The reading room overlay. It never stores anything and makes no requests.
  function mount(doc, win, hooks = {}) {
    const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const overlay = el('div'); overlay.id = 'libraryOverlay'; overlay.hidden = true;
    const sheet = el('section', 'library-sheet'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'libraryTitle');
    const title = el('h2', null, 'The Little Library'); title.id = 'libraryTitle';
    const intro = el('p', 'library-intro', 'Choose a book. Press Read to me to hear it out loud.');
    const shelf = el('div', 'library-shelf');
    for (const story of STORIES) {
      const b = el('button', 'library-book'); b.type = 'button'; b.dataset.story = story.id; b.style.setProperty('--cover', story.color);
      b.append(el('span', 'library-book-title', story.title), el('span', 'library-book-pages', story.pages.length + ' pages'));
      b.addEventListener('click', () => session.open(story.id)); shelf.appendChild(b);
    }
    const reader = el('div', 'library-reader'); reader.hidden = true;
    const bookTitle = el('h3', 'library-book-heading'), pageText = el('p', 'library-page'), pageCount = el('p', 'library-count');
    pageText.setAttribute('aria-live', 'polite');
    const nav = el('div', 'library-controls'), talk = el('div', 'library-controls');
    const btn = (label, fn, cls) => { const b = el('button', cls || null, label); b.type = 'button'; b.addEventListener('click', fn); return b; };
    const prevBtn = btn('◀ Back', () => session.prev()), nextBtn = btn('Next ▶', () => session.next());
    const readBtn = btn('🔊 Read to me', () => { const s = session.state(); if (!s.reading) session.readAloud(); else if (s.paused) session.resume(); else session.pause(); }, 'library-read');
    const stopBtn = btn('■ Stop', () => session.stop());
    const shelfBtn = btn('Choose another book', () => session.closeBook());
    const noVoice = el('p', 'library-note', 'This device cannot read aloud, but you can still read every page.');
    nav.append(prevBtn, nextBtn); talk.append(readBtn, stopBtn, shelfBtn);
    reader.append(bookTitle, pageText, pageCount, nav, talk, noVoice);
    const close = btn('Close the library', () => api.close(), 'library-close');
    sheet.append(title, intro, shelf, reader, close); overlay.appendChild(sheet); doc.body.appendChild(overlay);
    function paint(s) {
      const open = !!s.book;
      shelf.hidden = open; intro.hidden = open; reader.hidden = !open;
      if (!open) return;
      bookTitle.textContent = s.title; pageText.textContent = s.text; pageCount.textContent = 'Page ' + (s.page + 1) + ' of ' + s.pages;
      prevBtn.disabled = s.page === 0; nextBtn.disabled = s.page >= s.pages - 1;
      readBtn.hidden = stopBtn.hidden = !s.canSpeak; noVoice.hidden = s.canSpeak;
      readBtn.textContent = !s.reading ? '🔊 Read to me' : s.paused ? '▶ Keep reading' : '⏸ Pause';
      stopBtn.disabled = !s.reading;
    }
    const session = createSession(browserSpeech(win), paint);
    const api = {
      isOpen: () => !overlay.hidden,
      open() { if (!overlay.hidden) return; overlay.hidden = false; session.closeBook(); paint(session.state()); hooks.onOpen && hooks.onOpen(); (shelf.querySelector('button') || close).focus && (shelf.querySelector('button') || close).focus(); },
      close() { if (overlay.hidden) return; session.closeBook(); overlay.hidden = true; hooks.onClose && hooks.onClose(); },
      session
    };
    win.addEventListener('keydown', e => { if (!overlay.hidden && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api.close(); } }, true);
    return api;
  }
  root.MYNE_LIBRARY = Object.freeze({ STORIES, createSession, mount, browserSpeech });
})(globalThis);
