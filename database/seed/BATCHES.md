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
   (IP69K → `IP69`).
8. Run the tests before pushing; `validatePhoneRecords` must return no issues.

## Batches

| # | Scope | Phones | Status |
|---|---|---|---|
| 0 | Pixel 11, iPhone 18 Pro, Galaxy S26 | 3 | ✅ Done 2026-11-02 |
| 1 | Newest top model per remaining brand | 12 | ✅ Done 2026-11-02 |
| 2 | Samsung Galaxy S and Z series, 2022–2026 | ~20 | Pending |
| 3 | Apple iPhone 14 – 18 series | ~20 | Pending |
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

- Most launch reports omit weight, Wi-Fi version, eSIM and update policy.
  A pass over manufacturer spec pages would fill many of these.
- No benchmark or battery-endurance data yet; those need independent tests
  with the test version recorded.
- Once the catalogue passes ~100 phones, split `phones.json` per brand and load
  phones in the demo on demand instead of bundling them all.
