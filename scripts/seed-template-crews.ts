#!/usr/bin/env tsx
/**
 * seed-template-crews.ts
 *
 * Creates one 8+ crew per active template, each assigned to a different club
 * (cycling through all available clubs). The crews are owned by the first user
 * found in the database.
 *
 * Safe to re-run: skips any crew whose name already exists for this user.
 *
 * Usage:
 *   npx tsx scripts/seed-template-crews.ts
 *   npx tsx scripts/seed-template-crews.ts --dry-run   # preview without writing
 */

import { PrismaClient } from '@prisma/client'

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Crew definitions (one per template slot) ─────────────────────────────────
// crewNames order for 8+: [cox, stroke, 7, 6, 5, 4, 3, 2, bow]

const CREW_DEFS = [
  {
    name: 'Auriol K Men\'s 1st Eight',
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M1 Senior Men Open 8+',
    raceDate: '2026-06-28T09:00',
    boatName: 'Black Swan',
    coachName: 'James Langan',
    crewNames: ['Tom Archer', 'Will Foster', 'Sam Clarke', 'Ben Walsh', 'Jack Turner', 'Alex Moore', 'Dan Hill', 'Chris Lamb', 'Harry Reid'],
  },
  {
    name: 'CUBC Blue Boat',
    raceName: 'The Boat Race 2026',
    raceCategory: 'M1 Varsity Open 8+',
    raceDate: '2026-03-29T13:45',
    boatName: 'Cantabrigian',
    coachName: 'Steve Trapmore',
    crewNames: ['Ed Bostock', 'Oli Parish', 'James Cracknell', 'Tom Ransley', 'Pete Reed', 'Matt Langridge', 'Alan Campbell', 'Andy Triggs-Hodge', 'Phelan Hill'],
  },
  {
    name: 'Leander Women\'s 1st Eight',
    raceName: 'Henley Royal Regatta',
    raceCategory: 'W1 Senior Women Open 8+',
    raceDate: '2026-07-01T10:30',
    boatName: 'Pink Panther',
    coachName: 'Paul Thompson',
    crewNames: ['Sophie Ward', 'Alice Brown', 'Grace Lee', 'Mia Scott', 'Lucy Hart', 'Emma Davis', 'Chloe Marsh', 'Nina Torres', 'Kate Flynn'],
  },
  {
    name: 'Molesey BC Masters Eight',
    raceName: 'British Masters Regatta',
    raceCategory: 'MasE Mixed Open 8+',
    raceDate: '2026-08-15T11:00',
    boatName: 'Molescroft',
    coachName: 'Peter Sheppard',
    crewNames: ['Ian Ross', 'Peter Black', 'David Marks', 'Rob Jenkins', 'Bill Payne', 'Nick Webb', 'Paul Day', 'Luke Finn', 'Adam Fox'],
  },
  {
    name: 'Putney Town Junior Eight',
    raceName: 'National Schools Regatta',
    raceCategory: 'J18 Junior Men Open 8+',
    raceDate: '2026-05-23T09:15',
    boatName: 'River Warrior',
    coachName: 'Sarah Holt',
    crewNames: ['Ollie Sharp', 'Harry Knight', 'Finn Park', 'Jake Mills', 'Toby Webb', 'Josh Hunt', 'Rory Stone', 'Max Bell', 'Liam Cross'],
  },
  {
    name: 'St Edward\'s 1st VIII',
    raceName: 'Schools\' Head of the River',
    raceCategory: 'J17 Schools\' Men Open 8+',
    raceDate: '2026-03-07T09:30',
    boatName: 'Teddies',
    coachName: 'Richard Phelps',
    crewNames: ['Freddie Cole', 'Oscar James', 'Rupert Lane', 'Hugo Blake', 'Archie Hunt', 'Jasper Miles', 'Felix Stone', 'Bertie Shaw', 'Monty Fox'],
  },
  {
    name: 'St Paul\'s School 1st VIII',
    raceName: 'Marlow Royal Regatta',
    raceCategory: 'J18 Schools\' Men Open 8+',
    raceDate: '2026-06-13T10:00',
    boatName: 'Surmaster',
    coachName: 'Rob Mitchell',
    crewNames: ['Charlie Moore', 'George O\'Brien', 'Henry Davies', 'William Thompson', 'Edward Barnes', 'James Wilson', 'Thomas Baker', 'Robert Carter', 'Samuel Green'],
  },
  {
    name: 'Thames RC Women\'s Elite Eight',
    raceName: 'Women\'s Henley Regatta',
    raceCategory: 'W1 Elite Women Open 8+',
    raceDate: '2026-06-20T11:30',
    boatName: 'Lady Thames',
    coachName: 'Rob Baker',
    crewNames: ['Lily Chen', 'Diana Prince', 'Eve Wilson', 'Alice Johnson', 'Grace Lee', 'Mia Scott', 'Lucy Hart', 'Emma Davis', 'Chloe Marsh'],
  },
  {
    name: 'ULBC Men\'s 1st Eight',
    raceName: 'BUCS Rowing Championships',
    raceCategory: 'M1 University Men Open 8+',
    raceDate: '2026-04-18T10:00',
    boatName: 'De Montfort',
    coachName: 'Mark Evans',
    crewNames: ['Ryan Walsh', 'Connor Hayes', 'Dylan Brooks', 'Ethan Ross', 'Marcus Cole', 'Jordan Bell', 'Tyler Reed', 'Cameron Fox', 'Brady Stone'],
  },
  {
    name: 'Newcastle University Eight',
    raceName: 'BUCS Rowing Championships',
    raceCategory: 'M1 University Men Open 8+',
    raceDate: '2026-04-19T09:45',
    boatName: 'Geordie Pride',
    coachName: 'Andy Parkinson',
    crewNames: ['Aaron Cook', 'Ben Sharp', 'Carl Hunt', 'Dean Mills', 'Evan Park', 'Finn Cross', 'Glen Ward', 'Hugh Lane', 'Ivan Blake'],
  },
  {
    name: 'Vesta RC Club Eight',
    raceName: 'Tideway Head',
    raceCategory: 'M2 Club Men Open 8+',
    raceDate: '2026-02-28T11:00',
    boatName: 'Vesta VII',
    coachName: 'Gareth Hughes',
    crewNames: ['Karl Dean', 'Lee Nash', 'Mike Tate', 'Neil Banks', 'Owen Price', 'Phil Cross', 'Quinn Dale', 'Ross Blake', 'Steve Ward'],
  },
  {
    name: 'Auriol K Women\'s 1st Eight',
    raceName: 'Henley Women\'s Regatta',
    raceCategory: 'W1 Senior Women Open 8+',
    raceDate: '2026-06-19T10:15',
    boatName: 'River Iris',
    coachName: 'Helen Glover',
    crewNames: ['Amy Price', 'Beth Cole', 'Clara Nash', 'Daisy Kent', 'Ellie Wade', 'Faye Ross', 'Gwen Ford', 'Hana Reid', 'Isla Quinn'],
  },
  {
    name: 'CUBC Goldie Boat',
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M2 Varsity Reserve 8+',
    raceDate: '2026-07-02T14:00',
    boatName: 'Goldie',
    coachName: 'Mark Banks',
    crewNames: ['Jay Stone', 'Kit Lane', 'Leo Hunt', 'Max Cross', 'Ned Park', 'Otto Bell', 'Pip Wade', 'Rex Ford', 'Seb Quinn'],
  },
  {
    name: 'Leander Club Open Eight',
    raceName: 'Wallingford Regatta',
    raceCategory: 'M1 Senior Men Open 8+',
    raceDate: '2026-06-06T10:30',
    boatName: 'Hippo',
    coachName: 'Mark Banks',
    crewNames: ['Tom Dean', 'Sam Nunn', 'Jack Clubb', 'Josh Bugajski', 'Mohamed Sbihi', 'Matt Rossiter', 'Ollie Cook', 'Rory Gibbs', 'Henry Fieldman'],
  },
  {
    name: 'Molesey Women\'s Eight',
    raceName: 'Henley Women\'s Regatta',
    raceCategory: 'W1 Elite Women Open 8+',
    raceDate: '2026-06-21T09:30',
    boatName: 'Molly',
    coachName: 'Tom Pattichis',
    crewNames: ['Zara Reed', 'Anna Cross', 'Bea Stone', 'Cara Ward', 'Demi Fox', 'Elle Banks', 'Fern Hunt', 'Gemma Cole', 'Holly Price'],
  },
  {
    name: 'Putney Town W1 Eight',
    raceName: 'Women\'s Eights Head',
    raceCategory: 'W1 Club Women Open 8+',
    raceDate: '2026-03-07T14:00',
    boatName: 'Violet',
    coachName: 'Kate Sherwood',
    crewNames: ['Iona Blake', 'Jade Ross', 'Kara Dean', 'Luna Nash', 'Maya Tate', 'Nora Kent', 'Ora Wade', 'Piper Ford', 'Quinn Dale'],
  },
  {
    name: 'St Edward\'s Girls\' VIII',
    raceName: 'Schools\' Head of the River',
    raceCategory: 'J17 Schools\' Women Open 8+',
    raceDate: '2026-03-14T11:00',
    boatName: 'Lady Teddies',
    coachName: 'Claire Nugent',
    crewNames: ['Rosa Miles', 'Stella Fox', 'Tilly Shaw', 'Uma Stone', 'Violet Hunt', 'Wren Park', 'Xara Bell', 'Yara Cross', 'Zoe Ward'],
  },
  {
    name: 'St Paul\'s Girls\' 1st VIII',
    raceName: 'Henley Women\'s Regatta',
    raceCategory: 'J18 Schools\' Women Open 8+',
    raceDate: '2026-06-22T09:00',
    boatName: 'Surmaster II',
    coachName: 'Julia Brooks',
    crewNames: ['Alice Green', 'Beth Carter', 'Clara Baker', 'Diana Wilson', 'Eva Thompson', 'Fiona Barnes', 'Gemma Davies', 'Harriet Moore', 'Iris Taylor'],
  },
  {
    name: 'Thames RC Men\'s Elite Eight',
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M1 Elite Men Open 8+',
    raceDate: '2026-07-04T15:00',
    boatName: 'King Tideway',
    coachName: 'Rob Baker',
    crewNames: ['Sam Taylor', 'J. Mitchell-Brown', 'W. Thompson', 'O. James', 'George O\'Brien', 'H. Davies-Smith', 'J. Wilson', 'Charlie Moore', 'T. Taylor'],
  },
  {
    name: 'ULBC Women\'s Eight',
    raceName: 'BUCS Rowing Championships',
    raceCategory: 'W1 University Women Open 8+',
    raceDate: '2026-04-20T11:00',
    boatName: 'De Montfort II',
    coachName: 'Lisa Hall',
    crewNames: ['Amber Ross', 'Brooke Stone', 'Casey Hunt', 'Drew Park', 'Eden Bell', 'Frankie Wade', 'Grace Ford', 'Harper Quinn', 'Indie Blake'],
  },
  {
    name: 'Newcastle University Women\'s Eight',
    raceName: 'BUCS Rowing Championships',
    raceCategory: 'W1 University Women Open 8+',
    raceDate: '2026-04-21T10:30',
    boatName: 'Geordie Lass',
    coachName: 'Rachel Dunn',
    crewNames: ['Jackie Dale', 'Kerry Nash', 'Leah Tate', 'Molly Kent', 'Naomi Wade', 'Olivia Fox', 'Paige Cole', 'Quinn Reid', 'Rachel Price'],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient()

  try {
    const [user, clubs, templates] = await Promise.all([
      prisma.user.findFirst(),
      prisma.club.findMany({ orderBy: { name: 'asc' } }),
      prisma.template.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    ])

    if (!user) throw new Error('No user found in database')
    if (clubs.length === 0) throw new Error('No clubs found in database')
    if (templates.length === 0) throw new Error('No active templates found in database')

    console.log(`User:      ${user.email}`)
    console.log(`Clubs:     ${clubs.length}`)
    console.log(`Templates: ${templates.length}`)
    console.log(`Crews:     ${CREW_DEFS.length}`)
    if (DRY_RUN) console.log('\n── DRY RUN — nothing will be written ──\n')
    else console.log()

    let created = 0
    let skipped = 0

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i]
      const def = CREW_DEFS[i % CREW_DEFS.length]
      const club = clubs[i % clubs.length]

      const label = `${def.name} → ${template.name} (${club.name})`

      if (DRY_RUN) {
        console.log(`  [dry] ${label}`)
        continue
      }

      // Skip if a crew with this exact name already belongs to this user
      const existing = await prisma.crew.findFirst({
        where: { name: def.name, userId: user.id },
      })
      if (existing) {
        console.log(`  skip  ${label}`)
        skipped++
        continue
      }

      await prisma.crew.create({
        data: {
          name: def.name,
          raceName: def.raceName,
          raceCategory: def.raceCategory,
          raceDate: def.raceDate,
          boatName: def.boatName,
          coachName: def.coachName,
          boatCode: '8+',
          crewNames: def.crewNames,
          userId: user.id,
          clubId: club.id,
        },
      })

      console.log(`  ✓     ${label}`)
      created++
    }

    console.log(`\n─────────────────────────────────────`)
    if (DRY_RUN) {
      console.log(`Would create ${templates.length} crews`)
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
