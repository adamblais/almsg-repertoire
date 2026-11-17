# ALMSG Repertoire Archive

A searchable list of pieces performed at Adults Learning Music Group meetings, built from the meeting
programs. Static site for GitHub Pages: `index.html` + `app.js` + `lib.js` read `data/performances.json`.

- Design: `docs/design.md`
- Adding programs: `UPDATING.md`
- Tests: `node --test tests/` and `python3 -m unittest tests/test_validate.py`
- Local preview: `python3 -m http.server` then open http://localhost:8000

Performers are shown as first name + last initial only. The site asks search engines not to index it.
