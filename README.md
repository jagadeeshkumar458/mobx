# MobileVerse

Multilingual smartphone comparison platform with a comparison-video studio.

**Live engine demo:** https://jagadeeshkumar458.github.io/mobx/

## Status

- **Done:** `shared/comparison-engine`, the single source of truth. The comparison page and the video generator both read the same immutable, hashed comparison snapshot, so specs can never differ between the website and a video. 19 tests.
- **Done:** `database/prisma/comparison.prisma`, tables for spec definitions, snapshots, video projects and render jobs.
- **Done:** `site/`, a demo page that runs the real engine in the browser and deploys to GitHub Pages on every push.
- **Done:** `database/seed/phones.json`, the first real phones (Pixel 11, iPhone 18 Pro, Galaxy S26 India). Every value carries a source URL, region and verification status, and `validatePhoneRecords` rejects any record that doesn't.
- **Next:** Express API routes, React comparison page, Remotion video studio, admin import with sourced real phone data.

See [docs/comparison-engine.md](docs/comparison-engine.md) for the design and the rules the code enforces.

## Run the tests

```
cd shared/comparison-engine
npm test        # Node 22.18+, no dependencies needed
```

Test phones in `tests/fixtures.ts` are fictional; real phone data enters through the admin import with sources attached.
