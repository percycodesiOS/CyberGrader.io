// Sample-only hall pass model. Pure data logic: no DOM, storage, or network.
// Browser storage transactions and Web Locks are handled by the app layer.

const STUDENT_LETTERS = 'abcdefghijkl';

export const STUDENTS = Object.freeze(
  Array.from(STUDENT_LETTERS, (letter, index) =>
    Object.freeze({
      id: `sample-${letter}`,
      label: `Sample student ${letter.toUpperCase()}`,
      homeroom: index < 6 ? 'Sample homeroom 1' : 'Sample homeroom 2',
    }),
  ),
);

export const DESTINATIONS = Object.freeze(['CIRC', 'ECTV']);
export const STORAGE_KEY = 'circ-hall-pass-demo-v1';

const STATE_VERSION = 1;
const PASS_MIN = 1;
const PASS_MAX = 100;
const MAX_TRIPS = 200;
const MAX_COMPLETED_TRIPS = 100;
const MAX_ID_LENGTH = 100;

const STATE_KEYS = ['revision', 'trips', 'version'];
const TRIP_KEYS = ['destination', 'id', 'issuedAt', 'pass', 'returnedAt', 'studentId'];
const STUDENT_IDS = new Set(STUDENTS.map((student) => student.id));
const DESTINATION_SET = new Set(DESTINATIONS);
const PASS_PATTERN = /^(?:CIRC-)?(\d{1,3})$/i;
const CANONICAL_PASS_PATTERN = /^CIRC-\d{3}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, expectedSortedKeys) {
  const keys = Object.keys(value).sort();
  if (keys.length !== expectedSortedKeys.length) return false;
  return keys.every((key, index) => key === expectedSortedKeys[index]);
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeId(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH &&
    SAFE_ID_PATTERN.test(value)
  );
}

function isCanonicalPass(value) {
  if (typeof value !== 'string' || !CANONICAL_PASS_PATTERN.test(value)) return false;
  const number = Number(value.slice(5));
  return number >= PASS_MIN && number <= PASS_MAX;
}

function formatPass(number) {
  return `CIRC-${String(number).padStart(3, '0')}`;
}

export function createState() {
  return { version: STATE_VERSION, revision: 0, trips: [] };
}

export function normalizePass(raw) {
  let number;
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) fail('Pass number must be a whole number.');
    number = raw;
  } else if (typeof raw === 'string') {
    const match = PASS_PATTERN.exec(raw.trim());
    if (!match) fail('Pass must look like 1, 001, or CIRC-001.');
    number = Number(match[1]);
  } else {
    fail('Pass must be a string or number.');
  }
  if (number < PASS_MIN || number > PASS_MAX) {
    fail(`Pass must be between ${PASS_MIN} and ${PASS_MAX}.`);
  }
  return formatPass(number);
}

function validateTrip(raw, index) {
  const where = `Trip ${index}`;
  if (!isPlainObject(raw)) fail(`${where} must be an object.`);
  if (!hasExactKeys(raw, TRIP_KEYS)) fail(`${where} has missing or unknown fields.`);
  const { id, pass, studentId, destination, issuedAt, returnedAt } = raw;
  if (!isSafeId(id)) fail(`${where} has an invalid id.`);
  if (!isCanonicalPass(pass)) fail(`${where} has an invalid pass.`);
  if (typeof studentId !== 'string' || !STUDENT_IDS.has(studentId)) {
    fail(`${where} has an unknown student.`);
  }
  if (typeof destination !== 'string' || !DESTINATION_SET.has(destination)) {
    fail(`${where} has an unknown destination.`);
  }
  if (!isPositiveSafeInteger(issuedAt)) fail(`${where} has an invalid issue time.`);
  if (returnedAt !== null) {
    if (!isPositiveSafeInteger(returnedAt)) fail(`${where} has an invalid return time.`);
    if (returnedAt < issuedAt) fail(`${where} was returned before it was issued.`);
  }
  return { id, pass, studentId, destination, issuedAt, returnedAt };
}

export function validateState(raw) {
  if (!isPlainObject(raw)) fail('State must be an object.');
  if (!hasExactKeys(raw, STATE_KEYS)) fail('State has missing or unknown fields.');
  if (raw.version !== STATE_VERSION) fail('Unsupported state version.');
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 0) {
    fail('State revision must be a non-negative whole number.');
  }
  if (!Array.isArray(raw.trips)) fail('State trips must be an array.');
  if (raw.trips.length > MAX_TRIPS) fail(`State may not hold more than ${MAX_TRIPS} trips.`);

  const tripIds = new Set();
  const activePasses = new Set();
  const activeStudents = new Set();
  const trips = raw.trips.map((trip, index) => {
    const clean = validateTrip(trip, index);
    if (tripIds.has(clean.id)) fail('Duplicate trip id.');
    tripIds.add(clean.id);
    if (clean.returnedAt === null) {
      if (activePasses.has(clean.pass)) fail('A pass may only have one active trip.');
      if (activeStudents.has(clean.studentId)) fail('A student may only have one active trip.');
      activePasses.add(clean.pass);
      activeStudents.add(clean.studentId);
    }
    return clean;
  });

  return { version: STATE_VERSION, revision: raw.revision, trips };
}

export function parseState(text) {
  if (text === null) return createState();
  if (typeof text !== 'string') fail('Stored state must be text.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail('Stored state is corrupted.');
  }
  return validateState(data);
}

function requireTime(now) {
  if (!isPositiveSafeInteger(now)) fail('Time must be a positive whole number.');
  return now;
}

function nextRevision(state) {
  const revision = state.revision + 1;
  if (!Number.isSafeInteger(revision)) fail('State revision overflow.');
  return revision;
}

function pruneTrips(trips) {
  const completed = [];
  trips.forEach((trip, index) => {
    if (trip.returnedAt !== null) completed.push({ trip, index });
  });
  if (completed.length <= MAX_COMPLETED_TRIPS) return trips;
  completed.sort(
    (a, b) =>
      b.trip.returnedAt - a.trip.returnedAt ||
      b.trip.issuedAt - a.trip.issuedAt ||
      b.index - a.index,
  );
  const keep = new Set(completed.slice(0, MAX_COMPLETED_TRIPS).map((entry) => entry.index));
  return trips.filter((trip, index) => trip.returnedAt === null || keep.has(index));
}

function createTripId(trips, now, revision) {
  const used = new Set(trips.map((trip) => trip.id));
  const base = `trip-${now}-${revision}`;
  let id = base;
  for (let suffix = 1; used.has(id); suffix += 1) id = `${base}-${suffix}`;
  return id;
}

export function issuePass(state, request, now = Date.now()) {
  const current = validateState(state);
  if (!isPlainObject(request)) fail('Pass request must be an object.');
  if (request.approved !== true) fail('Staff approval is required to issue a pass.');
  const pass = normalizePass(request.pass);
  const { studentId, destination } = request;
  if (typeof studentId !== 'string' || !STUDENT_IDS.has(studentId)) fail('Unknown student.');
  if (typeof destination !== 'string' || !DESTINATION_SET.has(destination)) {
    fail('Unknown destination.');
  }
  const issuedAt = requireTime(now);

  for (const trip of current.trips) {
    if (trip.returnedAt !== null) continue;
    if (trip.pass === pass) fail(`${pass} is already out.`);
    if (trip.studentId === studentId) fail('That student already has an active pass.');
  }

  const revision = nextRevision(current);
  const trip = {
    id: createTripId(current.trips, issuedAt, revision),
    pass,
    studentId,
    destination,
    issuedAt,
    returnedAt: null,
  };
  return validateState({
    version: STATE_VERSION,
    revision,
    trips: pruneTrips([...current.trips, trip]),
  });
}

export function returnPass(state, tripId, now = Date.now()) {
  const current = validateState(state);
  const index = current.trips.findIndex((trip) => trip.id === tripId);
  if (index === -1) fail('Unknown trip.');
  const trip = current.trips[index];
  if (trip.returnedAt !== null) return current;

  const returnedAt = requireTime(now);
  if (returnedAt < trip.issuedAt) fail('Return time cannot be before the issue time.');

  const trips = current.trips.map((entry, position) =>
    position === index ? { ...entry, returnedAt } : entry,
  );
  return validateState({
    version: STATE_VERSION,
    revision: nextRevision(current),
    trips: pruneTrips(trips),
  });
}

export function getActive(state) {
  return validateState(state).trips.filter((trip) => trip.returnedAt === null);
}
