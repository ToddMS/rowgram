#!/usr/bin/env tsx
/**
 * seed-small-boat-crews.ts
 *
 * Creates one crew per club per non-8 boat size (4+, 4-, 4x, 2-, 2x, 1x).
 * Crews are assigned to the first user in the database.
 * Safe to re-run: skips any crew whose name already exists for that user.
 *
 * Usage:
 *   npx tsx scripts/seed-small-boat-crews.ts
 *   npx tsx scripts/seed-small-boat-crews.ts --dry-run
 */

import { PrismaClient } from '@prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Boat definitions ─────────────────────────────────────────────────────────

const BOAT_SIZES: Array<{
  code: string
  name: string
  hasCox: boolean
  rowerCount: number
  raceName: string
  raceCategory: string
}> = [
  {
    code: '4+',
    name: 'Coxed Four',
    hasCox: true,
    rowerCount: 4,
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M1 Senior Men Coxed 4+',
  },
  {
    code: '4-',
    name: 'Four',
    hasCox: false,
    rowerCount: 4,
    raceName: 'National Championships',
    raceCategory: 'M1 Senior Men Four 4-',
  },
  {
    code: '4x',
    name: 'Quad',
    hasCox: false,
    rowerCount: 4,
    raceName: 'British Rowing Sculling Head',
    raceCategory: 'M1 Senior Men Quad 4x',
  },
  {
    code: '2-',
    name: 'Pair',
    hasCox: false,
    rowerCount: 2,
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M1 Senior Men Pair 2-',
  },
  {
    code: '2x',
    name: 'Double',
    hasCox: false,
    rowerCount: 2,
    raceName: 'British Rowing Sculling Head',
    raceCategory: 'M1 Senior Men Double 2x',
  },
  {
    code: '1x',
    name: 'Single',
    hasCox: false,
    rowerCount: 1,
    raceName: 'Wingfield Sculls',
    raceCategory: 'M1 Senior Men Single 1x',
  },
]

// ─── Name pools ───────────────────────────────────────────────────────────────

const COX_NAMES = [
  'Pat Quinn', 'Jordan Cross', 'Avery Park', 'Casey Bell', 'Robin Dale',
  'Alex Shaw', 'Jamie Reed', 'Sam Blake', 'Chris Ford', 'Morgan Lane', 'Drew Hall',
]

const ROWER_NAMES = [
  ['Tom Archer', 'Will Foster', 'Sam Clarke', 'Ben Walsh'],     // slot 0 — Auriol K
  ['Ed Bostock', 'Oli Parish', 'Tom Ransley', 'Pete Reed'],     // slot 1 — Cambridge
  ['Tom Dean', 'Jack Clubb', 'Josh Bugajski', 'Ollie Cook'],    // slot 2 — Leander
  ['Ian Ross', 'Peter Black', 'David Marks', 'Rob Jenkins'],    // slot 3 — Molesey
  ['Ollie Sharp', 'Harry Knight', 'Finn Park', 'Jake Mills'],   // slot 4 — Putney Town
  ['Karl Dean', 'Lee Nash', 'Mike Tate', 'Neil Banks'],         // slot 5 — Thames RC
  ['Ryan Walsh', 'Connor Hayes', 'Dylan Brooks', 'Ethan Ross'], // slot 6 — ULBC
  ['Marcus Cole', 'Jordan Bell', 'Tyler Reed', 'Cameron Fox'],  // slot 7 — Cambridge BC2
  ['Freddie Cole', 'Oscar James', 'Rupert Lane', 'Hugo Blake'], // slot 8 — St Edwards
  ['Charlie Moore', 'George O\'Brien', 'Henry Davies', 'Will T'], // slot 9 — St Pauls
  ['Aaron Cook', 'Ben Sharp', 'Carl Hunt', 'Dean Mills'],       // slot 10 — Newcastle
]

const COACH_NAMES = [
  'James Langan', 'Steve Trapmore', 'Paul Thompson', 'Peter Sheppard',
  'Sarah Holt', 'Rob Baker', 'Mark Evans', 'Helen Glover',
  'Richard Phelps', 'Rob Mitchell', 'Andy Parkinson',
]

const BOAT_NAMES = [
  'Black Swan', 'Cantabrigian', 'Hippo', 'Molescroft',
  'River Warrior', 'King Tideway', 'De Montfort', 'River Iris',
  'Teddies', 'Surmaster', 'Geordie Pride',
]

// ─── Build crew names array for a given boat + club index ─────────────────────

function buildCrewNames(boat: typeof BOAT_SIZES[0], clubIndex: number): Array<string> {
  const rowers = ROWER_NAMES[clubIndex % ROWER_NAMES.length]
  const names: Array<string> = []
  if (boat.hasCox) names.push(COX_NAMES[clubIndex % COX_NAMES.length])
  for (let i = 0; i < boat.rowerCount; i++) {
    names.push(rowers[i % rowers.length])
  }
  return names
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient()

  try {
    const [user, clubs] = await Promise.all([
      prisma.user.findFirst(),
      prisma.club.findMany({ orderBy: { name: 'asc' } }),
    ])

    if (!user) throw new Error('No user found in database')
    if (clubs.length === 0) throw new Error('No clubs found in database')

    console.log(`User:   ${user.email}`)
    console.log(`Clubs:  ${clubs.length}`)
    console.log(`Boats:  ${BOAT_SIZES.map((b) => b.code).join(', ')}`)
    console.log(`Total:  ${clubs.length * BOAT_SIZES.length} crews to create`)
    if (DRY_RUN) console.log('\n── DRY RUN — nothing will be written ──')
    console.log()

    let created = 0
    let skipped = 0

    for (let ci = 0; ci < clubs.length; ci++) {
      const club = clubs[ci]

      for (const boat of BOAT_SIZES) {
        const crewName = `${club.name} ${boat.name}`

        if (DRY_RUN) {
          console.log(`  [dry]  ${crewName} (${boat.code}) → ${club.name}`)
          continue
        }

        const existing = await prisma.crew.findFirst({
          where: { name: crewName, userId: user.id },
        })

        if (existing) {
          console.log(`  skip   ${crewName}`)
          skipped++
          continue
        }

        await prisma.crew.create({
          data: {
            name: crewName,
            raceName: boat.raceName,
            raceCategory: boat.raceCategory,
            raceDate: '2026-07-01T10:00',
            boatName: BOAT_NAMES[ci % BOAT_NAMES.length],
            coachName: COACH_NAMES[ci % COACH_NAMES.length],
            boatCode: boat.code,
            crewNames: buildCrewNames(boat, ci),
            userId: user.id,
            clubId: club.id,
          },
        })

        console.log(`  ✓      ${crewName} (${boat.code})`)
        created++
      }
    }

    console.log(`\n─────────────────────────────────────`)
    if (DRY_RUN) {
      console.log(`Would create ${clubs.length * BOAT_SIZES.length} crews`)
    } else {
      console.log(`Created: ${created}  Skipped: ${skipped}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
