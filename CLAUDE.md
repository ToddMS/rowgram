# CLAUDE.md - RowGram Development Guide

> RowGram is a rowing crew image generator. Users create crews and clubs, pick from 16 design templates, and generate 1080×1080px PNG images for sharing on social media. Live at **rowgram.co.uk** (Vercel + Supabase).

## Quick Start Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build           # prisma generate + next build
npm run start           # Start production server

# Quality Assurance
npm run lint            # Next.js ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Prettier formatting
npm run typecheck       # TypeScript checking
npm run test            # Run test suite (vitest)
npm run check           # format + lint:fix + typecheck

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema without migration
npm run db:migrate      # Create & apply migration
npm run db:studio       # Prisma Studio UI
npm run db:seed         # Seed database
npm run db:reset        # Reset database (destructive)

# Other
npm run analyze         # Bundle size analysis
```

## Architecture Overview

### Core Stack
- **Framework**: Next.js 15 App Router
- **Database**: PostgreSQL + Prisma ORM (hosted on Supabase)
- **API**: tRPC v11 (`@trpc/next`)
- **Auth**: NextAuth.js v4 with Google OAuth + Prisma adapter
- **UI**: React 19 + Tailwind CSS v4 + lucide-react
- **Storage**: Vercel Blob (generated images; club logos stored as base64 in DB)
- **Image Generation**: Puppeteer + `@sparticuz/chromium` (server-side, 1080×1080px PNG)
- **State/Data**: TanStack Query v5
- **Toasts**: Sonner
- **Testing**: Vitest + Testing Library

### Project Structure

```
app/                        # Next.js App Router
├── layout.tsx              # Root layout
├── page.tsx                # Home page
├── providers.tsx           # Client providers (tRPC, Query)
├── crews/page.tsx          # Crew management
├── clubs/page.tsx          # Club preset management
├── gallery/page.tsx        # Generated image gallery
├── generate/page.tsx       # Image generation workflow
├── signup/page.tsx
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── trpc/[trpc]/route.ts
    └── upload/club-logo/route.ts

src/
├── components/             # Reusable UI components
│   ├── Navigation.tsx
│   ├── AuthModal.tsx
│   ├── CreateCrewModal.tsx
│   ├── BatchDownloadModal.tsx
│   ├── ConfirmDeleteModal.tsx
│   ├── TemplateSelector.tsx  # Scrollable template grid (max-h-80)
│   ├── ImageCard.tsx, CrewCard.tsx, ClubCard.tsx
│   ├── SearchBar.tsx, Modal.tsx, Dialog.tsx, Button.tsx
│   ├── DataContainer.tsx, LoadingState.tsx, ErrorBoundary.tsx
│   ├── SkeletonGrid.tsx, CornerBorder.tsx, ClientOnly.tsx
│   └── ImageUpload.tsx
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── db.ts               # DB utilities
│   ├── trpc.ts             # tRPC server init
│   ├── trpc-client.ts      # tRPC client
│   ├── auth-options.ts     # NextAuth config
│   ├── auth-context.tsx    # Auth React context
│   ├── guest-context.tsx   # Guest mode context (localStorage)
│   ├── session.ts          # Session helpers
│   ├── imageGeneration.ts  # Puppeteer image generation pipeline
│   ├── templateCompiler.ts # HTML template rendering + color replacement
│   ├── boat-types.ts       # Boat type definitions
│   └── utils.ts
├── server/routers/
│   ├── _app.ts             # Root tRPC router
│   ├── crew.ts
│   ├── club.ts
│   ├── template.ts
│   ├── savedImage.ts       # Also handles download filename generation
│   ├── user.ts
│   └── simple.ts
├── styles/globals.css
└── types/
    ├── index.ts
    └── next-auth.d.ts      # NextAuth type augmentation

public/
├── templates/
│   ├── previews/           # PNG preview thumbnails (template-1.png … template-15.png)
│   ├── template1/          # Diagonal split — boat centered, position badges
│   ├── template2/          # Corner L-brackets — boat left, content right
│   ├── template3/          # Editorial — giant race name, pink rule, 2-col crew grid
│   ├── template4/          # Grid — cox top-left, 2×4 crew grid
│   ├── template5/          # Vertical rail — secondary rail left, crew right
│   ├── template6/          # Scoreboard — dark primary background
│   ├── template7/          # Oar per rower — inline SVG oars, logo right column
│   ├── template8/          # Ticket stub — white card + secondary stub
│   ├── template9/          # Stacked — cox above crew list
│   ├── template10/         # (custom)
│   ├── template11/         # Metallic plaque — brushed silver, 2-col crew grid
│   ├── template12/         # Crew badge — grosgrain ribbon, badge card, logo bottom center
│   ├── template13/         # (custom)
│   ├── template14/         # Starting Formation — pitch background
│   ├── template15/         # Departure board — crew list left, logo right panel
│   └── template16/         # Lane card — buoy badges per rower
└── boat-images/            # SVG boat illustrations (8+, 4+, 4-, 2-, oar)

scripts/
├── seed-prod-templates.ts  # Upsert all 16 templates to any DATABASE_URL
├── migrate-clubs-to-prod.ts # Copy clubs from dev Supabase → prod Supabase
└── export-clubs.ts         # Dump clubs from dev db to JSON
```

## Environment Variables

`.env.local` for development — points to the **dev Supabase** project (`bhzcthtvbbcumbdgmkym`, eu-west-2):
```env
DATABASE_URL="postgresql://postgres.bhzcthtvbbcumbdgmkym:...@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.bhzcthtvbbcumbdgmkym:...@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
BLOB_READ_WRITE_TOKEN="..."
```

Production env vars live in **Vercel** (encrypted). Production Supabase project: `fmoaifrfmvrfkvmnclqy` (eu-north-1). Pull with `vercel env pull` but sensitive vars come back empty — get them from the Supabase dashboard directly.

## Key Features

### Guest Mode
Unauthenticated users can create crews and clubs stored in localStorage via `GuestContext`. Auth is gated at the image generation step. On sign-in, guest data syncs to the database.

### Image Generation Workflow (`app/generate/page.tsx`)
1. Select one or more crews (scrollable card grid, `max-h-60`)
2. Select one or more templates (scrollable grid, `max-h-80`)
3. Choose colours: **Auto** (uses each crew's club colours, with per-crew swap toggle) or **Override all** (single colour pair for all)
4. Click Generate → single image uses `savedImage.generate`, multiple uses `savedImage.generateBatch`
5. On success, redirects to `/gallery`

Download filenames: `{crew-name}-{template-name}.png` (generated by `createBoatFilename()` in `savedImage.ts`).

### Image Generation Pipeline (`src/lib/imageGeneration.ts`)
Server-side: Puppeteer + `@sparticuz/chromium` renders the compiled HTML to PNG at 1080×1080px. The pipeline:
1. Reads `templateX.html` and inlines `templateX.css` (removes `<link>` tags, inserts `<style>`)
2. Calls `templateCompiler.ts` to replace all placeholders with crew data + club colors
3. Puppeteer renders and screenshots at 1080×1080
4. Image stored in Vercel Blob; URL + metadata saved to `SavedImage` table

### Template System
Templates are HTML/CSS files in `public/templates/templateX/`. The compiler in `src/lib/templateCompiler.ts` does Handlebars-style rendering and color replacement.

### Club Logo Upload
`POST /api/upload/club-logo` handles multipart uploads. Logos are stored as **base64 data URIs** directly in the `Club.logoUrl` database column (not Vercel Blob).

### Batch Download
`BatchDownloadModal` uses `jszip` to package multiple generated images into a zip file for download.

## Database Schema

```
User → Crews (one-to-many)
User → Clubs (one-to-many)
User → SavedImages (one-to-many)
Crew → Club (many-to-one, optional)
Crew → SavedImages (one-to-many)
SavedImage → Template (many-to-one)
```

Models: `User`, `Account`, `Session`, `VerificationToken`, `Club`, `Crew`, `Template`, `SavedImage`

## tRPC Routers

| Router | Procedures |
|--------|-----------|
| `crew` | CRUD for user crews |
| `club` | CRUD for club presets |
| `template` | List/get templates |
| `savedImage` | generate, generateBatch, save, list, delete |
| `user` | User profile management |
| `simple` | Health check / basic queries |

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode, explicit types, no `any`
- **Components**: Functional + hooks only
- **File naming**: kebab-case files, PascalCase components
- **Arrays**: Use `Array<T>` not `T[]` (ESLint rule)
- **Imports**: Type-only imports with `import type`

### Common ESLint Rules
```typescript
// Array types
const crews: Array<Crew> = []         // ✅
const crews: Crew[] = []              // ❌

// Optional chaining — only when value may be null/undefined
user.name                             // ✅ (user is defined)
user?.name                            // ❌ (unnecessary)

// No variable shadowing
} catch (apiError) { ... }            // ✅
} catch (error) { ... }               // ❌ (if error exists in outer scope)

// Async must await
const fn = async () => { await x() } // ✅
const fn = async () => { x() }       // ❌
```

### Pre-commit Checklist
- [ ] `npm run lint` — 0 errors
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] `npm run test` — all pass
- [ ] Null checks on all Prisma `findUnique` / `findFirst` results

### Adding a New Feature
1. Add tRPC router in `src/server/routers/` and register in `_app.ts`
2. Create components in `src/components/`
3. Add page in `app/`
4. Wire up with `trpc.<router>.<procedure>.useQuery/useMutation`

## Template Development Guide

### Template Variables
- `{{RACE_NAME}}` — race/event name
- `{{CREW_NAME}}` — crew name
- `{{BOAT_TYPE}}` — e.g. "Eight"
- `{{BOAT_CODE}}` — e.g. "8+"
- `{{crewCategory}}` — e.g. "M1 Senior Men | Open Club 8+"
- `{{COACH_NAME}}` — coach name
- `{{COX_NAME}}` — cox name (use with `{{#hasCox}}`)
- `{{#hasCox}}...{{/hasCox}}` — conditional block if crew has a cox
- `{{#crewMembers}}` — all members including cox (each has `{{badge}}` and `{{name}}`)
- `{{#crewMembersNoCox}}` — rowers only, no cox (use alongside `{{#hasCox}}` for separate cox row)
- `{{#BOAT_IMAGE_AVAILABLE}}{{BOAT_IMAGE}}{{/BOAT_IMAGE_AVAILABLE}}` — conditional boat SVG
- `{{#clubLogo}}<img src="{{clubLogo}}" />{{/clubLogo}}` — conditional club logo

### Color Placeholders (replaced by club colors at render time)
- `#094e2a` / `#15803d` → primary color
- `#f3bfd4` / `#f9a8d4` → secondary color

Non-placeholder hex values (e.g. silver grays `#d6d6d6`, `#f2f2f2`) are left unchanged.

### Boat Image System
`{{BOAT_IMAGE}}` is replaced with `<img src="data:image/svg+xml;base64,..." />`.
SVG files for `8+`, `4+`, `4-`, `2-` and `oar` live in `/public/boat-images/`.

For CSS color control, inline the SVG path directly in HTML (not `<img>`) so CSS `fill` property works.

### Cox Pattern (used in templates 3, 4, 8, 9, 11, 12)
```html
{{#hasCox}}
<div class="cox-row">
  <span class="seat">C</span>
  <span class="name">{{COX_NAME}}</span>
</div>
{{/hasCox}}
<section class="crew-list">
  {{#crewMembersNoCox}}
  <div class="crew-row">
    <span class="seat">{{badge}}</span>
    <span class="name">{{name}}</span>
  </div>
  {{/crewMembersNoCox}}
</section>
```

### Adding a New Template
1. Create `/public/templates/templateX/templateX.html` + `templateX.css`
2. Use 1080×1080px fixed dimensions, Inter font
3. Use color placeholder values listed above
4. Run `scripts/seed-prod-templates.ts` with prod `DATABASE_URL` to register it
5. Add a preview PNG to `public/templates/previews/template-X.png`
6. Test with multiple boat types and crew sizes

## Deployment

Deployed on **Vercel** at rowgram.co.uk. Build command: `prisma generate && next build` (migrations are NOT run automatically on deploy).

### Applying Migrations to Production
The prod database was originally set up without migration tracking. Process:
1. Baseline existing migrations: `npx prisma migrate resolve --applied <migration_name>` for each already-applied migration
2. Deploy new ones: `npx prisma migrate deploy`
3. If schema is badly out of sync, use `npx prisma db push` to sync all missing columns safely

Always pass prod credentials explicitly:
```bash
DATABASE_URL="postgresql://postgres.fmoaifrfmvrfkvmnclqy:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
DIRECT_URL="postgresql://postgres.fmoaifrfmvrfkvmnclqy:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" \
npx prisma migrate deploy
```

### Deployment Checklist
- [ ] All env vars set in Vercel dashboard
- [ ] `DATABASE_URL` + `DIRECT_URL` configured (Supabase prod project: `fmoaifrfmvrfkvmnclqy`, eu-north-1)
- [ ] `BLOB_READ_WRITE_TOKEN` set
- [ ] `npm run build` passes locally
- [ ] Database migrations applied to prod
- [ ] Templates seeded: `npx tsx scripts/seed-prod-templates.ts`
