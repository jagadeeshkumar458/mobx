# MobileVerse

Multilingual smartphone comparison platform with a comparison-video studio.

**Live engine demo:** https://jagadeeshkumar458.github.io/mobx/

## Status

- **Done:** `shared/comparison-engine`, the single source of truth. The comparison page and the video generator both read the same immutable, hashed comparison snapshot, so specs can never differ between the website and a video. 19 tests.
- **Done:** `database/prisma/comparison.prisma`, tables for spec definitions, snapshots, video projects and render jobs.
- **Done:** `site/`, a demo page that runs the real engine in the browser and deploys to GitHub Pages on every push.
- **Done:** `database/seed/phones.json`, real phones with sources: currently 85 (each brand's newest top model in India, Samsung's Galaxy S and Z series since 2022, every iPhone since the 2022 SE, and every Pixel since the 6a). The five-year catalogue is being added in batches; see [database/seed/BATCHES.md](database/seed/BATCHES.md). The 16 showcase phones have full spec sheets (≈30 common fields each, AI assistant included); the rest are being backfilled. Every value carries a source URL, region and verification status, and `validatePhoneRecords` rejects any record that doesn't.
- **Done:** YouTube studio in the demo page (`site/studio.ts`, `shared/comparison-engine/src/adapters/youtube.ts`): preview, optional phone images, script with read-time check, captions (.srt), in-browser video export to WebM (16:9 or 9:16 Shorts, optional voiceover/music file mixed in), thumbnail maker, and title / description (with chapters and sources) / tags / pinned comment, all generated from the same snapshot.
- **Engine 1.1.0:** a phone gets a category score only when it has data for at least half of that category's ranked specs, and differences too small to matter no longer move scores, so phones with different published data (Android vs iPhone) are compared fairly.
- **Next:** Express API routes, React comparison page, Remotion video studio, admin import with sourced real phone data.

See [docs/comparison-engine.md](docs/comparison-engine.md) for the design and the rules the code enforces.

## Run the tests

```
cd shared/comparison-engine
npm test        # Node 22.18+, no dependencies needed
```

Test phones in `tests/fixtures.ts` are fictional; real phone data enters through the admin import with sources attached.
