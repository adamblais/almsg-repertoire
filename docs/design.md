# ALMSG Repertoire Archive — Design

Date: 2026-11-17 · Owner: Adam

## Intent

The Adults Learning Music Group (ALMSG) already has a website (adultslearningmusic.com). This is a
separate lookup site so members can answer "has this piece been performed before — when, by whom, on what?"
before choosing what to play. Data comes from the meeting programs the group organizer (Claude V.) emails out, usually the
day before each meeting.

## Goals

- Search every performance from the programs, live as you type a piece name.
- Filter by every stored field: piece, composer, performer, instrument, date, length, in person vs Zoom.
- Professional, elegant look suited to classical musicians. Works well on phones.
- Easy to keep up to date: a Claude scheduled task every two weeks adds the newest program.

## Non-goals

- Programs from before September 2026. Adam may get these later, and they'll go through the same process.
- Recording what was actually played. The programs are plans; WIP pieces are marked as such.
- Primary vs Secondary selection (Adam: not needed). Secondary pieces are included as ordinary entries.
- Logins, comments, or members editing entries.

## Anti-goals (failure even if it works)

- Members' full surnames appear anywhere: on the site, in the data file, or in the repository.
  Adam hasn't run the site by the group yet.
- The site shows up in search engines before the group approves it.
- Silent mistakes in the data. Every entry keeps the original program line so it can be checked.

## Constraints

- Hosting is GitHub Pages at `https://ultimateguy.github.io/almsg-repertoire/` (custom domain later, maybe).
  Free Pages needs a **public** repository, so the data file is public too. That's another reason for
  first names plus last initial only.
- No server and no build step. Plain HTML/CSS/JS plus a JSON data file, so a scheduled task can update it
  by editing one file and committing.
- The repository is created by Adam. Pushes from this homelab session may need Adam (see "Open setup").

## Approaches considered

1. **Static single page plus a JSON file on GitHub Pages (chosen).** Everything loads into the browser,
   so filtering is instant. There's nothing to run or patch, it's free, and updates are a commit.
2. Database-backed web app (e.g. SQLite and a small server on PROD-Docker behind SWAG). This is
   overkill for a few hundred rows, Adam would have to host a site for the group, and the cloud scheduled
   task would need a way into the homelab. Rejected.
3. Netlify/Cloudflare Pages. These work the same as approach 1 but add another account. Rejected.

## Data

`data/performances.json` holds one object per meeting, each with a list of performances:

```json
{
  "updated": "2026-11-17",
  "meetings": [
    {
      "date": "2026-11-14",
      "format": "In person",            // "In person" | "Zoom"
      "venue": "Steinway",              // optional, as given
      "source": "Meeting ALMSG - November 14th, 2026.docx",
      "performances": [
        {
          "piece": "Prelude in A minor, Op. 28 No. 2",
          "composer": "Frédéric Chopin",
          "performers": [{"name": "Helen L.", "instrument": "Piano"}],
          "length": "~2 min",            // as written, tidied
          "minutes": 2,                  // number for filtering; ranges → midpoint; 30 sec → 0.5
          "wip": false,
          "original": "Helen - Prelude in a minor op 28 no 2, by F. Chopin ~ 2 mn"
        }
      ]
    }
  ]
}
```

Rules for turning a program line into an entry:

- **Performers** are shown as first name plus last initial, using `data/members.json` (first name →
  display name, built from the ALMSG mailing list display names, initials only). Two Nicoles are
  "Nicole A." and "Nicole G.", as the programs already write them. If someone has no known surname
  (e.g. Lorne), use the first name alone. A new name not in the roster: add it with an initial if the
  mailing list shows one, else first name only.
- **Instrument is per performer.** Programs aren't consistent: "Claude and Kaylene, violin" means Claude on
  piano and Kaylene on violin, while "Kathleen and Kaylene, violin" may mean two violins. Rules:
  - One performer: the listed instrument, else **Piano**.
  - "piano duet": everyone Piano.
  - Several performers, one instrument listed: give it to those whom `members.json` lists as playing it;
    everyone else gets Piano. If that can't be resolved (nobody, or everybody, is known for it), mark
    the entry `"check": true` and list it in the update summary for Adam to confirm.
  - `members.json` records each member's known instruments (e.g. Kaylene: Violin, Viola), learned from
    solo lines and Adam's answers. Members can play more than one instrument.
  - Instrument names are title-cased: "Violin", "Viola", "Voice", "Flute", "Guitar", "Piano".
- **Piece and composer** are split apart and tidied for consistent spelling and capitalization
  ("F. Chopin" → "Frédéric Chopin", "J.S Bach" → "Johann Sebastian Bach", arrangers kept in the piece
  title, e.g. "Winter Wonderland (arr. Dan Coates)"). Traditional or nursery tunes use composer
  "Traditional". Pop and folk songs use the songwriter as given (Leonard Cohen, Bob Dylan).
- **WIP** is true when the line says WIP. The marker is removed from the title.
- When a program was revised (a later email in the same thread, or a new email before the meeting),
  the latest version before the meeting date wins.
- **Format**: Zoom if the subject or program says Zoom, otherwise In person. Remote performers joining an
  in-person meeting still count as In person, since format describes the meeting.

## The page

One page, `index.html`, with `<meta name="robots" content="noindex, nofollow">` and a `robots.txt`
that disallows everything.

```
 ┌──────────────────────────────────────────────────────────────┐
 │        Adults Learning Music Group                           │
 │        R E P E R T O I R E   A R C H I V E                   │
 │        ───────────── ◆ ─────────────                         │
 │  [ Search a piece…  (e.g. Gnossienne)                     ]  │
 │  Composer ▾  Performer ▾  Instrument ▾  In person|Zoom|All   │
 │  From [date] To [date]  Length [0]–[10+] min                 │
 │                                           Clear all filters  │
 │  23 performances · 5 meetings                                │
 ├──────────────────────────────────────────────────────────────┤
 │ Date ▾      Piece / Composer          Performer  Instr. Len  │
 │ 14 Nov 2026 Adagio, Concerto in G minor Claude V. Piano   8  │
 │             Max Bruch                 Kaylene D. Violin      │
 │             Franz Liszt                                 In person│
 │ …                                                            │
 └──────────────────────────────────────────────────────────────┘
 Data from ALMSG meeting programs since September 2026 · adultslearningmusic.com
```

- **Live search** on piece title or composer as you type. It ignores accents, case and punctuation
  ("gnossienne" matches "1ère Gnossienne", "op28" matches "Op. 28").
- **Dropdowns** (composer, performer, instrument) are built from the data, sorted, each with a count.
  Picking a performer matches any entry they appear in, including duets. Instrument matches any
  performer's instrument; each performer is shown with their own instrument.
- **Segmented toggle** for In person/Zoom/All. Date range and length range
  (in minutes) use simple inputs.
- **Sortable columns**, newest first by default. A result count is shown, and "Clear all filters" resets
  everything.
- Filter state is kept in the URL, so a member can share a link like "all violin pieces".
- **Phones**: rows become stacked cards and the filters collapse under a "Filters" button.
- **Empty result**: "No performances found. It may not have been played since September 2026."

**Look:** ivory paper background, near-black ink text, deep burgundy accents, thin gold hairline rules
and a small ornament under the title. Serif typography: Cormorant Garamond for headings and EB Garamond
for body text (Google Fonts), with tabular figures for dates and lengths. Restrained, lots of white
space, no images needed. Accessible contrast and keyboard-friendly controls.

## Repository layout

```
almsg-repertoire/
  index.html  styles.css  app.js  robots.txt
  data/performances.json  data/members.json
  tools/extract_docx.py      # Gmail RAW message → docx text
  tools/validate.py          # schema check, duplicate check, no surnames, default-piano check
  UPDATING.md                # the step-by-step the scheduled task follows
  tests/                     # filter/normalize logic tests (node, no dependencies)
```

## The bi-weekly update (Adam's scheduled task)

`UPDATING.md` tells the task to:

1. Search Gmail for the organizer's program emails (`from:<sender in the task prompt> has:attachment`) newer than the last meeting in the data.
2. Download the program via the RAW message and extract the text with `tools/extract_docx.py`.
3. Add the meeting following the rules above, then run `tools/validate.py`.
4. Commit `data/performances.json` (and `members.json` if a new member appeared) and push.
   Pages redeploys automatically.
5. If nothing new turned up, or a line couldn't be parsed confidently, say so in the task summary
   instead of guessing.

I'll provide the exact prompt to paste into the scheduled task.

## Open setup (Adam)

- Create the public repository `ultimateguy/almsg-repertoire` and enable Pages (I'll give the clicks).
- Connect that repository to the scheduled task so it can push.

## Left to the builder

Exact CSS, small wording choices, how composers' names are normalized for a few edge cases, and test
coverage of the filter/normalize logic.
