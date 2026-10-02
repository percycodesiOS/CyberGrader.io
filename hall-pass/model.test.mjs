import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDENTS,
  DESTINATIONS,
  STORAGE_KEY,
  createState,
  normalizePass,
  validateState,
  parseState,
  issuePass,
  returnPass,
  getActive,
} from './model.mjs';

const ALL_PASSES = Array.from({ length: 100 }, (_, i) => normalizePass(i + 1));

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function request(overrides = {}) {
  return { pass: 1, studentId: 'sample-a', destination: 'CIRC', approved: true, ...overrides };
}

function trip(overrides = {}) {
  return {
    id: 'trip-1',
    pass: 'CIRC-001',
    studentId: 'sample-a',
    destination: 'CIRC',
    issuedAt: 1000,
    returnedAt: null,
    ...overrides,
  };
}

function stateWith(trips, overrides = {}) {
  return { version: 1, revision: 0, trips, ...overrides };
}

test('fixed constants and sample roster', () => {
  assert.equal(STORAGE_KEY, 'circ-hall-pass-demo-v1');
  assert.deepEqual([...DESTINATIONS], ['CIRC', 'ECTV']);
  assert.equal(STUDENTS.length, 12);
  const letters = 'abcdefghijkl';
  STUDENTS.forEach((student, i) => {
    assert.deepEqual({ ...student }, {
      id: `sample-${letters[i]}`,
      label: `Sample student ${letters[i].toUpperCase()}`,
      homeroom: i < 6 ? 'Sample homeroom 1' : 'Sample homeroom 2',
    });
  });
  assert.deepEqual(createState(), { version: 1, revision: 0, trips: [] });
  assert.notEqual(createState(), createState());
});

test('normalizePass accepts exact formats and boundaries', () => {
  const valid = [
    [1, 'CIRC-001'],
    ['1', 'CIRC-001'],
    ['01', 'CIRC-001'],
    ['001', 'CIRC-001'],
    ['CIRC-001', 'CIRC-001'],
    ['circ-001', 'CIRC-001'],
    ['  Circ-001  ', 'CIRC-001'],
    ['CIRC-1', 'CIRC-001'],
    [42, 'CIRC-042'],
    ['099', 'CIRC-099'],
    [100, 'CIRC-100'],
    ['100', 'CIRC-100'],
    ['CIRC-100', 'CIRC-100'],
  ];
  for (const [input, expected] of valid) {
    assert.equal(normalizePass(input), expected, `input ${JSON.stringify(input)}`);
  }
});

test('normalizePass rejects out-of-range and malformed input', () => {
  const invalid = [
    0, 101, -1, 1.5, NaN, Infinity, -0.5,
    '0', '000', '101', 'CIRC-000', 'CIRC-101', '1000', '0001', 'CIRC-0001',
    '', '   ', '1.5', '1.0', '-1', '+1', '1e2', '0x1', 'one',
    'CIRC001', 'CIRC-', 'CIRC- 001', 'CIRC--001', 'ECTV-001', 'XCIRC-001', 'CIRC-001x',
    '<b>1</b>', null, undefined, true, {}, [], [1],
  ];
  for (const input of invalid) {
    assert.throws(() => normalizePass(input), Error, `input ${String(input)}`);
  }
});

test('issuing requires explicit approval', () => {
  const state = createState();
  for (const approved of [false, undefined, null, 'true', 1, 'yes']) {
    assert.throws(() => issuePass(state, request({ approved }), 1000), /approval/i);
  }
  const { approved, ...noApproval } = request();
  assert.throws(() => issuePass(state, noApproval, 1000), /approval/i);
  assert.deepEqual(state, createState());
});

test('issuePass creates a validated active trip and bumps revision', () => {
  const next = issuePass(createState(), request({ pass: ' circ-007 ', destination: 'ECTV' }), 5000);
  assert.equal(next.revision, 1);
  assert.equal(next.trips.length, 1);
  const [created] = next.trips;
  assert.equal(created.pass, 'CIRC-007');
  assert.equal(created.studentId, 'sample-a');
  assert.equal(created.destination, 'ECTV');
  assert.equal(created.issuedAt, 5000);
  assert.equal(created.returnedAt, null);
  assert.equal(typeof created.id, 'string');
  assert.deepEqual(Object.keys(created).sort(),
    ['destination', 'id', 'issuedAt', 'pass', 'returnedAt', 'studentId']);
  assert.deepEqual(validateState(next), next);
  assert.deepEqual(getActive(next), next.trips);
});

test('rejects duplicate active pass and duplicate active learner', () => {
  const state = issuePass(createState(), request(), 1000);
  assert.throws(
    () => issuePass(state, request({ studentId: 'sample-b', pass: 'CIRC-001' }), 2000),
    /already out/i,
  );
  assert.throws(
    () => issuePass(state, request({ studentId: 'sample-b', pass: '001' }), 2000),
    /already out/i,
  );
  assert.throws(
    () => issuePass(state, request({ studentId: 'sample-a', pass: 2 }), 2000),
    /student/i,
  );
  const other = issuePass(state, request({ studentId: 'sample-b', pass: 2 }), 2000);
  assert.equal(getActive(other).length, 2);
});

test('rejects unknown pass, learner, destination, and bad time on issue', () => {
  const state = createState();
  for (const pass of [0, 101, 'abc', '', null]) {
    assert.throws(() => issuePass(state, request({ pass }), 1000), Error);
  }
  for (const studentId of ['sample-m', 'Sample-A', 'sample-a ', '', null, 'Jane Doe', '<img>']) {
    assert.throws(() => issuePass(state, request({ studentId }), 1000), /student/i);
  }
  for (const destination of ['circ', 'GYM', '', null, 'CIRC ']) {
    assert.throws(() => issuePass(state, request({ destination }), 1000), /destination/i);
  }
  for (const now of [0, -1, 1.5, NaN, Infinity, '1000', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => issuePass(state, request(), now), /time/i);
  }
  assert.throws(() => issuePass(state, null, 1000), Error);
  assert.throws(() => issuePass(state, 'pass 1', 1000), Error);
});

test('issue, return, and reissue the same pass repeatedly', () => {
  let state = createState();
  let now = 1000;
  const ids = new Set();
  for (let round = 0; round < 6; round += 1) {
    const studentId = STUDENTS[round % STUDENTS.length].id;
    state = issuePass(state, request({ pass: 'CIRC-055', studentId }), now);
    const [active] = getActive(state);
    assert.equal(active.pass, 'CIRC-055');
    assert.equal(active.studentId, studentId);
    ids.add(active.id);
    now += 10;
    state = returnPass(state, active.id, now);
    assert.equal(getActive(state).length, 0);
    now += 10;
  }
  assert.equal(ids.size, 6);
  assert.equal(state.trips.length, 6);
  assert.equal(state.revision, 12);
  state.trips.forEach((t) => assert.ok(t.returnedAt >= t.issuedAt));
});

test('rapid repeated return is idempotent', () => {
  const issued = issuePass(createState(), request(), 1000);
  const tripId = issued.trips[0].id;
  const returned = returnPass(issued, tripId, 1000);
  assert.equal(returned.revision, 2);
  assert.equal(returned.trips[0].returnedAt, 1000);

  const again = returnPass(returned, tripId, 2000);
  assert.deepEqual(again, returned);
  assert.notEqual(again, returned);
  assert.notEqual(again.trips, returned.trips);
  assert.equal(again.trips[0].returnedAt, 1000);

  let repeated = again;
  for (let i = 0; i < 10; i += 1) repeated = returnPass(repeated, tripId, 3000 + i);
  assert.deepEqual(repeated, returned);
});

test('returnPass rejects unknown trip ids and times before issue', () => {
  const issued = issuePass(createState(), request(), 5000);
  const tripId = issued.trips[0].id;
  for (const badId of ['nope', '', null, undefined, 42]) {
    assert.throws(() => returnPass(issued, badId, 6000), /unknown trip/i);
  }
  assert.throws(() => returnPass(issued, tripId, 4999), /before/i);
  for (const now of [0, -1, 1.5, NaN]) {
    assert.throws(() => returnPass(issued, tripId, now), /time/i);
  }
  assert.equal(getActive(issued).length, 1);
});

test('inputs are never mutated', () => {
  const base = issuePass(createState(), request({ pass: 3, studentId: 'sample-c' }), 1000);
  const frozenState = deepFreeze(structuredClone(base));
  const snapshot = JSON.stringify(frozenState);
  const frozenRequest = deepFreeze(request({ pass: 4, studentId: 'sample-d' }));
  const requestSnapshot = JSON.stringify(frozenRequest);

  const issued = issuePass(frozenState, frozenRequest, 2000);
  assert.equal(JSON.stringify(frozenState), snapshot);
  assert.equal(JSON.stringify(frozenRequest), requestSnapshot);
  assert.equal(issued.trips.length, 2);

  const returned = returnPass(frozenState, frozenState.trips[0].id, 3000);
  assert.equal(JSON.stringify(frozenState), snapshot);
  assert.equal(returned.trips[0].returnedAt, 3000);

  getActive(frozenState);
  validateState(frozenState);
  assert.equal(JSON.stringify(frozenState), snapshot);

  const validated = validateState(base);
  validated.trips[0].pass = 'CIRC-099';
  validated.trips.push('junk');
  assert.equal(base.trips[0].pass, 'CIRC-003');
  assert.equal(base.trips.length, 1);
});

test('parseState handles empty storage, valid JSON, and corruption', () => {
  assert.deepEqual(parseState(null), createState());
  const state = issuePass(createState(), request(), 1000);
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  for (const text of ['', '{', 'undefined', 'not json', '{"version":1,', 'null', '[]', '42', '"x"', '{}']) {
    assert.throws(() => parseState(text), Error, `text ${text}`);
  }
  for (const value of [undefined, 42, {}, []]) {
    assert.throws(() => parseState(value), Error);
  }
  assert.throws(
    () => parseState('{"version":1,"revision":0,"trips":[],"__proto__":{"x":1}}'),
    /unknown/i,
  );
});

test('validateState rejects invalid or unknown schema', () => {
  const ok = stateWith([trip()]);
  assert.deepEqual(validateState(ok), ok);

  const bad = [
    null, undefined, 'state', 1, [], new Date(0),
    { version: 1, revision: 0 },
    { version: 1, trips: [] },
    { revision: 0, trips: [] },
    stateWith([], { extra: true }),
    stateWith([], { version: 2 }),
    stateWith([], { version: '1' }),
    stateWith([], { version: 0 }),
    stateWith([], { revision: -1 }),
    stateWith([], { revision: 1.5 }),
    stateWith([], { revision: '0' }),
    stateWith([], { revision: NaN }),
    stateWith([], { revision: Number.MAX_SAFE_INTEGER + 2 }),
    { version: 1, revision: 0, trips: {} },
    { version: 1, revision: 0, trips: null },
    stateWith([null]),
    stateWith(['trip']),
    stateWith([[]]),
    stateWith([trip({ name: 'Real Person' })]),
    stateWith([trip({ note: '<script>alert(1)</script>' })]),
    stateWith([(() => { const t = trip(); delete t.returnedAt; return t; })()]),
    stateWith([(() => { const t = trip(); delete t.id; return t; })()]),
    stateWith([trip({ id: '' })]),
    stateWith([trip({ id: 'a'.repeat(101) })]),
    stateWith([trip({ id: '<script>' })]),
    stateWith([trip({ id: 'has space' })]),
    stateWith([trip({ id: 7 })]),
    stateWith([trip({ pass: 'circ-001' })]),
    stateWith([trip({ pass: 'CIRC-1' })]),
    stateWith([trip({ pass: '001' })]),
    stateWith([trip({ pass: 1 })]),
    stateWith([trip({ pass: 'CIRC-000' })]),
    stateWith([trip({ pass: 'CIRC-101' })]),
    stateWith([trip({ studentId: 'sample-m' })]),
    stateWith([trip({ studentId: 'Jane Doe' })]),
    stateWith([trip({ destination: 'GYM' })]),
    stateWith([trip({ destination: 'circ' })]),
    stateWith([trip({ issuedAt: 0 })]),
    stateWith([trip({ issuedAt: -5 })]),
    stateWith([trip({ issuedAt: 1.5 })]),
    stateWith([trip({ issuedAt: '1000' })]),
    stateWith([trip({ issuedAt: null })]),
    stateWith([trip({ returnedAt: 999 })]),
    stateWith([trip({ returnedAt: 0 })]),
    stateWith([trip({ returnedAt: 1000.5 })]),
    stateWith([trip({ returnedAt: undefined })]),
    stateWith([trip({ returnedAt: '2000' })]),
    stateWith([trip({ id: 'dup', returnedAt: 2000 }), trip({ id: 'dup', pass: 'CIRC-002', studentId: 'sample-b', returnedAt: 3000 })]),
    stateWith([trip({ id: 'x1' }), trip({ id: 'x2', studentId: 'sample-b' })]),
    stateWith([trip({ id: 'x1' }), trip({ id: 'x2', pass: 'CIRC-002' })]),
  ];
  bad.forEach((raw, index) => {
    assert.throws(() => validateState(raw), Error, `case ${index}`);
  });
});

test('validateState allows completed history reuse and caps trip count at 200', () => {
  const reuse = stateWith([
    trip({ id: 'a1', returnedAt: 1000 }),
    trip({ id: 'a2', issuedAt: 2000, returnedAt: 2500 }),
    trip({ id: 'a3', issuedAt: 3000 }),
  ]);
  assert.deepEqual(validateState(reuse), reuse);

  const makeTrips = (count) =>
    Array.from({ length: count }, (_, i) =>
      trip({ id: `t-${i}`, pass: ALL_PASSES[i % 100], issuedAt: i + 1, returnedAt: i + 2 }),
    );
  assert.equal(validateState(stateWith(makeTrips(200))).trips.length, 200);
  assert.throws(() => validateState(stateWith(makeTrips(201))), /200/);
});

test('completed history is pruned to 100 most recent and active trips are preserved', () => {
  let state = issuePass(createState(), request({ pass: 1, studentId: 'sample-a' }), 1);
  const oldActiveId = state.trips[0].id;
  let now = 10;
  const completedIds = [];
  for (let cycle = 0; cycle < 130; cycle += 1) {
    state = issuePass(state, request({ pass: 2, studentId: 'sample-b', destination: 'ECTV' }), now);
    const active = getActive(state).find((t) => t.studentId === 'sample-b');
    completedIds.push(active.id);
    now += 1;
    state = returnPass(state, active.id, now);
    now += 1;
  }

  const completed = state.trips.filter((t) => t.returnedAt !== null);
  const active = getActive(state);
  assert.equal(completed.length, 100);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, oldActiveId);
  assert.equal(active[0].issuedAt, 1);
  assert.equal(state.trips.length, 101);
  assert.deepEqual(completed.map((t) => t.id), completedIds.slice(30));
  assert.equal(state.revision, 261);

  state = returnPass(state, oldActiveId, now);
  assert.equal(getActive(state).length, 0);
  const remaining = state.trips.filter((t) => t.returnedAt !== null);
  assert.equal(remaining.length, 100);
  assert.ok(remaining.some((t) => t.id === oldActiveId));
  assert.ok(!remaining.some((t) => t.id === completedIds[30]));
});

test('available plus active always totals 100 passes', () => {
  let state = createState();
  let now = 1000;
  const check = () => {
    const activePasses = new Set(getActive(state).map((t) => t.pass));
    const available = ALL_PASSES.filter((p) => !activePasses.has(p));
    assert.equal(available.length + activePasses.size, 100);
    assert.equal(activePasses.size, getActive(state).length);
  };
  check();
  STUDENTS.forEach((student, i) => {
    state = issuePass(state, request({ pass: 100 - i, studentId: student.id }), now++);
    check();
  });
  assert.equal(getActive(state).length, 12);
  assert.throws(() => issuePass(state, request({ pass: 50, studentId: 'sample-a' }), now++), /student/i);

  for (const t of getActive(state).slice(0, 5)) {
    state = returnPass(state, t.id, now++);
    check();
  }
  assert.equal(getActive(state).length, 7);
});

test('generated trip ids are unique and safe', () => {
  let state = createState();
  const ids = new Set();
  for (let i = 0; i < 40; i += 1) {
    state = issuePass(state, request({ pass: (i % 100) + 1, studentId: 'sample-l' }), 7777);
    const [active] = getActive(state);
    assert.match(active.id, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/);
    assert.ok(!ids.has(active.id));
    ids.add(active.id);
    state = returnPass(state, active.id, 7777);
  }
  assert.equal(ids.size, 40);
});
