# FC27 Database Delta Audit

Generated: 2026-09-15T13:44:09.840Z

## A. Count check

| Dataset | Records | Unique EA IDs |
|---|---:|---:|
| Local snapshot | 20689 | 20689 |
| EA live | 19789 | 19789 |

- In both: 19267
- Only local: 1422
- Only EA live: 522

## D. Changed players

- overall: 0\n- pace: 0\n- shooting: 0\n- passing: 0\n- dribbling: 0\n- defending: 0\n- physical: 0\n- club: 3678\n- league: 975\n- position: 0\n- nationality: 0

## E. PlayStyle coverage

- At least one base: 8042
- No base PlayStyle: 11747
- At least one Plus: 184
- Catalog: 36 base + 36 Plus; unmatched player abilities: 0
- Base distribution: {"0":11747,"1":3647,"2":2150,"3":1141,"4":628,"5":311,"6":146,"7":19}
- Plus distribution: {"0":19605,"1":184}

## F. Import safety

The endpoint returned 198 pages; page 198 returned 89 items. 19789 records were fetched and all 19789 EA IDs were unique. This proves pagination completeness for the currently reported EA catalog, not that the catalog delta has been approved.

The complete ID-level removed/added lists, summaries, catalog, and last-page IDs are in `fc27-database-delta-audit.json`.
