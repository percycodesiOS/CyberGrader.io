/* A separate visual preference: never reads or writes a saved world. */
(() => {
  const button = document.getElementById('motionToggle');
  if (!button) return;
  const key = 'mynecraft_ui_motion';
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let preference;
  try { preference = localStorage.getItem(key); } catch {}
  let enabled = preference === 'on' || (preference !== 'off' && !media?.matches);
  function render() {
    document.body.dataset.motion = enabled ? 'on' : 'off';
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? 'Motion: on' : 'Motion: off';
    button.title = enabled ? 'Pause interface animations' : 'Turn on the pulsing first-time-player invitation';
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    preference = enabled ? 'on' : 'off';
    try { localStorage.setItem(key, preference); } catch {}
    render();
  });
  media?.addEventListener?.('change', event => {
    if (preference === 'on' || preference === 'off') return;
    enabled = !event.matches;
    render();
  });
  render();
  const stage = document.querySelector('.teacher-stage');
  const subjectLines = {
    macek: 'DESIGN · BUILD · TEST',
    micco: 'IMAGINE · MAKE · CREATE',
    eriksen: 'SKETCH · PAINT · EXPLORE',
    mullet: 'MOVE · PLAY · TEAMWORK',
    wingenbach: 'FIND YOUR RHYTHM',
    mcmichael: '¡VAMOS A EXPLORAR!'
  };
  function renderTeacher() {
    if (!stage) return;
    const selected = document.querySelector('input[name="teacher"]:checked, input[name="playerCharacter"]:checked');
    if (!selected) return;
    const card = selected.closest('label');
    const portrait = card?.querySelector('img');
    const name = card?.querySelector('.ts-name, .staff-choice-name strong');
    const role = card?.querySelector('.ts-role, .staff-role');
    if (!portrait || !name || !role) return;
    stage.dataset.teacher = selected.value;
    stage.querySelector('.stage-kicker').textContent = subjectLines[selected.value] || 'READY TO EXPLORE';
    const stagePortrait = stage.querySelector('.stage-portrait');
    stagePortrait.src = portrait.src;
    stage.querySelector('.stage-name').textContent = name.textContent;
    stage.querySelector('.stage-role').textContent = role.textContent;
    if (enabled) stagePortrait.animate?.([{opacity:.25,transform:'translateY(12px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'});
  }
  document.addEventListener('change', event => {
    if (event.target.matches?.('input[name="teacher"], input[name="playerCharacter"], #mode')) renderTeacher();
  });
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-teacher], #menuToggle, #changeCharacter')) queueMicrotask(renderTeacher);
  });
  window.addEventListener('load', renderTeacher);
  renderTeacher();
})();
