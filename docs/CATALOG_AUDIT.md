# Catalog audit and launch scope

Baseline: `19382b8`. Every historical ID and associated model is inventoried in [legacy-audit.json](../data/catalog/history/legacy-audit.json). Raw historical catalog data is preserved in [baseline-19382b8.json](../data/catalog/history/baseline-19382b8.json).

The baseline held 188 identities and 142 STEP files (98 Onshape exports and 44 replacements). 140 records had no explicit diameter unit. The fallback generator used fixed defaults, the model origin disagreed with the placement packet, and file existence was the only serving gate. All historical models were conservatively withdrawn; none is considered checked based on generation history. Historical bodies can be recovered from Git for a future independent audit. No identity was silently corrected or reassigned.

## Checked launch coverage

| Family | Identities | Simplified | Detailed | Installation |
| --- | ---: | ---: | ---: | --- |
| Hex-head reference bolts, DIN 933, M3–M6 × 20 | 4 | 4 | 0 | Explicit unavailable |
| Socket screws, ISO 4762, M6 × 10/12/16/20/25 and M3/M4 × 12 references | 7 | 7 | 4 | Explicit unavailable |
| Countersunk reference screws, DIN 7991, M3–M6 × 20 | 4 | 4 | 0 | Explicit unavailable |
| A2 hex nuts, DIN 934, M3–M6 | 4 | 4 | 0 | Explicit unavailable |
| A2 flat washers, DIN 125, M3–M6 | 4 | 4 | 0 | Explicit unavailable |
| HELICOIL Plus Free Running 4130, A2, M3–M6, 1.5d | 4 | 4 | 0 | Sourced, conditional |

Total: 27 identities, 31 variants, six families. No verified unified-thread coverage. Sources and field locators are in `data/catalog/sources.json` and each part's dimensions/evidence.

Socket/nut/washer supplier dimensions were read from Bolt Depot's individual product pages. Price and exact selected 10-piece Monster Bolts variant observations were inspected live in the browser on September 22, 2026 UTC (September 21 local). The five matching socket sizes use Bolt Depot SKUs 6416, 6417, 6418, 6419, 6420 and Monster Bolts variants 36230284044, 36230284172, 36230284300, 36230284492, 36230284620. The selected US/USD context was visible. Stock and delivery were not independently established and remain unknown. Bolt Depot's displayed per-piece tier thresholds at 100 and 1,000 pieces were preserved with fractional-cent precision. Other Monster pack variants are outside the checked comparison scope.

Nuts 4773–4776 and washers 4513–4516 give eight additional exact links. There are 18 mapped products across 13 parts, including five parts with prices from both suppliers. No generic supplier search link is labeled an exact match. Grades/finishes not stated remain null; these mappings do not satisfy requests that require an unverified property class or finish.

BOLTS dimensional tables at commit `05a2acd1f77737789a313b4c77f1f8eea35da256` provide the material-independent reference families and socket recess dimensions. Chosen catalog lengths are explicit input parameters permitted by those tables, not claimed as separately observed supplier variants. The original source has **LGPL-2.1-or-later**, not the MIT label in historical data. No BOLTS CAD recipe code was copied.

Böllhoff's HELICOIL Plus catalog printed pages 23–24 were rendered and visually checked. The 1.5d rows provide product numbers, nominal installed length, holding-thread dimensions and suggested drill diameters. Page 23 distinguishes these from uninstalled diameter and provides seating and blind-hole conventions. The model uses a nominal annular representation from d, t2 and minimum DHC. It is explicitly neither an actual wire solid nor a maximum clearance envelope. D1HC, drilling, tap runout, blind depth, tang handling and seating depth remain installation fields. Uninstalled geometry is unsupported.

## Retained limits

The standard-reference models intentionally omit threads, chamfers and fillets. Simplified screw models also omit the hex socket; detailed socket models add its sourced width/depth. Nut bores use nominal screw diameter and therefore omit female teeth. Numerical checks use 0.01 mm as a software threshold; this is not a manufactured tolerance or certification. Source limits are separately preserved in the catalog.
