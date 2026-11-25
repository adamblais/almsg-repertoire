"""Validate data/performances.json against the rules in docs/design.md.

Usage: python3 -I tools/validate.py [data_dir]
Exit 0 when valid (CHECK: lines are warnings), 1 when any problem is found.
"""
import json, os, re, sys

FORMATS = {"In person", "Zoom"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# "Helen", "Helen L.", "Marc-André F."
NAME_RE = re.compile(r"^[A-ZÀ-Ý][\w'’-]*( [A-ZÀ-Ý]\.)?$")
REQUIRED = ("piece", "composer", "performers", "length", "minutes", "wip", "original")


def validate(data, members):
    problems, checks = [], []
    displays = {m["display"] for m in members.values()}
    roster = {m["display"]: set(m.get("instruments", [])) for m in members.values()}
    meetings = data.get("meetings")
    if not isinstance(meetings, list):
        return ["meetings must be a list"], []
    dates = [m.get("date", "") for m in meetings]
    if dates != sorted(dates):
        problems.append("meetings are not in date order")
    if len(set(dates)) != len(dates):
        problems.append("two meetings share a date")
    for m in meetings:
        d = m.get("date", "")
        if not DATE_RE.match(d):
            problems.append(f"{d!r}: bad date")
        if m.get("format") not in FORMATS:
            problems.append(f"{d}: format must be one of {sorted(FORMATS)}")
        seen = set()
        for i, p in enumerate(m.get("performances", [])):
            where = f"{d} #{i + 1} {p.get('piece', '?')!r}"
            for k in REQUIRED:
                if k not in p:
                    problems.append(f"{where}: missing {k}")
            if not p.get("piece") or not p.get("original"):
                problems.append(f"{where}: piece and original must be non-empty")
            mins = p.get("minutes")
            if mins is not None and not (isinstance(mins, (int, float)) and 0 < mins < 60):
                problems.append(f"{where}: minutes must be null or a number of minutes")
            perfs = p.get("performers") or []
            if not perfs:
                problems.append(f"{where}: no performers")
            for pf in perfs:
                name, inst = pf.get("name", ""), pf.get("instrument", "")
                if not NAME_RE.match(name):
                    problems.append(f"{where}: {name!r} looks like a full surname; use first name + initial")
                elif name not in displays:
                    problems.append(f"{where}: {name!r} is not in members.json")
                elif inst not in roster[name]:
                    problems.append(f"{where}: {name} plays {inst!r}, which is not in their members.json instruments")
                if not inst or inst != inst[:1].upper() + inst[1:] or inst != inst.title():
                    problems.append(f"{where}: instrument {inst!r} must be Title Case")
            key = (p.get("piece", "").lower(), tuple(sorted(x.get("name", "") for x in perfs)))
            if key in seen:
                problems.append(f"{where}: duplicate entry")
            seen.add(key)
            if p.get("check"):
                checks.append(f"{where}: {p.get('original')}")
    return problems, checks


def main():
    data_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "data")
    with open(os.path.join(data_dir, "performances.json"), encoding="utf-8") as f:
        data = json.load(f)
    with open(os.path.join(data_dir, "members.json"), encoding="utf-8") as f:
        members = json.load(f)
    problems, checks = validate(data, members)
    for c in checks:
        print("CHECK:", c)
    for p in problems:
        print("PROBLEM:", p)
    n = sum(len(m.get("performances", [])) for m in data.get("meetings", []))
    print(f"{len(data.get('meetings', []))} meetings, {n} performances, {len(problems)} problems, {len(checks)} to check")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
