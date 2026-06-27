# RowGram — Template Authoring Prompt

Use this as the brief whenever you generate a **new crew-lineup template** for RowGram.
Paste it (or point to it) and describe the design direction you want. Everything below
is a hard contract unless the request explicitly overrides it.

---

## WHAT ROWGRAM IS

RowGram renders HTML/CSS templates **server-side with Puppeteer (headless Chrome)** to
produce **1080×1080px PNG** social posts that rowing clubs share on Instagram/Facebook to
announce race lineups. Each template is a self-contained `templateN/` folder with one
`.html` + one `.css`. There is **no JavaScript at render time, no animation, no
interactivity** — it's a single static paint that gets screenshotted.

---

## TECHNICAL CONSTRAINTS (non-negotiable)

- **Canvas: exactly 1080×1080px.** No responsive design, no media queries, no `vw/vh`.
- `html, body { width: 1080px; height: 1080px; overflow: hidden; }` — no scrollbars.
- **Font: Inter only**, loaded via:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ```
- **Output: separate linked files** — `templateN.html` + `templateN.css`. No inline
  `<style>` blocks, no inline `style=""` attributes carrying layout (the colour-swap
  step needs the hex values to live in CSS / SVG attributes — see below).
- The HTML links its CSS as a **sibling**: `<link rel="stylesheet" href="templateN.css">`
  (NOT `../templateN/...` — that path is only for the preview files in `uploads/`).
- Layout via **absolute positioning or fl/grid inside the 1080 box**. Either is fine; the
  existing set mixes both. Whatever keeps 9 names from ever overflowing or clipping.

---

## COLOR SYSTEM (critical — this is how theming works)

Two club colours are injected at render time by **find-and-replace on exact hex strings**.
The placeholder values below are used during **design and development only** — at deploy time,
the **RowGram app replaces these with the actual club colours** configured in the app's admin
panel. You MUST use these literal placeholder values anywhere a club colour should appear —
in CSS, in inline SVG `fill`/`stroke` attributes, in gradients, everywhere:

| Role | Placeholder hex | Design as if it's… |
|------|-----------------|--------------------|
| **Primary** | `#094e2a` | a dark green |
| **Secondary** | `#f9a8d4` | a pink |

**⚠️ CRITICAL — Contrast & Visibility with Real Club Colours:**
- Clubs may choose **any colour** as their primary or secondary in the app — including
  white, black, navy, gold, or any other palette.
- Some clubs have **white or black** as one of their official colours. When the template is
  rendered with those actual club colours, white text on a white club colour (or black text
  on black) will become **completely invisible**.
- **Always design for maximum contrast** between text and its background. Never assume the
  placeholder colours will match the final club colours — they won't.
- For text that sits on a club-coloured background: consider using an **opacity overlay**,
  **drop shadow**, **outline**, **text stroke**, or a **contrasting background panel** to
  ensure legibility even if the club's actual colour matches your text colour.
- Test designs mentally with multiple scenarios: white club colour, black club colour,
  bright saturated colour, and dark colour to verify readability in all cases.

Rules:
- Both colours must feel **intentional and prominent** — not a thin accent border. Aim
  for at least one of them to carry a large field/area of the design.
- Put a **CSS comment on every line** that uses a placeholder, so the swap target is
  obvious and auditable:
  ```css
  background: #094e2a; /* PRIMARY COLOR PLACEHOLDER */
  border-color: #f9a8d4; /* SECONDARY COLOR PLACEHOLDER */
  ```
- **Tints/derived values count too.** If you use `rgba(9,78,42,0.15)` or a second green
  like `#f386c0` near the pink, mark it `/* PRIMARY COLOR PLACEHOLDER (tint) */` etc., and
  be aware the literal `#094e2a`/`#f9a8d4` substrings are what actually get swapped — a
  hand-mixed `rgba()` will NOT track the club colour, so only use those for subtle
  shading you're happy to leave fixed.
- **Neutrals are yours to choose and are NOT swapped**: ivory (`#f5f1e8`, `#f7f4ec`),
  charcoal (`#1a1a17`), white, near-blacks. These carry the "elevated" feel alongside the
  two club colours. Don't use a placeholder hex for something that should stay neutral.
- Design must read well for **any** club's two colours — assume they could be a light
  primary or a dark secondary. Don't rely on the green being dark or the pink being light
  for legibility (e.g. don't put pink text on white assuming it's "an accent").

---

## DATA CONTRACT (Handlebars-style placeholders)

These are replaced at render time. Use them **verbatim** in the template `.html`.

**Scalars:**
```
{{RACE_NAME}}      e.g. "Hammersmith Head 2025", "WEHORR 2025"
{{crewCategory}}   e.g. "M1 Senior Men | Open Club 8+", "Women's Eights"
{{BOAT_TYPE}}      e.g. "Eight", "Four", "Pair", "Single"
{{BOAT_CODE}}      e.g. "8+", "4+", "4-", "2-", "1x"
{{COACH_NAME}}     e.g. "Julian Smith" (may contain multiple names)
```

**Crew loop** — produces one block per rower, top-to-bottom **stroke → bow → cox**:
```html
{{#crewMembers}}
  <div class="crew-row">
    <span class="seat">{{badge}}</span>
    <span class="name">{{name}}</span>
  </div>
{{/crewMembers}}
```
- `{{badge}}` = seat label: `S` (stroke), `7 6 5 4 3 2`, `B` (bow), `C` (cox).
- `{{name}}` = athlete name, e.g. `"Sarah Johnson"`. Names can be long and
  double-barrelled (`"Emily Hartwell-Price"`, `"Alexandra MacKenzie"`) — design for that.
- `{{positionStyle}}` — a pre-computed inline positioning style string, available if a
  template wants the *engine* to place each row (only Template 1 used this). New templates
  normally position rows themselves via CSS `:nth-child`, or just stack them in flow.

**Conditional boat image** (top-down SVG: black hull ellipse + oars, no colour of its own):
```html
{{#BOAT_IMAGE_AVAILABLE}}
  <div class="boat-container">{{BOAT_IMAGE}}</div>
{{/BOAT_IMAGE_AVAILABLE}}
```
- `{{BOAT_IMAGE}}` injects an `<img>` of the boat SVG (~191×367px natural; scale freely).
- 8+ has 8 oars (4/side); 4+ has 4. It's **black** — if you place it on a dark field,
  flip it with `filter: invert(1);` so it reads.

**Conditional club logo** (a PNG crest/badge):
```html
{{#clubLogo}}<img class="club-logo" src="{{clubLogo}}" alt="Club Logo" />{{/clubLogo}}
```
- Keep it **present but not dominant: ~120–180px**, a corner or integrated tastefully.

> **Preview vs. source:** the live preview files in `uploads/previewN.html` use sample data
> + real `assets/` paths so they render. The shipped `templateN/templateN.html` uses the
> placeholders above and a sibling CSS link. When authoring, build the preview first to
> eyeball it, then derive the source by swapping sample data → placeholders and collapsing
> the 9 crew rows into one `{{#crewMembers}}` block.

---

## CREW SIZE

Design for the **largest crew: 8 rowers + 1 cox = 9 people** (plus a coach name). The
layout must **not overflow or clip with 9 names**. Smaller boats (4+, 2-, 1x) produce
fewer rows — the layout must still look balanced and intentional with as few as 1–4 names.
(Flow/auto-height lists handle this for free; fixed `:nth-child` positioning does not, so
prefer flow unless the concept needs spatial placement — see Templates 17/18.)

---

## QUALITY BAR

- Looks like a **professional rowing club** would post it — not a school project, not a
  generic "centred card with a box".
- **Crew names ≥ 28px** and always fully legible at 1080px. Never ellipsis-clip a name to
  make it fit — wrap it or resize the layout instead.
- **No overflow / no clipping** with 9 names. Verify the last row's bottom sits inside the
  canvas (and above any footer).
- Be **bold with colour and space.** Both club colours prominent.
- Each new template must be **genuinely distinct** in layout, mood and graphic approach
  from everything already in the set (list below) — a new *idea*, not a recolour.
- **Tone for elevated/regatta requests:** restraint, hairline rules, generous margins,
  ivory/charcoal neutrals, refined type (letter-spacing on small caps, italic coach line).
  Lean into real rowing culture — blazers, burgees, programmes, silverware, the Tideway,
  deco posters — over generic "sporty".
- **Avoid AI-slop tropes:** no unexplained gradients, no emoji, no rounded-card-with-
  left-border-accent, no decorative stat/number filler. Every element earns its place.
- **Do not hand-draw the boat in SVG** — use the `{{BOAT_IMAGE}}` slot. Other small
  graphic flourishes (frames, rosettes, chevrons, a course line, a compass) are fine as
  inline SVG/CSS, and should use the placeholder colours where club-coloured.

---

## DELIVERABLES (per template)

1. `templateN/templateN.html` — the production source (placeholders + sibling CSS link).
2. `templateN/templateN.css` — with a `/* … COLOR PLACEHOLDER */` comment on every
   placeholder-hex line.
3. `uploads/previewN.html` — a render-check copy with sample data + `assets/` paths and a
   `../templateN/templateN.css` link.
4. A one-line description of the design concept.

**Numbering:** continue the sequence — next free number after the current set. Don't reuse
a taken number. (Use `list_files` on the project root to see what exists.)

---

## VIEW LIVE TEMPLATES IN THE ROWGRAM APP

To see all templates rendered with **real club colours** (not the placeholder pink & green),
visit the RowGram app template library:

📂 **Templates directory:** `/public/templates/`

Each `templateN/` folder contains the production `.html` and `.css` files. The app will render
these templates live with whatever club colours are configured in the admin panel — giving
you a true picture of how your design performs with white, black, bright, and dark club
colours. Use this to verify that contrast, legibility, and the overall design hold up across
all possible colour scenarios before shipping.

---

## EXISTING TEMPLATES — DON'T DUPLICATE THESE

| # | Concept |
|---|---------|
| 1 | Diagonal SVG colour-band split; boat centred; circular seat badges, names radiating L/R (engine-positioned) |
| 2 | White bg; L-shaped corner brackets; race name top-centre; boat left, names listed right |
| 3 | Editorial — giant race name, pink rule, 2-col crew, green mastheads |
| 4 | Horizontal colour bands: race / boat / crew / footer |
| 6 | Vertical left rail + giant ghost boat-code |
| 7 | Certificate — double frame, ornament, dotted leaders |
| 8 | One painted club blade per rower, beside the boat |
| 9 | Race-entry ticket with tear-off stub |
| 10 | Runner's race bib — boat code as the big number, pinned card |
| 11 | Instant-photo wall — a taped polaroid per rower |
| 15 | Engraved boathouse plaque, screwed to a planked door |
| 16 | Fabric crew badge on a hanging grosgrain ribbon |
| 17 | Lineup card — top-down boat centred, names radiating to each oar (boat is hero) |
| 18 | Football-formation poster — badges zig-zag port/starboard on a pitch |
| 19 | Split-flap departures/scoreboard, mechanical + LED-pink |
| 20 | Regatta course — each rower in their own water lane |
| 21 | Regatta programme — ivory race-card, hairline frame, monogram |
| 22 | Signal-flag bunting — a swallowtail burgee per rower on a halyard |
| 23 | Engraved presentation plate in a green velvet case, pink rosette |
| 24 | Regatta blazer — bold vertical club stripes + tailored team-sheet |
| 25 | Art Deco regatta poster — sunburst rays, stepped frame, chevrons |
| 26 | Tideway course chart — winding route + compass + crew manifest |

*(Templates 5, 12, 13, 14 are unused numbers — free to fill or skip.)*

---

## UNTAPPED DIRECTIONS (ideas for future templates)

Rowing-rich, not yet done — pick or remix:

- **Erg / split readout** — monospaced digital telemetry, stroke-rate & split styling.
- **Boathouse honours board** — gilt-lettered wooden roll-of-honour panel.
- **Stroke-side / bow-side split** — two tactical columns by rigging side.
- **Vintage steamship / regatta ticket** — letterpress, ornate border, perforation.
- **Nautical chart pennant code** — actual ICS signal flags spelling the boat code.
- **Trophy pot / Pimm's-lawn editorial** — Henley enclosure summer mood.
- **Rigging blueprint** — technical line-drawing of seats with annotation callouts.
- **Stamp sheet / philatelic** — each rower a perforated postage stamp.
- **Lap-time leaderboard** — clean F1-style timing tower.
- **Embroidered pennant / club tie** — textile texture, repeating motif.

---

## QUICK CHECKLIST BEFORE SHIPPING A TEMPLATE

- [ ] Exactly 1080×1080, `overflow:hidden`, no scrollbars.
- [ ] Inter linked; no other fonts.
- [ ] Separate `.html` + `.css`; production HTML uses placeholders + sibling CSS link.
- [ ] Every placeholder-hex line has a `/* … COLOR PLACEHOLDER */` comment.
- [ ] Both club colours prominent; neutrals are non-placeholder.
- [ ] All 9 names fit, ≥28px, no clipping; last row inside the canvas.
- [ ] Looks balanced with 4 names too (or concept explicitly assumes an eight).
- [ ] Logo 120–180px, present but not dominant; boat (if used) via `{{BOAT_IMAGE}}`.
- [ ] Visually distinct from every template in the table above.

DATABASE_URL="postgresql://postgres.fmoaifrfmvrfkvmnclqy:l3MrWDnbVg0ehKm4@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres.fmoaifrfmvrfkvmnclqy:l3MrWDnbVg0ehKm4@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" npx tsx scripts/seed-prod-templates.ts