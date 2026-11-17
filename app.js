import { flatten, filterRows, sortRows, stateFromQuery, stateToQuery, facets, emptyState } from './lib.js';

const $ = id => document.getElementById(id);
const FIELDS = ['q', 'composer', 'performer', 'instrument', 'from', 'to', 'minLen', 'maxLen'];
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let rows = [], state = stateFromQuery(location.search), meetingCount = 0;

function fillSelect(id, entries) {
  const sel = $(id);
  for (const [name, n] of entries) sel.add(new Option(`${name} (${n})`, name));
}

function readControls() {
  for (const f of FIELDS) state[f] = $(f).value.trim();
  state.format = document.querySelector('input[name=format]:checked').value;
}

function writeControls() {
  for (const f of FIELDS) $(f).value = state[f];
  for (const r of document.querySelectorAll('input[name=format]')) r.checked = r.value === state.format;
}

function rowHtml(r) {
  const wip = r.wip ? ' <span class="badge" title="work in progress">WIP</span>' : '';
  const who = r.performers.map(p => `<li>${esc(p.name)} <span class="inst">${esc(p.instrument)}</span></li>`).join('');
  return `<tr>
    <td class="date" data-label="Date">${fmtDate(r.date)}</td>
    <td class="piece" data-label="Piece"><span class="title">${esc(r.piece)}</span>${wip}<span class="composer">${esc(r.composer)}</span></td>
    <td data-label="Performer"><ul class="performers">${who}</ul></td>
    <td class="num" data-label="Length">${esc(r.length || '—')}</td>
    <td data-label="Meeting"><span class="fmt ${r.format === 'Zoom' ? 'zoom' : 'live'}">${esc(r.format)}</span></td>
  </tr>`;
}

function render() {
  const shown = sortRows(filterRows(rows, state), state.sort, state.dir);
  $('rows').innerHTML = shown.map(rowHtml).join('');
  const meetings = new Set(shown.map(r => r.date)).size;
  $('count').textContent = `${shown.length} performance${shown.length === 1 ? '' : 's'} · ${meetings} meeting${meetings === 1 ? '' : 's'}`
    + (shown.length === rows.length ? '' : ` (of ${rows.length})`);
  $('empty').hidden = shown.length > 0;
  for (const b of document.querySelectorAll('th button')) {
    const th = b.parentElement;
    th.setAttribute('aria-sort', b.dataset.sort === state.sort ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  }
  const qs = stateToQuery(state);
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

async function init() {
  const res = await fetch('data/performances.json', { cache: 'no-cache' });
  const data = await res.json();
  rows = flatten(data);
  meetingCount = data.meetings.length;
  const f = facets(rows);
  fillSelect('composer', f.composers);
  fillSelect('performer', f.performers);
  fillSelect('instrument', f.instruments);
  $('updated').textContent = `${meetingCount} meetings · last updated ${fmtDate(data.updated)}`;
  writeControls();
  render();
}

document.querySelector('.search').addEventListener('input', () => { readControls(); render(); });
document.querySelector('.search').addEventListener('change', () => { readControls(); render(); });
$('clear').addEventListener('click', () => {
  state = { ...emptyState(), sort: state.sort, dir: state.dir };
  writeControls(); render(); $('q').focus();
});
for (const b of document.querySelectorAll('th button')) {
  b.addEventListener('click', () => {
    const k = b.dataset.sort;
    if (state.sort === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    else { state.sort = k; state.dir = k === 'date' || k === 'minutes' ? 'desc' : 'asc'; }
    render();
  });
}
document.querySelector('.filters-toggle').addEventListener('click', e => {
  const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
  e.currentTarget.setAttribute('aria-expanded', String(open));
  $('filters').classList.toggle('open', open);
});

init().catch(err => {
  $('count').textContent = 'Sorry, the archive could not be loaded.';
  console.error(err);
});
