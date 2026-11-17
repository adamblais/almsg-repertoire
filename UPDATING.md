# Adding new meeting programs

Instructions for the scheduled Claude task (or a person) to add programs to the archive.
The rules for turning program lines into entries are in `docs/design.md` → "Data"; follow them exactly.

## 1. Find new programs

Read `data/performances.json` and note the date of the last meeting.

Search Gmail:

```
from:<program sender address from the task prompt> has:attachment after:<last meeting date as YYYY/MM/DD>
```

Programs are `.docx` attachments named like `Meeting ALMSG - November 14th, 2026.docx`, sent by the group organizer (Claude V.) usually the
evening before a Saturday meeting. If a thread has a later message from the organizer with "updated program",
use that version. Ignore threads without a program attachment.

If there is no new program, stop and report "No new program since <date>". Change nothing.

## 2. Extract the program text

Fetch the message with the Gmail `get_message` tool, `messageFormat: RAW`. The result is large and is
saved to a JSON file; pass that file's path to:

```
python3 -I tools/extract_docx.py <saved-json-path> <empty-scratch-dir>
```

It prints the subject, the date and the program text.

## 3. Add the meeting

Append a meeting object to `meetings` in `data/performances.json` (keep the list in date order):

- `date`: meeting date from the program heading (YYYY-MM-DD).
- `format`: "Zoom" if the heading or subject says Zoom, else "In person".
- `venue`: e.g. "Steinway" for in person, `null` for Zoom.
- `source`: the attachment file name.
- `performances`: one entry per piece, from the PRIMARY and SECONDARY sections alike (no distinction is stored).
  A line listing two pieces gives two entries.

For each entry, follow these rules:

- `performers`: `[{"name", "instrument"}]` using the `display` names in `data/members.json`.
  A new performer: add them to `members.json` as first name + last initial, taken from the display names
  on the program email's recipient list (e.g. "Jane Smithson" → "Jane S."). **Never write a full surname.**
  If no surname can be found, use the first name alone.
- Instrument per performer: what the line says; if none, **Piano**. With two or more performers and one
  instrument listed, give it to the performers whose `members.json` instruments include it and Piano to
  the rest. "piano duet" → all Piano. "tenor"/"soprano" → "Voice". If you can't tell, set `"check": true`.
- `piece` / `composer`: tidy spelling and capitalization; use the composer's full common name, matching
  names already used in the data (search the file first so the same composer is always spelled the same way).
- `length` as written, tidied (e.g. "~3 min", "3–4 min", "~30 sec"); `minutes` as a number (ranges → midpoint,
  "1 mn 10 sec" → 1.17) or `null` if no length is given.
- `wip`: true if the line says WIP; remove the marker from the title.
- `original`: the program line exactly as written.

Update `"updated"` to today's date. Update a member's `instruments` in `members.json` when they play a new one.

## 4. Validate

```
python3 -I tools/validate.py data
node --test tests/
```

Both must pass. Fix any PROBLEM lines. CHECK lines are fine to commit, but list them in your report.

## 5. Commit and publish

```
git add data/performances.json data/members.json
git commit -m "data: add <Month D, YYYY> program"
git push
```

GitHub Pages republishes within a few minutes.

## 6. Report

Say which meeting(s) were added and how many performances, and list any CHECK lines or anything
you weren't sure about. Do not guess silently.
