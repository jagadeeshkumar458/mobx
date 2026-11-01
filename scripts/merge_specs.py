#!/usr/bin/env python3
"""Merge spec extracts into database/seed/phones.json without overwriting.

Usage: python3 scripts/merge_specs.py extract1.json [extract2.json ...]

Extract format:
  {"url": "https://...", "sourceType": "manufacturer" | "spec_database",
   "region": "IN" (optional, default IN),
   "items": [{"id": "google-pixel-11", "ram_gb": 12, ...}]}

Rules:
- Only keys that exist in the registry and are missing on the phone are added.
- An existing value is never replaced. If the extract disagrees with it, the
  disagreement is appended to database/seed/CONFLICTS.md for a human to resolve.
- Null / empty values are skipped (the source didn't state them).
- peak_brightness_nits needs a method; pass [value, "manufacturer peak"].
- [value, "UNVERIFIED", "why"] stores the value as not verified.
- A trusted source that agrees with a stored unverified value upgrades it.
"""
import json, re, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEED = ROOT / 'database/seed/phones.json'
CONFLICTS = ROOT / 'database/seed/CONFLICTS.md'
REGISTRY = ROOT / 'shared/comparison-engine/src/registry.ts'
TODAY = datetime.date.today().isoformat()

KEYS = set(re.findall(r"s\('([a-z0-9_]+)'", REGISTRY.read_text()))
SKIP = {'id', 'model', 'brand', 'variant'}


def same(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < 1e-6
    if isinstance(a, list) and isinstance(b, list):
        return sorted(map(str.lower, map(str, a))) == sorted(map(str.lower, map(str, b)))
    return str(a).strip().lower() == str(b).strip().lower()


def main(paths):
    doc = json.loads(SEED.read_text())
    phones = {p['id']: p for p in doc['records']}
    added, conflicts, unknown = 0, [], set()
    for path in paths:
        ex = json.loads(pathlib.Path(path).read_text())
        for item in ex['items']:
            phone = phones.get(item['id'])
            if not phone:
                unknown.add(item['id']); continue
            for key, raw in item.items():
                if key in SKIP or raw is None or raw == '' or raw == []:
                    continue
                if key not in KEYS:
                    unknown.add(f"{item['id']}.{key}"); continue
                sv = {'sourceType': ex.get('sourceType', 'manufacturer'), 'verification': 'verified',
                      'sourceUrl': ex['url'], 'lastUpdated': TODAY, 'region': ex.get('region', 'IN')}
                value = raw
                if isinstance(raw, list) and len(raw) >= 2 and raw[1] == 'UNVERIFIED':
                    value = raw[0]
                    sv.update(sourceType='not_verified', verification='unverified',
                              conditions={'note': raw[2] if len(raw) > 2 else 'unconfirmed'})
                elif key == 'peak_brightness_nits':
                    value, method = (raw[0], raw[1]) if isinstance(raw, list) else (raw, 'manufacturer peak')
                    sv['conditions'] = {'method': method}
                existing = phone['specs'].get(key)
                # A trusted source confirming an unverified value upgrades it.
                if existing and existing.get('verification') == 'unverified' and sv['verification'] == 'verified' and same(existing['value'], value):
                    phone['specs'][key] = {'value': value, **sv}
                    added += 1
                    continue
                if existing:
                    if not same(existing['value'], value):
                        conflicts.append(f"| {item['id']} | {key} | {existing['value']} ({existing['sourceUrl']}) | {value} ({ex['url']}) |")
                    continue
                phone['specs'][key] = {'value': value, **sv}
                added += 1
    SEED.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    if conflicts:
        if not CONFLICTS.exists():
            CONFLICTS.write_text('# Spec conflicts to resolve\n\nThe stored value is kept until someone checks which source is right.\n\n'
                                 '| Phone | Spec | Stored value (source) | Other source says |\n|---|---|---|---|\n')
        with CONFLICTS.open('a') as f:
            f.write('\n'.join(conflicts) + '\n')
    print(f'added {added} values; {len(conflicts)} conflicts; unknown: {sorted(unknown) or "none"}')


if __name__ == '__main__':
    main(sys.argv[1:])
