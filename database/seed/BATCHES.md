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

Backfilled 2026-11-09: Z Fold 8 / Z Flip 8 / Z Fold 8 Ultra from the Samsung
India newsroom launch post (no India spec page renders; it gives no CPU/GPU,
materials, fingerprint, speakers, protection glass, update years or Circle to
Search; Flip 8 front camera left out because the post says both 10 MP and
50 MP); iPhone 17e from apple.com/au specs plus GSMArena (battery, launch date;
the 2x crop isn't a telephoto); iPhone Duo from apple.com/in specs (no battery
mAh, launch date or wired watts; the "optical-quality 2x" telephoto isn't
recorded); Pixel 11 Pro Fold from store.google.com/gb (no launch date, CPU/GPU,
fingerprint type or wired watts).

Backfilled 2026-11-11 from GSMArena (GLOBAL), for Android-vs-iPhone comparisons:
iPhone 14 / 15 / 16 / 17 series, 16e, Air and SE (2022) (announcement date,
chip process node, battery mAh, launch OS, sensor size, refresh rate, speakers,
headphone jack), plus Galaxy S26 and Pixel 10 gaps. Still missing for iPhones:
RAM, update years (Apple publishes neither), wired watts (GSMArena gives none),
17 Pro / Pro Max battery (two market versions) and everything for 18 Pro /
18 Pro Max / Duo (GSMArena page wouldn't load or is still marked rumoured).
"Bluetooth 6" was normalised to "Bluetooth 6.0".

Thin records still to backfill: none.

## Batches

| # | Scope | Phones | Status |
|---|---|---|---|
| 0 | Pixel 11, iPhone 18 Pro, Galaxy S26 | 3 | ✅ Done 2026-11-02 |
| 1 | Newest top model per remaining brand | 12 | ✅ Done 2026-11-02 |
| 2 | Samsung Galaxy S and Z series, 2022–2026 | 30 | ✅ Done 2026-11-07 (S21 FE added) |
| 3 | Apple iPhone SE (2022), 14 – 18 series, 16e, 17e, Air, Duo | 21 | ✅ Done 2026-11-02 (thin records, see gaps) |
| 4 | Google Pixel 6a – 11 series | 20 | ✅ Done 2026-11-02 (thin records, see gaps) |
| 5 | OnePlus numbered, R, Nord series | 29 | ✅ Done 2026-11-09 (N6, N6x added) |
| 6 | Xiaomi numbered series + Redmi Note series | 30 | ✅ Done 2026-11-10 (18 added 2026-11-10, see gaps) |
| 7 | POCO F, X, M series | 24 | ✅ Done 2026-11-11 (23 added, see gaps) |
| 8 | realme GT, numbered, Narzo series | 66 | ✅ Done 2026-11-13 (19 added 2026-11-13; GT Neo 2, Narzo 50i / 50A launched before Nov 2021) |
| 9 | vivo X, V, T series | ~60 | Partial 2026-11-14 (22 added: Feb 2025 – Sep 2026; 2021–2024 models still to add) |
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

- Batch 9 (2026-11-14, first part): added vivo T5, T5 Lite (the India "T5 Lite
  44W 5G"), X300 Ultra, X300 FE, T5 Pro, V70 FE, T5x, V70, V70 Elite, X300, V60e,
  T4 Pro, T4R, V60, X200 FE, X Fold5, T4 Lite, T4 Ultra, T4, V50e, T4x and V50 as
  complete records (India price, base variant, colours and launch date from
  Fonearena India launch posts, T5x from Beebom; the rest from those plus GSMArena
  GLOBAL pages). The X300 launched in India on 2 Dec 2025 (13 Oct 2025 is the
  global announcement). Still to add: X200 Pro / X200, X Fold3 Pro, X100 Pro /
  X100, X90 Pro / X90, X80 Pro / X80, V40 Pro / V40 / V40e, V30 Pro / V30, V29 Pro /
  V29 / V29e, V27 Pro / V27, V25 Pro / V25, V23 Pro / V23 / V23e, T3 Ultra / Pro /
  T3 / T3x / T3 Lite, T2 Pro / T2 / T2x, T1 Pro / T1 / T1x / T1 44W; X500 series
  is due in India late Nov 2026. Gaps: T5, T5 Lite and T5 Pro have no GSMArena
  data (pages blocked or missing), so they lack CPU, (T5) GPU and some
  connectivity; X200 FE launch date is GSMArena's announcement date (post shows
  none); Fonearena's "Wi-Fi 6 802.11 be/ac" lines were treated as contradictory
  and left out; "4K" video without a frame rate not recorded; dimensions /
  weight left out where colours are built differently (V50, V50e, V60, V70 Elite,
  T4, T4 Ultra, X300 Ultra); X300 Ultra wired watts (post says 90W and 100W);
  T4 Ultra screen size / brightness / resolution (post contradicts itself);
  X Fold5 IP rating (IPX8/IPX9/IP5X not in the rank list); X200 FE / X300 /
  X300 Ultra battery on GSMArena is market-dependent (India figure from the
  launch post); OS-update counts not recorded as years. 14 substantive
  disagreements logged in CONFLICTS.md (sensor size, GPU, glass, brightness,
  zoom, selfie MP, Wi-Fi, Bluetooth, video, storage type); rounding, USB detail,
  GSMArena's global colours and announcement dates were not.

- Batch 8 finished 2026-11-13: added realme 10, 10 Pro+, 10 Pro, GT Neo 3T,
  Narzo 50i Prime, 9i 5G, Narzo 50 5G, Narzo 50 Pro 5G, GT Neo 3 (80W base),
  Narzo 50A Prime, GT 2, GT 2 Pro, 9, 9 5G, 9 5G Speed Edition, Narzo 50,
  9 Pro+, 9 Pro and 9i as complete records (India price, base variant and
  colours from Fonearena India launch posts, GT 2 Pro from Digit; the rest from
  those plus GSMArena GLOBAL pages; realme 9 5G uses GSMArena's India-model
  page). Where the post gave no year, launch date is the date of a dated India
  launch report (India TV, Business Standard, Business Today, TelecomTalk).
  Gaps: no IP rating stated for any of them; GT 2 / GT 2 Pro weight left out
  (two builds); 10 Pro+ chipset / CPU from the launch post only (GSMArena lists
  two chip versions) and its unlabelled 800-nit figure left out; GT Neo 3 GPU
  from GSMArena (Fonearena says Mali-G510, likely a typo); realme 9 thickness
  left out of the launch extract (post says 7.99 and 7.9 mm); Narzo 50 / 9i
  storage are UFS 2.1 (not in the rank list); Narzo 50i Prime has Wi-Fi 4 and
  microUSB (not recorded), 720p selfie video not recorded; 10 launch post says
  both AMOLED and Super AMOLED, 10 Pro both 6.7" and 6.72"; GSMArena "typical"
  brightness and market-dependent NFC not recorded. 13 substantive
  disagreements logged in CONFLICTS.md (Wi-Fi, Bluetooth, resolution, 9 Pro+
  brightness, launch skin); LCD vs IPS LCD, aperture rounding, USB detail,
  OS-skin omissions and 0.05 mm rounding were not.

- Batch 8 (2026-11-12, second part): added realme GT 7 Dream Edition, Narzo 70
  Turbo, 13+, 13, 13 Pro+, 13 Pro, GT 6, GT 6T, Narzo 70, Narzo 70x, 12x,
  Narzo 70 Pro, 12+, 12, 12 Pro+, 12 Pro, Narzo 60x, 11, 11x, Narzo 60 Pro,
  Narzo 60, 11 Pro+ and 11 Pro as complete records (India price, base variant,
  colours and launch date from Fonearena India launch posts; the rest from those
  plus GSMArena GLOBAL pages; Narzo 70 Pro launch date is GSMArena's announcement
  date because the post gives no year). GT 7 Dream Edition specs other than
  price / variant / colour are the GT 7 launch-post spec list, which TelecomTalk
  says the Dream Edition shares, and the GT 7 GSMArena page (it lists the 16/512
  Aston Martin variant). Gaps: dimensions / weight left out for 13 Pro+, 13 Pro,
  11 Pro+, 11 Pro, Narzo 60 and Narzo 60 Pro (glass vs leather builds differ);
  GT 6 / GT 6T charging and Wi-Fi left out of the launch extract (post says 120W
  and 100W, "Wi-Fi 5 802.11 ax"; GSMArena's 120W / Wi-Fi 6 used); 12 Pro front
  camera and optical zoom not recorded (post says 16 and 32 MP, 2x and 4x);
  realme 12 / 13 launch OS from GSMArena (posts say "One UI 5.0" too); realme 13
  best video is 1440p (not in the rank list); in-display fingerprint type from
  GSMArena where posts don't say optical; GT 6T storage type is the 128GB
  variant's UFS 3.1; 2023 models have no IP rating stated; OS-update counts not
  recorded as years; NFC left out where GSMArena says market dependent.
  10 substantive disagreements logged in CONFLICTS.md (brightness, Wi-Fi,
  Bluetooth, weight, aperture, sensor size, GT 7 DE video); rounding, USB detail,
  OLED vs AMOLED and 6.7" vs 6.67" were not.

- Batch 8 (2026-11-11, first part): added realme 16x, Narzo 100x, 16T, Narzo
  100 Lite, 16, Narzo Power, 16 Pro+, 16 Pro, Narzo 90, Narzo 90x, 15x, 15T,
  15 Pro, 15, Narzo 80 Lite 5G, GT 7, GT 7T, Narzo 80 Pro, Narzo 80x, 14T,
  14 Pro+, 14 Pro, 14x and GT 7 Pro as complete records (India price, base
  variant and launch date from Fonearena / TelecomTalk / Digit / MySmartPrice /
  India TV launch reports; the rest from those plus GSMArena). Still to add:
  everything realme launched in India before Nov 2024 (see the batch row), and
  the P-series and C-series, which are not in any batch yet. Gaps: Narzo 90 /
  90x IP rating (report gives two); 16 Pro+ / 14 Pro / 14 Pro+ dimensions or
  weight (two builds); 16 and Narzo 80x / 80 Lite launch OS (report
  contradicts itself); 15x charging watts in the launch extract; Narzo 100x and
  16 GSMArena pages were still marked preliminary; OS-update counts not
  recorded as years. 32 substantive disagreements logged in CONFLICTS.md
  (many Wi-Fi 6 vs Wi-Fi 5 and brightness figures: Indian reports vs GSMArena).

- Batch 7 (2026-11-11): added POCO M8 Power, M8x 5G, X8 Pro, M8 5G, M7 Plus, F7,
  M7 5G, X7 Pro, X7, M7 Pro, M6 Plus, F6, X6 Pro, X6, M6 5G, M6 Pro 5G, F5,
  X5 Pro, M5, F4, M4 5G, X4 Pro and M4 Pro as complete records: India price,
  base variant, colours and launch date from Fonearena India launch posts (F4,
  F5 and M8 Power launch dates from TelecomTalk, Business Today and The Tech
  Outlook; M6 5G date marked not verified), the rest from those posts plus
  GSMArena GLOBAL pages. IP52 added to the rank list after IP53 (registry
  2026.11.11). POCO M5s left out (no India launch found); F8 Pro not yet
  launched in India (event 26 Nov 2026), add it next time. Gaps: M8 Power and
  M8x 5G have no GSMArena data (pages wouldn't load), so they lack video, Wi-Fi,
  fingerprint type and (M8 Power) IP rating (the report says both IP64 and
  IP65); Fonearena's "Wi-Fi 6 802.11 ac"-style lines were treated as
  self-contradictory and left out; X6 Pro / X7 / X7 Pro weight, thickness or
  back material left out where two builds differ; F6 screen size/type left out
  of the launch extract (report says 6.67" and 6.7"); X7 Pro main sensor left
  out (report misspells it); OS-update counts not recorded as years; NFC left
  out where GSMArena says market-dependent. 23 substantive disagreements
  (weight, Bluetooth, Wi-Fi, IP, resolution, GPU, aperture) logged in
  CONFLICTS.md; rounding, "OLED vs AMOLED", USB detail and CPU-detail
  differences were not.

- Batch 6 finished 2026-11-10: added Redmi Note 13 Pro+ / 13 Pro / 13 5G, Note 12
  (4G), Xiaomi 13 Pro, Redmi Note 12 Pro+ / 12 Pro / 12 5G, Note 11 SE, Xiaomi 12
  Pro, Redmi Note 11 Pro+ / 11 Pro / 11S / 11, Xiaomi 11T Pro, 11i HyperCharge,
  11i and Redmi Note 11T 5G as complete records (India price, base variant and
  launch date from Fonearena / TelecomTalk launch reports; the rest from those
  reports plus GSMArena GLOBAL pages). Gaps: NFC left out where GSMArena says
  "market/region dependent"; OS-update promises given as a count ("3 Android
  updates") not recorded as years; Note 13 Pro+ weight (dimensions are
  GSMArena's) and Xiaomi
  13 Pro weight, thickness, storage type and eSIM left out (sources list two
  builds); Xiaomi 13 Pro Wi-Fi is GSMArena's 6E (Indian reports say Wi-Fi 7);
  Note 12 Pro+ main sensor left out (reports say HMX vs HPX); Xiaomi 11i /
  HyperCharge screen size from GSMArena (TelecomTalk says 6.6"); Note 11 Pro
  and Note 11 prices are the introductory launch prices. Only substantive
  disagreements (battery, Wi-Fi, Bluetooth, aperture, weight) were logged in
  CONFLICTS.md; rounding (dimensions to 0.1 mm), naming detail (AMOLED vs
  Super AMOLED, USB detail, OS skin suffix) and GSMArena's global colours and
  announcement dates were not.

- Batch 6 (2026-11-09, first part): added Xiaomi 17T, 17, 15 Ultra, 15, 14 Ultra,
  14, 14 CIVI and Redmi Note 15 Pro, Note 15 5G, Note 14 Pro+, Note 14 Pro,
  Note 14 5G from Indian launch reports, mi.com/in spec pages and GSMArena.
  Gaps: Xiaomi 17T India launch date is not verified (only a linked
  headline) and its Wi-Fi is mi.com/in's Wi-Fi 6 (Fonearena says both 6 and 7);
  Xiaomi 15 / 15 Ultra Wi-Fi left out (mi.com/in Wi-Fi 6, others Wi-Fi 7);
  Xiaomi 17 battery is the global 6330 mAh; 14 CIVI sensor size / aperture from
  GSMArena (Fonearena contradicts itself), no IP rating stated; Redmi Note 15
  Pro OS is HyperOS 3 per mi.com/in (GSMArena says HyperOS 2); no update-years
  for the Xiaomi 15/17 series or Note 15 series; Note 14 Pro+ GPU disagreement
  logged in CONFLICTS.md.

- Batch 5 (2026-11-07): added 27 OnePlus phones (Nord CE 6 / CE 6 Lite / 6, 15R,
  Nord 5 / CE 5, 13s, 13 / 13R, Nord 4 / CE 4 Lite / CE 4, 12 / 12R, Open,
  Nord 3 / CE 3 / CE 3 Lite, 11 / 11R, 10T, Nord 2T, 10R, Nord CE 2 Lite,
  10 Pro, Nord CE 2, 9RT) as complete records from Indian launch reports plus
  GSMArena. OnePlus N6 and N6x added 2026-11-09 (N6 frame left out: oneplus.in says
  metal frame, GSMArena plastic; N6 fingerprint type, Wi-Fi and Bluetooth version
  not stated; N6x headphone jack only in a headline that wouldn't load). OnePlus 15s and Open 2 did not launch in India. Gaps: Nord CE 6 Lite
  (GSMArena page wouldn't load; oneplus.in gives no dimensions, weight,
  resolution or connectivity), 13 / 15R weight and 15R dimensions (GSMArena lists
  two builds), Open IP rating (GSMArena says IPX4, not in the rank list) and
  launch OS (sources disagree), 10 Pro IP rating and main-camera OIS, 9RT
  speakers. Launch dates for these are the India launch dates where the report
  gave one, otherwise GSMArena's announcement date. Galaxy S21 FE is the
  Exynos 2100 India launch model (Jan 2022).

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
