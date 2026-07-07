# Template Testing Specification

> Use this document to verify templates against all crew data fields and boat classes.
> Run it manually via the app's generate flow, or as a reference when building new templates.

---

## How to Run Tests

1. Start the dev server: `npm run dev`
2. Create test crews below (or use existing ones that match the boat class)
3. Go to **Generate** → select the crew + template → generate
4. Check the output image against the per-template checklist
5. Repeat for each boat class in the matrix

---

## Canonical Test Crews

One crew per boat class. All crews should use the **same club** (with a logo uploaded) to test logo rendering.

### Club Setup
| Field | Value |
|-------|-------|
| Club Name | **Henley RC** |
| Primary Color | `#1e3a8a` (navy) |
| Secondary Color | `#fde047` (gold) |
| Logo | Upload any PNG/JPEG logo |

### TC-8P: Eight (8+)
| Field | Value |
|-------|-------|
| Crew Name | `Oxford Blue Boat` |
| Boat Code | `8+` |
| Race Name | `Henley Royal Regatta` |
| Race Category | `M1 Senior Men Open 8+` |
| Boat Name | `Black Prince` |
| Coach | `Sean Bowden` |
| Race Date | `2025-06-29` |
| Club | Henley RC (linked) |
| Crew Members (1→9) | Cox: James Hart, Stroke: Will Foster, 7: Tom Reed, 6: Sam Clarke, 5: Ben Walsh, 4: Jack Turner, 3: Alex Moore, 2: Dan Hill, Bow: Chris Lamb |

> **Note:** In the app, member 1 = cox for coxed boats. Enter cox name first, then stroke → bow.

### TC-4P: Coxed Four (4+)
| Field | Value |
|-------|-------|
| Crew Name | `Dev Four` |
| Boat Code | `4+` |
| Race Name | `National Championships` |
| Race Category | `W1 Senior Women Open 4+` |
| Boat Name | `Lady Grey` |
| Coach | `Emma Willis` |
| Race Date | `2025-07-12` |
| Club | Henley RC (linked) |
| Crew Members (1→5) | Cox: Lily Chen, Stroke: Sophie Ward, 3: Alice Brown, 2: Grace Lee, Bow: Mia Scott |

### TC-4M: Coxless Four (4-)
| Field | Value |
|-------|-------|
| Crew Name | `Club Four` |
| Boat Code | `4-` |
| Race Name | `Spring Regatta` |
| Race Category | `M2 Club Men Coxless 4` |
| Boat Name | `Harrier` |
| Coach | `Rob Jenkins` |
| Race Date | `2025-04-19` |
| Club | Henley RC (linked) |
| Crew Members (1→4) | Stroke: Nick Webb, 3: Paul Day, 2: Luke Finn, Bow: Adam Cox |

### TC-4X: Quad Sculls (4x)
| Field | Value |
|-------|-------|
| Crew Name | `Junior Quad` |
| Boat Code | `4x` |
| Race Name | `Junior Sculling Head` |
| Race Category | `J18 Junior Men Quad` |
| Boat Name | `Osprey` |
| Coach | `David Marks` |
| Race Date | `2025-09-06` |
| Club | Henley RC (linked) |
| Crew Members (1→4) | Stroke: Ollie Sharp, 3: Harry Knight, 2: Finn Park, Bow: Jake Mills |

### TC-2M: Coxless Pair (2-)
| Field | Value |
|-------|-------|
| Crew Name | `Masters Pair` |
| Boat Code | `2-` |
| Race Name | `Masters Regatta` |
| Race Category | `MasD Mixed Pair` |
| Boat Name | `Peregrine` |
| Coach | `Ian Ross` |
| Race Date | `2025-08-03` |
| Club | Henley RC (linked) |
| Crew Members (1→2) | Stroke: Peter Black, Bow: Kate Aldridge |

### TC-2X: Double Sculls (2x)
| Field | Value |
|-------|-------|
| Crew Name | `Double Act` |
| Boat Code | `2x` |
| Race Name | `Sculling Festival` |
| Race Category | `W Senior Double` |
| Boat Name | `Kingfisher` |
| Coach | `Sarah Holt` |
| Race Date | `2025-05-17` |
| Club | Henley RC (linked) |
| Crew Members (1→2) | Stroke: Nina Torres, Bow: Chloe Marsh |

### TC-1X: Single Sculls (1x)
| Field | Value |
|-------|-------|
| Crew Name | `Championship Single` |
| Boat Code | `1x` |
| Race Name | `Diamond Sculls` |
| Race Category | `M Senior Single Sculls` |
| Boat Name | `Mercury` |
| Coach | `Bill Payne` |
| Race Date | `2025-06-29` |
| Club | Henley RC (linked) |
| Crew Members (1) | Tom Whitfield |

---

## Universal Criteria (Every Template)

Every template must pass these regardless of boat class or colour scheme:

- [ ] **No unresolved placeholders** — no `{{...}}` literals visible in the output
- [ ] **No layout overflow** — text does not bleed outside the 1080×1080 canvas
- [ ] **Race name renders** — `{{RACE_NAME}}` is visible
- [ ] **Coach name renders** — `{{COACH_NAME}}` is visible
- [ ] **Crew category renders** — `{{crewCategory}}` is visible
- [ ] **All crew members shown** — correct count for the boat class (see matrix)
- [ ] **Correct seat badges** — Bow=`B`, Stroke=`S`, numbered seats, Cox=`C`, Sculler=`1x`
- [ ] **Club logo shows when linked** — logo appears inside the `{{#clubLogo}}` block
- [ ] **Club logo hidden when absent** — no broken `<img>` or empty box when no logo
- [ ] **Color scheme applies** — primary + secondary colors replace the default green/pink
- [ ] **Dark/light colors contrast** — text on primary-colored backgrounds is legible (contrast auto-calc)
- [ ] **1x boat: single sculler** — only one crew row, badge `1x`, no empty seats

---

## Data Fields Reference

All data fields available from a crew record and where they appear:

| Source Field | Template Variable | Used By Templates |
|---|---|---|
| `raceName` | `{{RACE_NAME}}` | All (1–21) |
| `coachName` | `{{COACH_NAME}}` | All (1–21) |
| `raceCategory` + `boatName` | `{{crewCategory}}` | All except T2 |
| `raceCategory` | `{{RACE_CATEGORY}}` | T2 only |
| `club.name` / `clubName` | `{{CLUB_NAME}}` | T14, T18, T19, T20 |
| `club.logoUrl` | `{{clubLogo}}` | All (conditional block) |
| `boatCode` → derived | `{{BOAT_TYPE}}` | T4, T6, T8, T9, T11, T16, T17, T20 |
| `boatCode` | `{{BOAT_CODE}}` | T4, T5, T6, T8, T9, T11, T14, T16, T17, T18, T20 |
| `crewNames` — **Layout A**: cox included in main list with badge `C` | `{{#crewMembers}}` | T1, T5–T7, T10, T13–T21 |
| `crewNames` — **Layout B**: cox in its own styled section, rowers separate | `{{#hasCox}}` + `{{COX_NAME}}` + `{{#crewMembersNoCox}}` | T3, T4, T8, T9, T11, T12 |
| `crewNames` — **Layout C**: Bow→Stroke order with abbreviated position labels | `{{#CREW_MEMBERS}}` | T2 |
| `boatCode` → SVG | `{{BOAT_IMAGE}}` | T1, T2, T4, T17 |
| `raceDate` | `{{EDITION_TEXT}}` | T20 |
| `raceDate` | `{{RACE_DATE}}` | (conditional, none currently use it) |
| — | `{{SHEET_NUMBER}}` / `{{TOTAL_SHEETS}}` | T17 |
| — | `{{seatLabel}}` | T18 |

> **All three layouts show every crew member including cox.** Layout A puts cox in the same list (badge `C`). Layout B gives cox a visually distinct row above the rowers — useful for templates where cox deserves special placement. Layout C reverses the list to Bow→Stroke order with abbreviated labels.

### Fields NOT displayed by any template
These are populated but currently unused — gaps for future template improvements:

- `CREW_NAME` — the crew's own name (e.g. "Oxford Blue Boat") is never shown
- `RACE_DATE` — raw date not rendered (only T20 shows `EDITION_TEXT` derived from it)
- `BOAT_NAME` — used in `crewCategory` string only, not shown standalone

---

## Per-Template Checklists

### Template 1 — Diagonal Split

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name + positionStyle), `#BOAT_IMAGE_AVAILABLE` / `BOAT_IMAGE`

| Check | Pass? |
|-------|-------|
| Race name in header diagonal panel | |
| Coach name visible | |
| Crew category line visible | |
| All members listed with correct badge (B, 2…S for 8+; 1x for 1x) | |
| Boat image renders for coxed/coxless boats with available SVG | |
| Boat image gracefully absent for boat codes with no SVG | |
| Club logo in corner when linked | |
| No logo box when not linked | |
| 8+ crew (9 rows): no overflow | |
| 1x crew (1 row): single row, no empty rows | |
| Position style offsets don't overlap names | |

---

### Template 2 — Corner L-Brackets

**Variables used:** `RACE_NAME`, `COACH_NAME`, `RACE_CATEGORY`, `clubLogo`, `#CREW_MEMBERS` (POSITION + NAME), `#BOAT_IMAGE_AVAILABLE` / `BOAT_IMAGE`

| Check | Pass? |
|-------|-------|
| Race name renders | |
| Coach name renders | |
| Race category renders (optional — hidden when absent) | |
| Crew in Bow→Stroke order (reversed from entry) with cox at end | |
| Abbreviated position labels (B, 2, 3…S, C) | |
| Boat image renders when available | |
| Club logo in corner when linked | |
| 8+ crew: all 9 rows visible, no overflow | |
| 2x crew: 2 rows only (B + S) | |

---

### Template 3 — Editorial

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#hasCox` / `COX_NAME`, `#crewMembersNoCox` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name in giant headline | |
| Crew category subtitle visible | |
| Coach name visible | |
| Cox row shows only for coxed boats (8+, 4+) | |
| Cox row hidden for coxless boats (4-, 4x, 2-, 2x, 1x) | |
| Rowers-only list correct count (8 for 8+, 4 for 4-, 1 for 1x) | |
| Club logo when linked | |
| 2-col layout not broken for small boats (2x = 2 rowers) | |

---

### Template 4 — Grid / Professional Layout

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `COX_NAME`, `#hasCox`, `#crewMembersNoCox`, `clubLogo`, `#BOAT_IMAGE_AVAILABLE` / `BOAT_IMAGE`

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat type + code visible | |
| Coach name visible | |
| Crew category visible | |
| Boat image renders when SVG available | |
| Cox shown in separate row for 8+, 4+ | |
| Cox hidden for 4-, 4x, 2-, 2x, 1x | |
| Rowers-only list shows correct count | |
| Club logo when linked | |
| Position badges use positionStyle CSS offsets (no overlap with boat image) | |

---

### Template 5 — Vertical Rail

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_CODE`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat code badge visible | |
| Crew category visible | |
| Coach name visible | |
| All members listed | |
| Club logo when linked | |
| Secondary rail not clipped | |
| 8+ crew: 9 rows fit in right column | |
| 1x crew: 1 row, no empty padding issues | |

---

### Template 6 — Scoreboard

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name in scoreboard header | |
| Boat type + code visible | |
| Crew category visible | |
| Coach name visible | |
| Scoreboard rows render for all members | |
| Dark primary background: text legible (uses `--on-primary`) | |
| Club logo when linked | |
| 8+ crew: all 9 rows, no overflow | |

---

### Template 7 — Oar Per Rower

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Coach name visible | |
| Crew category visible | |
| One oar element rendered per crew member | |
| Badge on each oar | |
| Club logo in right column when linked | |
| 8+ crew: 9 oars, none overlap | |
| 1x crew: 1 oar renders cleanly | |
| 2x crew: 2 oars render cleanly | |

---

### Template 8 — Ticket Stub

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `COX_NAME`, `#hasCox`, `#crewMembersNoCox`, `clubLogo`

| Check | Pass? |
|-------|-------|
| Race name in ticket header | |
| Boat type + code visible | |
| Crew category visible | |
| Coach name visible | |
| Stub section: cox name shown for 8+, 4+ | |
| Stub section: cox row hidden for 4-, 4x, 2-, 2x, 1x | |
| Rowers list correct count | |
| Club logo when linked | |
| Ticket tear line renders correctly | |

---

### Template 9 — Stacked

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `COX_NAME`, `#hasCox`, `#crewMembersNoCox`, `clubLogo`

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat type + code visible | |
| Crew category visible | |
| Coach name visible | |
| Cox row above crew list for 8+, 4+ | |
| Cox row hidden for coxless boats | |
| Rowers list stacked below cox | |
| Club logo when linked | |
| 8+ crew: cox + 8 rows, no overflow | |

---

### Template 10 — Cork Board

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name on pinned card | |
| Crew category visible | |
| Coach name visible | |
| All members on cork-board card | |
| Pin element renders at top of card | |
| Club logos on both sides (if linked) | |
| Background texture visible | |
| 8+ crew: 9 rows, card doesn't overflow cork board | |

---

### Template 11 — Metallic Plaque

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `COX_NAME`, `#hasCox`, `#crewMembersNoCox`, `clubLogo`

| Check | Pass? |
|-------|-------|
| Race name engraved in header | |
| Boat type + code visible | |
| Crew category visible | |
| Coach name visible | |
| 2-col crew grid renders correctly | |
| Cox shown separately for 8+, 4+ | |
| Cox hidden for coxless boats | |
| Brushed-silver effect visible | |
| Club logo when linked | |
| Colors applied over metallic base (not washed out) | |

---

### Template 12 — Crew Badge / Grosgrain Ribbon

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `COX_NAME`, `#hasCox`, `#crewMembersNoCox`, `clubLogo`

| Check | Pass? |
|-------|-------|
| Race name on badge | |
| Crew category visible | |
| Coach name visible | |
| Club logo bottom-center when linked | |
| Ribbon element renders | |
| Cox footer shows for 8+, 4+ | |
| Cox footer hidden for coxless boats | |
| Rowers list fits within badge card | |
| 8+ crew: 8 rowers + cox footer, no overflow | |

---

### Template 13 — Spiral Notebook

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name on notebook page | |
| Crew category visible | |
| Coach name visible | |
| Notebook spiral binding renders | |
| All member rows on lined page | |
| Club logo when linked | |
| 8+ crew: 9 rows fit on page | |
| 1x crew: 1 row, no empty ruled lines that look broken | |

---

### Template 14 — Starting Formation

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_CODE`, `CLUB_NAME`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Club name text visible | |
| Boat code visible | |
| Crew category visible | |
| Coach name visible | |
| Pitch/water background visible | |
| All member positions on pitch | |
| Club logo when linked | |
| Positions don't overlap for 8+ | |
| 1x: single position renders cleanly | |

---

### Template 15 — Departure Board

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name in departure header | |
| Crew category visible | |
| Coach name visible | |
| Crew list in left panel | |
| Club logo in right panel when linked | |
| Flip-board character aesthetic maintained | |
| 8+ crew: 9 rows, no right-panel overflow | |

---

### Template 16 — Lane Card

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat type + code visible | |
| Crew category visible | |
| Coach name visible | |
| Buoy badge per rower renders | |
| Club logo when linked | |
| Lane card border/frame renders | |
| 8+ crew: 9 buoy badges, no overflow | |

---

### Template 17 — (Sheet / Book Layout)

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `SHEET_NUMBER`, `TOTAL_SHEETS`, `clubLogo`, `#crewMembers`, `#BOAT_IMAGE_AVAILABLE` / `BOAT_IMAGE`

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat type + code visible | |
| Sheet number (1) and total (1) visible | |
| Crew category visible | |
| Coach name visible | |
| Boat image renders when available | |
| All members listed | |
| Club logo when linked | |
| 8+ crew: no overflow | |

---

### Template 18 — (Seat Label Layout)

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_CODE`, `CLUB_NAME`, `clubLogo`, `#crewMembers` (name + **seatLabel** instead of badge)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Boat code visible | |
| Club name text visible | |
| Crew category visible | |
| Coach name visible | |
| **Seat labels** render (e.g. "Bow", "2 Seat", "Stroke", "Cox") not badge codes | |
| Club logo when linked | |
| 8+ crew: all 9 seat labels, no overflow | |
| 1x crew: single "Stroke" seat label | |

---

### Template 19 — (Club Name + Badge)

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `CLUB_NAME`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Club name text visible | |
| Crew category visible | |
| Coach name visible | |
| All members with badge visible | |
| Club logo when linked | |
| 8+ crew: no overflow | |

---

### Template 20 — (Edition / Newspaper)

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `BOAT_TYPE`, `BOAT_CODE`, `CLUB_NAME`, `EDITION_TEXT`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name as headline | |
| Boat type + code visible | |
| Club name visible | |
| Edition text (from race date) visible | |
| Crew category visible | |
| Coach name visible | |
| All members listed | |
| Club logo when linked | |
| Newspaper layout not broken for small crews (2x, 1x) | |

---

### Template 21

**Variables used:** `RACE_NAME`, `COACH_NAME`, `crewCategory`, `clubLogo`, `#crewMembers` (badge + name)

| Check | Pass? |
|-------|-------|
| Race name visible | |
| Crew category visible | |
| Coach name visible | |
| All members listed with badge | |
| Club logo when linked | |
| 8+ crew: no overflow | |

---

## Boat Class × Template Matrix

Mark each cell when tested. `✓` = pass, `✗` = fail (note issue), `-` = not yet tested.

| | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10 | T11 | T12 | T13 | T14 | T15 | T16 | T17 | T18 | T19 | T20 | T21 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **8+** TC-8P | | | | | | | | | | | | | | | | | | | | | |
| **4+** TC-4P | | | | | | | | | | | | | | | | | | | | | |
| **4-** TC-4M | | | | | | | | | | | | | | | | | | | | | |
| **4x** TC-4X | | | | | | | | | | | | | | | | | | | | | |
| **2-** TC-2M | | | | | | | | | | | | | | | | | | | | | |
| **2x** TC-2X | | | | | | | | | | | | | | | | | | | | | |
| **1x** TC-1X | | | | | | | | | | | | | | | | | | | | | |

---

## Known Data Gaps

These fields exist in the crew record but are currently not displayed by any template:

| Field | Status | Notes |
|-------|--------|-------|
| `CREW_NAME` | Unused | The crew's own name (e.g. "Oxford Blue Boat") is never rendered |
| Raw `RACE_DATE` | Unused | T20 shows `EDITION_TEXT` derived from it; no template shows the raw date |
| `BOAT_NAME` | Partially used | Folded into `crewCategory` string only; never shown standalone |
| `category` (DB) | Unused | Separate from `raceCategory`; not passed to templates |

---

## Adding a New Template — Checklist

When creating template 22+, verify before shipping:

- [ ] Uses `{{RACE_NAME}}` — race name is the primary piece of information
- [ ] Uses `{{COACH_NAME}}` — coach always appears
- [ ] Uses `{{crewCategory}}` — provides context (e.g. "Black Prince - M1 Senior Men Open 8+")
- [ ] Uses `{{#clubLogo}}...{{/clubLogo}}` — conditional so it gracefully hides when absent
- [ ] Uses `{{#crewMembers}}` or `{{#crewMembersNoCox}}` (not hardcoded seat rows)
- [ ] Cox is handled: either `{{#hasCox}}{{COX_NAME}}{{/hasCox}}` + `crewMembersNoCox`, or `crewMembers` (which includes cox already)
- [ ] Color placeholders use `#094e2a`/`#15803d` for primary and `#f3bfd4`/`#f9a8d4` for secondary
- [ ] If boat image needed: uses `{{#BOAT_IMAGE_AVAILABLE}}{{BOAT_IMAGE}}{{/BOAT_IMAGE_AVAILABLE}}`
- [ ] Preview PNG added to `public/templates/previews/template-N.png`
- [ ] Seeded via `scripts/seed-prod-templates.ts`
- [ ] Run boat class matrix: all 7 boat classes tested (especially 1x for single-rower edge case)
