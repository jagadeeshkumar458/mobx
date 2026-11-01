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

## Batches

| # | Scope | Phones | Status |
|---|---|---|---|
| 0 | Pixel 11, iPhone 18 Pro, Galaxy S26 | 3 | ✅ Done 2026-11-02 |
| 1 | Newest top model per remaining brand | 12 | ✅ Done 2026-11-02 |
| 2 | Samsung Galaxy S and Z series, 2022–2026 | 29 | Partial 2026-11-02 (S21 FE missing) |
| 3 | Apple iPhone SE (2022), 14 – 18 series, 16e, 17e, Air, Duo | 21 | ✅ Done 2026-11-02 (thin records, see gaps) |
| 4 | Google Pixel 6a – 11 series | ~15 | Pending |
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
- Batch 3: iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max, 17 / Air / 17 Pro, 17e and
  iPhone Duo records are thin (launch reports gave few specs). Fill from
  apple.com/in/<model>/specs or support.apple.com tech-spec pages. Apple doesn't
  publish battery mAh; the 16-series and SE figures are marked not verified.
  "8x" zoom quoted for the 17 Pro / Pro Max and 18 Pro Max is Apple's
  optical-quality zoom, not true optical, so it was left out.

- Most launch reports omit weight, Wi-Fi version, eSIM and update policy.
  A pass over manufacturer spec pages would fill many of these.
- No benchmark or battery-endurance data yet; those need independent tests
  with the test version recorded.
- Once the catalogue passes ~100 phones, split `phones.json` per brand and load
  phones in the demo on demand instead of bundling them all.
