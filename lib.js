// Pure search / filter / URL-state helpers for the repertoire archive.

const KEYS = ['q', 'composer', 'performer', 'instrument', 'format', 'from', 'to', 'minLen', 'maxLen', 'sort', 'dir'];
const DEFAULTS = { sort: 'date', dir: 'desc' };

export function emptyState() {
  return { q: '', composer: '', performer: '', instrument: '', format: '', from: '', to: '',
           minLen: '', maxLen: '', ...DEFAULTS };
}

export function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function flatten(data) {
  const rows = [];
  for (const m of data.meetings) {
    for (const p of m.performances) {
      rows.push({ ...p, date: m.date, format: m.format, venue: m.venue ?? null,
                  _piece: normalize(p.piece), _composer: normalize(p.composer) });
    }
  }
  return rows;
}

export function filterRows(rows, st) {
  const q = normalize(st.q);
  const lenSet = st.minLen !== '' || st.maxLen !== '';
  const min = st.minLen === '' ? -Infinity : Number(st.minLen);
  const max = st.maxLen === '' ? Infinity : Number(st.maxLen);
  return rows.filter(r =>
    (!q || r._piece.includes(q)) &&
    (!st.composer || r.composer === st.composer) &&
    (!st.performer || r.performers.some(p => p.name === st.performer)) &&
    (!st.instrument || r.performers.some(p => p.instrument === st.instrument)) &&
    (!st.format || r.format === st.format) &&
    (!st.from || r.date >= st.from) &&
    (!st.to || r.date <= st.to) &&
    (!lenSet || (r.minutes != null && r.minutes >= min && r.minutes <= max)));
}

const SORTERS = {
  date: r => r.date,
  piece: r => r._piece,
  composer: r => r._composer,
  performer: r => normalize(r.performers[0]?.name),
  instrument: r => r.performers.map(p => p.instrument).join(','),
  minutes: r => r.minutes ?? -1,
  format: r => r.format,
};

export function sortRows(rows, key = 'date', dir = 'desc') {
  const f = SORTERS[key] || SORTERS.date;
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = f(a), y = f(b);
    if (x < y) return -sign;
    if (x > y) return sign;
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; // tie: newest first
  });
}

export function stateFromQuery(qs) {
  const p = new URLSearchParams(qs);
  const st = emptyState();
  for (const k of KEYS) if (p.has(k)) st[k] = p.get(k);
  return st;
}

export function stateToQuery(st) {
  const p = new URLSearchParams();
  const base = emptyState();
  for (const k of KEYS) if (st[k] && st[k] !== base[k]) p.set(k, st[k]);
  return p.toString();
}

function counted(values) {
  const m = new Map();
  for (const v of values) m.set(v, (m.get(v) || 0) + 1);
  return [...m].sort((a, b) => normalize(a[0]).localeCompare(normalize(b[0])));
}

export function facets(rows) {
  return {
    composers: counted(rows.map(r => r.composer)),
    performers: counted(rows.flatMap(r => [...new Set(r.performers.map(p => p.name))])),
    instruments: counted(rows.flatMap(r => [...new Set(r.performers.map(p => p.instrument))])),
  };
}
