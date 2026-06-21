# CLAUDE.md - RowGram Development Guide

> Rowing crew image generator built with Next.js 15 App Router, tRPC, Prisma, and NextAuth.

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
- **Database**: PostgreSQL + Prisma ORM
- **API**: tRPC v11 (`@trpc/next`)
- **Auth**: NextAuth.js v4 with Google OAuth + Prisma adapter
- **UI**: React 19 + Tailwind CSS v4 + lucide-react
- **Storage**: Vercel Blob (images, club logos)
- **Image Generation**: Puppeteer + `@sparticuz/chromium` (server-side)
- **State/Data**: TanStack Query v5
- **Toasts**: Sonner
- **Testing**: Vitest + Testing Library

### Project Structure

```
app/                        # Next.js App Router
├── layout.tsx              # Root layout
├── page.tsx                # Home page
├── providers.tsx           # Client providers (tRPC, Query)
├── crews/page.tsx
├── clubs/page.tsx
├── gallery/page.tsx
├── generate/page.tsx
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
│   ├── TemplateSelector.tsx
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
│   ├── imageGeneration.ts  # Puppeteer image generation
│   ├── templateCompiler.ts # HTML template rendering
│   ├── boat-types.ts       # Boat type definitions
│   └── utils.ts
├── server/routers/
│   ├── _app.ts             # Root tRPC router
│   ├── crew.ts
│   ├── club.ts
│   ├── template.ts
│   ├── savedImage.ts
│   ├── user.ts
│   └── simple.ts
├── styles/globals.css
└── types/
    ├── index.ts
    └── next-auth.d.ts      # NextAuth type augmentation

public/
├── templates/
│   ├── template1/          # Diagonal Professional
│   └── template2/          # Corner Brackets
└── boat-images/            # SVG boat illustrations
```

## Environment Variables

`.env.local` for development:
```env
# Database (use directUrl for connection pooling)
DATABASE_URL="postgresql://user:pass@localhost:5432/rowgram"
DIRECT_URL="postgresql://user:pass@localhost:5432/rowgram"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="your-blob-token"
```

## Key Features

### Guest Mode
Unauthenticated users can create crews and clubs stored in localStorage via `GuestContext`. Auth is gated at the image generation step. On sign-in, guest data syncs to the database.

### Image Generation
Server-side: Puppeteer + `@sparticuz/chromium` renders HTML templates to PNG at 1080×1080px. The pipeline lives in `src/lib/imageGeneration.ts`. Generated images are stored in Vercel Blob.

### Template System
Templates are HTML/CSS files in `public/templates/templateX/`. The compiler in `src/lib/templateCompiler.ts` replaces Handlebars-like placeholders with crew data and club colors.

### Club Logo Upload
`POST /api/upload/club-logo` handles multipart uploads via `multer` and stores to Vercel Blob.

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
| `savedImage` | Save, list, delete generated images |
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
- `{{#BOAT_IMAGE_AVAILABLE}}{{BOAT_IMAGE}}{{/BOAT_IMAGE_AVAILABLE}}` — conditional boat SVG
- `{{#clubLogo}}<img src="{{clubLogo}}" />{{/clubLogo}}` — conditional club logo
- `{{#crewMembers}}` — crew members array

### Color Placeholders (replaced by club colors at render time)
- `#094e2a` / `#15803d` → primary color
- `#f3bfd4` / `#f9a8d4` → secondary color

### Boat Image System
`{{BOAT_IMAGE}}` is replaced with `<img src="data:image/svg+xml;base64,..." />`.
SVG files for `8+`, `4+`, `4-`, `2-` live in `/public/boat-images/`.

### Existing Templates
- **Template 1** (`/public/templates/template1/`): Diagonal split background, boat centered, position badges
- **Template 2** (`/public/templates/template2/`): Corner L-brackets, boat left, content right

### Adding a New Template
1. Create `/public/templates/templateX/templateX.html` + `templateX.css`
2. Use 1080×1080px fixed dimensions, Inter font, absolute positioning
3. Use color placeholder values listed above
4. Add a `Template` record in the database
5. Test with multiple boat types and crew sizes

## Deployment

Three hosting configs exist in the repo — pick one:

| Platform | Config file | Notes |
|----------|------------|-------|
| **Vercel** | `vercel.json` | Recommended; Blob storage is native |
| **Railway** | `railway.json`, `nixpacks.toml` | See `RAILWAY_DEPLOYMENT.md` |
| **Netlify** | `netlify.toml` | |
| **Docker** | `Dockerfile`, `docker-compose.yml` | Self-hosted |

### Deployment Checklist
- [ ] All env vars set on host
- [ ] `DATABASE_URL` + `DIRECT_URL` configured
- [ ] `BLOB_READ_WRITE_TOKEN` set
- [ ] `npm run build` passes locally
- [ ] Database migrations applied (`npm run db:migrate`)
