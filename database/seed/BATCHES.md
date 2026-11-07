# Phone catalogue: batch plan

Goal: every phone launched in India in the last five years (Nov 2021 – Nov 2026)
by Apple, Google, Samsung, OnePlus, Xiaomi, Redmi, POCO, realme, vivo, iQOO,
OPPO, Motorola, Nothing, Infinix and Tecno. That is several hundred models, so
it is added in batches of about 15–25 phones, newest first.

## Sourcing rules (every batch)

1. Prefer the manufacturer's spec page. Otherwise use an Indian launch report
   (Digit, 91mobiles, Beebom, TelecomTalk, Gizbot…) that states the spec.
2. Record only what the source states. If it isn't stated, leave it out and the
   app shows "Not available". Never fill gaps from memory or similar phones.
3. Values reported by the press as the maker's specs use `sourceType:
   "manufacturer"`, with `sourceUrl` pointing at the report.
4. Rumours, headlines that couldn't be opened, and secondhand claims use
   `sourceType: "not_verified"`, `verification: "unverified"`.
5. Brightness needs a `method` condition (`manufacturer peak`, `manufacturer
   outdoor peak`, `manufacturer local peak`); benchmarks need a `version`.
6. Prices are the India launch price of the base variant (`variant` says which).
7. Where a phone has several IP ratings, record the highest one in the rank list
   (IP69K → `IP69`). Foldables' IP48 / IPX8 sit between IP65 and IP54 in the
   rank list (better water, weaker dust); the order there is approximate.
8. If a source contradicts itself on a value, leave that value out and note it
   under "Known gaps".
9. Run the tests before pushing; `validatePhoneRecords` must return no issues.

## Backfill: complete every record (do this before new batches)

Every phone should carry every common field a spec page states: launch date,
dimensions, thickness, weight, colours, chipset, CPU, GPU, RAM, storage and
options, display type/size/resolution/PPI/refresh/brightness/protection, all
rear cameras (main MP + aperture + sensor size + OIS, ultra-wide, telephoto,
optical zoom, best video), front camera MP and video, battery, wired and
wireless charging, OS at launch, update policy, IP rating, frame and back
material, 5G, Wi-Fi, Bluetooth, NFC, USB, eSIM, fingerprint type, stereo
speakers, headphone jack, AI assistant, AI features, Circle to Search.

How:
1. Prefer the manufacturer spec page (store.google.com …/product/<model>_specs,
   apple.com/in/<model>/specs, samsung.com/in). Otherwise GSMArena's full spec
   page, recorded with `sourceType: "spec_database"` and the page's region
   (`GLOBAL`, `CN`…). AI assistant / Circle to Search usually need the maker's
   page or announcement.
2. Write an extract JSON and run `python3 scripts/merge_specs.py <extract>`.
   It only adds missing fields, never overwrites, upgrades unverified values a
   trusted source confirms, and logs disagreements to `CONFLICTS.md`.
3. RAM and storage come from the Indian base variant (`variant`), not from
   global pages; regional battery or charging differences show up as conflicts.
4. Sensor sizes go in `main_sensor_size_inch`; `main_sensor` is for named
   sensor models only.

Status 2026-11-02: complete (29–32 of 33 common fields) for the 16 showcase
phones: Pixel 11, iPhone 18 Pro / Pro Max, Galaxy S26 and the 12 batch-1
flagships. Backfilled 2026-11-02 from GSMArena (GLOBAL): Z Flip 4 / 5 / 6 / 7 /
7 FE, Z Fold 4 / 5 / 6, S22 / S22+ / S22 Ultra, S23 / S23+ / S23 Ultra / S23 FE,
S24 / S24+ / S24 Ultra (S24 series AI features from Samsung India newsroom).
These still lack storage options (India variants), security-update years and,
except the S24 series, AI assistant / Circle to Search. Z Fold 7 / Fold 8 /
Flip 8 / Fold 8 Ultra are kept at the head of the list: web search returned no
GSMArena spec page for them, so try samsung.com/in spec pages next.
Side-mounted fingerprint readers are recorded as `side-mounted` (added to the
rank list after `capacitive`, registry 2026.11.6); foldables' dimensions give
unfolded and folded sizes, `thickness_mm` is the unfolded figure and
`front_camera_mp` is the cover-screen camera.

Backfilled 2026-11-06: S24 FE, S25 / S25+ / S25 Ultra, S25 FE, S26 Ultra from
GSMArena (GLOBAL); iPhone SE (2022), 14 / 14 Plus / 14 Pro / 14 Pro Max, 15 /
15 Plus / 15 Pro / 15 Pro Max, 16 / 16 Plus / 16 Pro / 16 Pro Max, 16e, 17, Air,
17 Pro / 17 Pro Max from Apple tech-spec pages (support.apple.com, apple.com).
Apple pages give no battery mAh, wired watts or launch date, and iPhone
storage options were only taken from en-in pages; 2x "telephoto" crops of the
main sensor are not recorded as telephoto lenses. These Samsung records still
lack five_g, AI assistant / Circle to Search and India storage options; the S25
main-camera OIS wasn't stated in the extract. GSMArena blocks fetching the
Z Fold 7 page (robots) and returned no S26+ spec page; try samsung.com/in.

Backfilled 2026-11-07 from GSMArena (GLOBAL): Z Fold 7, S26+, Pixel 10 / 10 Pro /
10 Pro XL / 10 Pro Fold / 10a, Pixel 9 / 9 Pro / 9 Pro XL / 9 Pro Fold / 9a,
Pixel 8 / 8 Pro / 8a, Pixel 7 / 7 Pro / 7a, Pixel 6a; Pixel 10-series AI
features and update years from store.google.com; Pixel 11 Pro / 11 Pro XL from
store.google.com/us (that page gives dimensions and weight only in inches and
ounces, so those, the launch date, CPU/GPU and fingerprint type are still
missing). Pixel 9 / 8 / 7 / 6a series still lack AI assistant fields; Pixel 7a
and 6a still lack RAM / storage (India variant not stated); storage options
for all of these were not taken from global pages.

Thin records still to backfill (6):
samsung-galaxy-z-fold-8, samsung-galaxy-z-flip-8,
samsung-galaxy-z-fold-8-ultra, apple-iphone-17e, apple-iphone-duo,
google-pixel-11-pro-fold.
(No GSMArena spec page turned up for the Fold 8 / Flip 8 / Fold 8 Ultra; try
samsung.com/in or devicespecifications-style pages only if a maker page fails.)

## Batches

| # | Scope | Phones | Status |
|---|---|---|---|
| 0 | Pixel 11, iPhone 18 Pro, Galaxy S26 | 3 | ✅ Done 2026-11-02 |
| 1 | Newest top model per remaining brand | 12 | ✅ Done 2026-11-02 |
| 2 | Samsung Galaxy S and Z series, 2022–2026 | 29 | Partial 2026-11-02 (S21 FE missing) |
| 3 | Apple iPhone SE (2022), 14 – 18 series, 16e, 17e, Air, Duo | 21 | ✅ Done 2026-11-02 (thin records, see gaps) |
| 4 | Google Pixel 6a – 11 series | 20 | ✅ Done 2026-11-02 (thin records, see gaps) |
| 5 | OnePlus numbered, R, Nord series | ~25 | Pending |
| 6 | Xiaomi numbered series + Redmi Note series | ~25 | Pending |
| 7 | POCO F, X, M series | ~25 | Pending |
| 8 | realme GT, numbered, Narzo series | ~30 | Pending |
| 9 | vivo X, V, T series | ~30 | Pending |
| 10 | iQOO numbered, Neo, Z series | ~25 | Pending |
| 11 | OPPO Find, Reno, K, F series | ~25 | Pending |
| 12 | Motorola Edge, G series | ~30 | Pending |
| 13 | Nothing Phone and CMF Phone | ~10 | Pending |
| 14 | Infinix Zero, Note, GT, Hot series | ~25 | Pending |
| 15 | Tecno Phantom, Camon, Pova, Spark series | ~25 | Pending |
| 16 | Samsung Galaxy A and M series, Redmi numbered, budget lines | ~60 | Pending |

Batch 1 picks (newest top model launched in India as of 2026-11-02):
Xiaomi 17 Ultra, vivo X300 Pro, OPPO Find X9 Pro, OnePlus 15 (OnePlus 16 not
yet in India), Nothing Phone (4a) Pro (no Phone (4) in India), Motorola Edge 70
Pro+, realme GT 8 Pro, iQOO 15, Redmi Note 15 Pro+, POCO X8 Pro Max, Infinix
Note 60 Pro, Tecno Pova Curve 2 5G.

## Known gaps to revisit

- Batch 2: Galaxy S21 FE (India, Jan 2022) not yet added. Galaxy Z Fold 7 chip
  left out because the source contradicted itself. Z Fold 8 Ultra has only its
  price; Z Fold 4 / Flip 4 and S23-series chips are missing. Fill these from
  samsung.com/in spec pages.
- Batch 3: iPhone 17e and iPhone Duo records are still thin (the rest were
  backfilled 2026-11-06). Fill from
  apple.com/in/<model>/specs or support.apple.com tech-spec pages. Apple doesn't
  publish battery mAh; the 16-series and SE figures are marked not verified.
  "8x" zoom quoted for the 17 Pro / Pro Max and 18 Pro Max is Apple's
  optical-quality zoom, not true optical, so it was left out.
- Batch 4: Pixel 11 Pro / 11 Pro XL / 11 Pro Fold, Pixel 7a and Pixel 6a have
  only their India price. Fill from store.google.com/<region>/product/<model>_specs.
  Pixel 10 Pro / Pro XL / Pro Fold storage for the base price wasn't stated.

- Most launch reports omit weight, Wi-Fi version, eSIM and update policy.
  A pass over manufacturer spec pages would fill many of these.
- No benchmark or battery-endurance data yet; those need independent tests
  with the test version recorded.
- Once the catalogue passes ~100 phones, split `phones.json` per brand and load
  phones in the demo on demand instead of bundling them all.
