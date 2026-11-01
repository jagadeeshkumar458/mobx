# Comparison engine: the single source of truth

The comparison page and the video studio never read phone specs themselves.
Both read the same stored **ComparisonSnapshot**, so a spec can't say one thing
on the website and another in a video.

```
PhoneSpec rows ──► buildSnapshot() ──► ComparisonSnapshot (frozen, sha256-hashed, stored once)
 (+ SpecDefinition                         │
    registry)                              ├──► toDashboard(snapshot, mode, weights) ──► comparison page
                                           └──► toStoryboard(snapshot, options) ──► validateStoryboard() ──► Remotion render
```

## Rules the code enforces

| Rule | Where | Test |
|---|---|---|
| Only `buildSnapshot` reads raw phone records | `engine.ts` | — |
| Every value has one display string (`cell.display`); page and video both show it | `formatValue` | *every video fact is byte-identical…* |
| Snapshot is frozen and content-hashed; edits to the stored copy are refused | `verifySnapshot`, `service.mustLoad` | *a snapshot edited in the database…* |
| Storyboard facts are pointers into the snapshot and must match it exactly | `validateStoryboard` | *editing a fact value…* |
| Narration, including user edits, may only state numbers present in that scene's facts | `validateStoryboard` | *user-edited narration cannot introduce numbers…* |
| Render worker re-validates before rendering, and against the right snapshot | `prepareRender` / `assertRenderable` | *render is refused…* |
| Recommendations are a pure function of (snapshot, weights), so the page and the verdict scene agree | `recommend.ts` | *the verdict scene and the dashboard agree…* |
| Quick / Detailed / Techie modes only filter rows; values are unchanged | `toDashboard` | *view modes filter rows…* |
| Missing → "Not available"; never a video fact | `buildCell` | *missing specs show "Not available"…* |
| Unverified / user-reported / estimated values are shown, labelled, never ranked | `TRUSTED` set | *unverified and user-reported values…* |
| Benchmarks, brightness, endurance only ranked under identical test conditions | `comparableBy` | *benchmarks from different versions…* |
| Small differences aren't highlighted as wins | `minMeaningfulDelta` | *lower-is-better specs and meaningful-difference thresholds* |
| Megapixels, chipset names, expert ratings shown but not ranked | `direction: 'none'` | *megapixels and chipset names…* |
| Telugu and English videos carry identical facts; only wording changes | `narration.ts` | *Telugu storyboard uses the same values…* |

## When phone data changes

Snapshots are immutable. If a spec is corrected, a new comparison produces a new
snapshot with a new hash. Existing video projects stay tied to the snapshot they
were built from, which is exactly what was shown when the user approved them.
To refresh a video, the studio rebuilds the storyboard from the new snapshot.
The UI should offer "data updated since this video was made — rebuild?" when a
newer snapshot exists for the same phones.

## Adding a spec or category

Insert a `SpecDefinition` (or `ComparisonCategory`) row and its translation keys.
No engine, page or video code changes. Bump `registry.version`; it's part of
the hash, so old and new snapshots never mix.

## Running

```
cd shared/comparison-engine
npm test            # node --test, no dependencies needed (Node 22.18+)
npm run typecheck
```

Test phones in `tests/fixtures.ts` are fictional and exist only to exercise the
rules. Real phone data enters through the admin import with sources attached.
