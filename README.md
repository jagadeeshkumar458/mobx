# MobileVerse

Multilingual smartphone comparison platform with a comparison-video studio.

## Status

- **Done:** `shared/comparison-engine`, the single source of truth. The comparison page and the video generator both read the same immutable, hashed comparison snapshot, so specs can never differ between the website and a video. 19 tests.
- **Done:** `database/prisma/comparison.prisma`, tables for spec definitions, snapshots, video projects and render jobs.
- **Next:** Express API routes, React comparison page, Remotion video studio, admin import with sourced real phone data.

See [docs/comparison-engine.md](docs/comparison-engine.md) for the design and the rules the code enforces.

## Run the tests

```
cd shared/comparison-engine
npm test        # Node 22.18+, no dependencies needed
```

Test phones in `tests/fixtures.ts` are fictional; real phone data enters through the admin import with sources attached.
