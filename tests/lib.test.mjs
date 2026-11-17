import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, flatten, filterRows, sortRows, stateFromQuery, stateToQuery, facets, emptyState } from '../lib.js';

const perf = (piece, composer, performers, minutes) => ({
  piece, composer, minutes, length: '', wip: false, original: piece,
  performers: performers.map(([name, instrument]) => ({ name, instrument })),
});
const data = { meetings: [
  { date: '2026-09-12', format: 'Zoom', venue: null, performances: [
    perf('Gnossienne No. 1', 'Erik Satie', [['Lorne W.', 'Piano']], 3),
    perf('Hallelujah', 'Leonard Cohen', [['Kathleen B.', 'Piano'], ['Kaylene D.', 'Violin']], 3.5),
  ]},
  { date: '2026-11-14', format: 'In person', venue: 'Steinway', performances: [
    perf('Prelude in A minor, Op. 28 No. 2', 'Frédéric Chopin', [['Helen L.', 'Piano']], 2),
    perf('Mary Had a Little Lamb', 'Traditional', [['Barbara L.', 'Piano']], 0.5),
    perf('Étude in E major, Op. 10 No. 3', 'Frédéric Chopin', [['Nami P.', 'Piano']], null),
  ]},
]};
const rows = flatten(data);
const run = (over) => filterRows(rows, { ...emptyState(), ...over }).map(r => r.piece);

test('normalize strips accents, case, punctuation, spaces', () => {
  assert.equal(normalize('1ère Gnossienne'), '1eregnossienne');
  assert.equal(normalize('Op. 28'), 'op28');
});

test('flatten copies meeting fields onto rows', () => {
  assert.equal(rows.length, 5);
  assert.equal(rows[0].date, '2026-09-12');
  assert.equal(rows[0].format, 'Zoom');
  assert.equal(rows[2].venue, 'Steinway');
});

test('search ignores accents and punctuation', () => {
  assert.deepEqual(run({ q: 'gnossienne' }), ['Gnossienne No. 1']);
  assert.deepEqual(run({ q: 'op 28' }), ['Prelude in A minor, Op. 28 No. 2']);
  assert.deepEqual(run({ q: 'op28' }), ['Prelude in A minor, Op. 28 No. 2']);
  assert.deepEqual(run({ q: 'etude' }), ['Étude in E major, Op. 10 No. 3']);
});

test('composer filter is exact', () => {
  assert.equal(run({ composer: 'Frédéric Chopin' }).length, 2);
});

test('performer and instrument match any performer of a duet', () => {
  assert.deepEqual(run({ performer: 'Kaylene D.' }), ['Hallelujah']);
  assert.deepEqual(run({ instrument: 'Violin' }), ['Hallelujah']);
  assert.equal(run({ instrument: 'Piano' }).length, 5);
});

test('date range is inclusive', () => {
  assert.equal(run({ from: '2026-09-12', to: '2026-09-12' }).length, 2);
  assert.equal(run({ from: '2026-11-14' }).length, 3);
});

test('format filter', () => {
  assert.equal(run({ format: 'Zoom' }).length, 2);
  assert.equal(run({ format: 'In person' }).length, 3);
});

test('length range; null minutes shown only without a length filter', () => {
  assert.equal(run({}).length, 5);
  assert.deepEqual(run({ minLen: '0', maxLen: '1' }), ['Mary Had a Little Lamb']);
  assert.ok(!run({ minLen: '0' }).includes('Étude in E major, Op. 10 No. 3'));
});

test('sort by piece ignores accents; default date desc', () => {
  const s = sortRows(rows, 'piece', 'asc').map(r => r.piece);
  assert.deepEqual(s.slice(0, 2), ['Étude in E major, Op. 10 No. 3', 'Gnossienne No. 1']);
  assert.equal(sortRows(rows, 'date', 'desc')[0].date, '2026-11-14');
});

test('state round-trips through the query string; defaults omitted', () => {
  const st = { ...emptyState(), q: 'bach', instrument: 'Violin', format: 'Zoom', from: '2026-09-01', sort: 'piece', dir: 'asc' };
  const qs = stateToQuery(st);
  assert.deepEqual(stateFromQuery(qs), st);
  assert.equal(stateToQuery(emptyState()), '');
});

test('facets count entries per value, sorted by name', () => {
  const f = facets(rows);
  assert.deepEqual(f.composers[0], ['Erik Satie', 1]);
  assert.deepEqual(f.composers.find(c => c[0] === 'Frédéric Chopin'), ['Frédéric Chopin', 2]);
  assert.deepEqual(f.instruments, [['Piano', 5], ['Violin', 1]]);
  assert.equal(f.performers.length, 6);
});

test('sort by meeting format', () => {
  assert.equal(sortRows(rows, 'format', 'asc')[0].format, 'In person');
  assert.equal(sortRows(rows, 'format', 'desc')[0].format, 'Zoom');
});
