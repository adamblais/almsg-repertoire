# ALMSG Repertoire Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Static GitHub Pages site for searching past ALMSG performances, plus the tools and instructions the bi-weekly scheduled task uses to add new programs.

**Architecture:** `data/performances.json` is loaded by `app.js` in the browser. Pure search/filter functions live in `lib.js` (an ES module, tested with `node --test`). Python tools turn a Gmail RAW message into program text and validate the data file.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Google Fonts (Cormorant Garamond, EB Garamond), Python 3 stdlib, Node built-in test runner. No dependencies.

**Spec:** `docs/design.md`

## Global Constraints

- No surnames anywhere: performer display = first name + last initial ("Helen L."), or first name only if unknown.
- `index.html` has `<meta name="robots" content="noindex, nofollow">`; `robots.txt` = `User-agent: *` / `Disallow: /`.
- Instrument is per performer; missing → "Piano"; names title-cased.
- `format` ∈ {"In person", "Zoom"}. No Primary/Secondary field.
- Each performance keeps `original` (the program line, with surnames never added).
- Data starts September 2026.

## Review Focus

- Accented / punctuated titles: "gnossienne" must find "1ère Gnossienne"; "op 28" and "op28" must find "Op. 28 No. 2" (lib tests).
- Duets: filtering by performer or instrument matches if any performer matches (lib tests).
- Length "~ 3-4 mn" → minutes 3.5, "30 sec" → 0.5, missing length → `minutes: null`, which still shows when no length filter is set (lib + validate tests).
- Program line with an unresolvable instrument split → `check: true`, reported by validate (validate test).
- Shared URL with filters restores the same view on load (lib test for state ↔ query string round trip).

---

### Task 1: Repo scaffold + tools

**Files:** Create `tools/extract_docx.py` (move from scratch prototype), `tools/validate.py`, `tests/test_validate.py`, `.gitignore` (`scratch/`).

**Interfaces:**
- Produces: `python3 -I tools/extract_docx.py <raw_json> <outdir>` prints subject, date and the docx text. `python3 -I tools/validate.py [data_dir]` exits 0 when OK, else 1, printing each problem; it prints `CHECK:` lines for `check: true` entries (warnings, exit 0).

- [ ] Write tests: valid sample passes; a performer name with two words ending in more than an initial ("Jane Smithson") fails; a bad format fails; missing `original` fails; a duplicate (same date + piece + performers) fails; meetings not sorted by date fails; `check: true` produces a CHECK line and exit 0.
- [ ] Implement `validate.py`; run `python3 -m unittest tests/test_validate.py` → OK.
- [ ] `git init`, commit.

### Task 2: Initial data from the five programs

**Files:** Create `data/performances.json`, `data/members.json`.

- [ ] Fetch the latest program before each meeting (Sep 12, Sep 26, Oct 17, Oct 31, Nov 14) via Gmail RAW and extract_docx.
- [ ] Build `members.json` (`{"Helen": {"display": "Helen L.", "instruments": ["Piano"]}}`; duplicate first names keyed "Nicole A." / "Nicole G.") from mailing-list display names, initials only.
- [ ] Transcribe each line per the design's rules; mark unresolved instrument splits `check: true`.
- [ ] `python3 -I tools/validate.py data` → exit 0; collect CHECK lines for Adam. Commit.

### Task 3: Search/filter logic

**Files:** Create `lib.js`, `tests/lib.test.mjs`.

**Interfaces:**
- Produces: `normalize(s: string) → string` (NFD, strip accents, lowercase, drop punctuation and spaces); `flatten(data) → Row[]` where each Row = performance + `{date, format, venue}`; `filterRows(rows, state) → Row[]`; `sortRows(rows, key, dir) → Row[]`; `stateFromQuery(qs) → state`; `stateToQuery(state) → string`; `facets(rows) → {composers, performers, instruments: [[name, count]]}`.
- `state = {q, composer, performer, instrument, format, from, to, minLen, maxLen, sort, dir}`; empty string / null = no filter; default sort `date` desc.

- [ ] Write tests covering the Review Focus lines plus: composer exact match; date range is inclusive; format filter; sort by piece ascending ignores accents.
- [ ] Implement; `node --test tests/` → all pass. Commit.

### Task 4: Page and styles

**Files:** Create `index.html`, `styles.css`, `app.js`, `robots.txt`.

- [ ] `app.js` fetches `data/performances.json`, renders filters from `facets`, re-renders on `input` events (search live), writes state to URL with `history.replaceState`, restores it on load.
- [ ] Desktop table / mobile cards (≤ 700px), filters collapsible on mobile, empty-state text from the spec, result count "N performances · M meetings".
- [ ] Serve with `python3 -m http.server`, Playwright screenshot desktop + phone; check typing "chopin" in composer and "gnoss" in search. Commit.

### Task 5: Update instructions

**Files:** Create `UPDATING.md`, `README.md`.

- [ ] `UPDATING.md`: the scheduled task's step list from the spec, with the exact Gmail query, the commands, and the rule to report CHECK lines and parse doubts instead of guessing.
- [ ] Draft the scheduled-task prompt and GitHub/Pages setup clicks for Adam. Commit.
