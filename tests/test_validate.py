import copy, json, os, subprocess, sys, tempfile, unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VALIDATE = os.path.join(ROOT, 'tools', 'validate.py')

PERF = {
    "piece": "Prelude in A minor, Op. 28 No. 2",
    "composer": "Frédéric Chopin",
    "performers": [{"name": "Helen L.", "instrument": "Piano"}],
    "length": "~2 min", "minutes": 2, "wip": False,
    "original": "Helen - Prelude in a minor op 28 no 2, by F. Chopin ~ 2 mn",
}
MEETING = {"date": "2026-11-14", "format": "In person", "venue": "Steinway",
           "source": "x.docx", "performances": [PERF]}
DATA = {"updated": "2026-11-17", "meetings": [MEETING]}
MEMBERS = {"Helen": {"display": "Helen L.", "instruments": ["Piano"]}}


def run(data, members=MEMBERS):
    d = tempfile.mkdtemp()
    json.dump(data, open(os.path.join(d, 'performances.json'), 'w'))
    json.dump(members, open(os.path.join(d, 'members.json'), 'w'))
    p = subprocess.run([sys.executable, '-I', VALIDATE, d], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def with_perf(**kw):
    data = copy.deepcopy(DATA)
    data['meetings'][0]['performances'][0].update(kw)
    return data


class ValidateTests(unittest.TestCase):
    def test_valid_sample_passes(self):
        code, out = run(DATA)
        self.assertEqual(code, 0, out)

    def test_surname_fails(self):
        code, out = run(with_perf(performers=[{"name": "Jane Smithson", "instrument": "Piano"}]))
        self.assertEqual(code, 1)
        self.assertIn('surname', out)

    def test_bad_format_fails(self):
        data = copy.deepcopy(DATA); data['meetings'][0]['format'] = 'Hybrid'
        self.assertEqual(run(data)[0], 1)

    def test_missing_original_fails(self):
        data = copy.deepcopy(DATA); del data['meetings'][0]['performances'][0]['original']
        self.assertEqual(run(data)[0], 1)

    def test_duplicate_fails(self):
        data = copy.deepcopy(DATA); data['meetings'][0]['performances'].append(copy.deepcopy(PERF))
        code, out = run(data)
        self.assertEqual(code, 1); self.assertIn('duplicate', out)

    def test_unsorted_meetings_fail(self):
        data = copy.deepcopy(DATA)
        m2 = copy.deepcopy(MEETING); m2['date'] = '2026-09-12'
        data['meetings'].append(m2)
        code, out = run(data)
        self.assertEqual(code, 1); self.assertIn('order', out)

    def test_untitled_instrument_fails(self):
        self.assertEqual(run(with_perf(performers=[{"name": "Helen L.", "instrument": "piano"}]))[0], 1)

    def test_null_minutes_ok(self):
        self.assertEqual(run(with_perf(minutes=None, length=""))[0], 0)

    def test_check_flag_warns_but_passes(self):
        code, out = run(with_perf(check=True))
        self.assertEqual(code, 0, out)
        self.assertIn('CHECK:', out)

    def test_unknown_performer_fails(self):
        code, out = run(with_perf(performers=[{"name": "Zed Q.", "instrument": "Piano"}]))
        self.assertEqual(code, 1); self.assertIn('members.json', out)


if __name__ == '__main__':
    unittest.main()
