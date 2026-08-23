#!/usr/bin/env tsx
/**
 * seed-name-length-crews.ts
 *
 * Creates a "Short Names" and a "Long Names" test crew for every boat size
 * (8+, 4+, 4-, 4x, 2-, 2x, 1x), stress-testing crew name, race name, coach
 * name, boat name, and every crew member name for overflow at both extremes.
 * Assigned to the first user in the database, cycling through existing clubs.
 *
 * Safe to re-run: skips any crew whose name already exists for that user.
 *
 * Usage:
 *   npx tsx scripts/seed-name-length-crews.ts
 *   npx tsx scripts/seed-name-length-crews.ts --dry-run
 *   npx tsx scripts/generate-local-crews.ts --boat=8+,4+,4-,4x,2-,2x,1x
 */

import { PrismaClient } from '@prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Boat definitions ─────────────────────────────────────────────────────────

const BOAT_SIZES: Array<{ code: string; hasCox: boolean; rowerCount: number }> = [
  { code: '8+', hasCox: true, rowerCount: 8 },
  { code: '4+', hasCox: true, rowerCount: 4 },
  { code: '4-', hasCox: false, rowerCount: 4 },
  { code: '4x', hasCox: false, rowerCount: 4 },
  { code: '2-', hasCox: false, rowerCount: 2 },
  { code: '2x', hasCox: false, rowerCount: 2 },
  { code: '1x', hasCox: false, rowerCount: 1 },
]

// ─── Name pools (9 = max needed, for 8+ with cox) ──────────────────────────────

const SHORT_NAMES = ['Jo Ng', 'Al Fox', 'Kit Roe', 'Zoe Wu', 'Max Poe', 'Eli Cho', 'Ivy Kim', 'Sam Lee', 'Ray Oz']

const LONG_NAMES = [
  'Alexandria Fitzgerald-Thompson',
  'Maximilian Wentworth-Bancroft',
  'Persephone Van Der Berg-Whitmore',
  'Bartholomew Castellanos-Fairweather',
  'Anastasia Kolokotronis-Radcliffe',
  'Theodore Cunningham-Ashworth-Blake',
  'Guinevere Habershon-Pemberton',
  'Montgomery Featherstonehaugh-Reid',
  'Arabella Winterbourne-Sutcliffe',
]

const VARIANTS = [
  {
    label: 'Short Names',
    names: SHORT_NAMES,
    namePrefix: "Jo's Crew",
    raceName: 'Sprints',
    coachName: 'Sam Lee',
    boatName: 'Wren',
  },
  {
    label: 'Long Names',
    names: LONG_NAMES,
    namePrefix: 'The Right Honourable Auriol Kensington Senior Championship Squad',
    raceName: 'The Metropolitan & Home Counties Amateur Regatta and Henley Royal Qualifying Head of the River Race',
    coachName: 'Alexandria Fitzgerald-Thompson',
    boatName: 'The Right Honourable Bartholomew Wentworth-Fairweather III',
  },
]

// ─── Build crew names array for a given boat ───────────────────────────────────

function buildCrewNames(boat: (typeof BOAT_SIZES)[0], pool: Array<string>): Array<string> {
  const names: Array<string> = []
  if (boat.hasCox) names.push(pool[0])
  for (let i = 0; i < boat.rowerCount; i++) {
    names.push(pool[(boat.hasCox ? i + 1 : i) % pool.length])
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
    console.log(`Boats:  ${BOAT_SIZES.map((b) => b.code).join(', ')}`)
    console.log(`Total:  ${BOAT_SIZES.length * VARIANTS.length} crews to create`)
    if (DRY_RUN) console.log('\n── DRY RUN — nothing will be written ──')
    console.log()

    let created = 0
    let skipped = 0

    for (let bi = 0; bi < BOAT_SIZES.length; bi++) {
      const boat = BOAT_SIZES[bi]
      const club = clubs[bi % clubs.length]

      for (const variant of VARIANTS) {
        const crewName = `${variant.namePrefix} · ${boat.code}`

        if (DRY_RUN) {
          console.log(`  [dry]  ${crewName} (${boat.code}, ${variant.label}) → ${club.name}`)
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
            raceName: variant.raceName,
            raceCategory: `M1 Senior Men | Open Club ${boat.code}`,
            raceDate: '2026-07-01T10:00',
            boatName: variant.boatName,
            coachName: variant.coachName,
            boatCode: boat.code,
            crewNames: buildCrewNames(boat, variant.names),
            userId: user.id,
            clubId: club.id,
          },
        })

        console.log(`  ✓      ${crewName} (${boat.code}, ${variant.label})`)
        created++
      }
    }

    console.log(`\n─────────────────────────────────────`)
    if (DRY_RUN) {
      console.log(`Would create ${BOAT_SIZES.length * VARIANTS.length} crews`)
    } else {
      console.log(`Created: ${created}  Skipped: ${skipped}`)
      console.log(`\nRender them all:`)
      console.log(`  npx tsx scripts/generate-local-crews.ts --boat=8+,4+,4-,4x,2-,2x,1x`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
