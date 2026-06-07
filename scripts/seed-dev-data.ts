import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_ID = 'cmq3smjtw0000p5myr0qd7rk8'

const clubs = [
  { name: 'Thames Rowing Club',              primaryColor: '#C41E3A', secondaryColor: '#FFD700' },
  { name: 'Cambridge University BC',         primaryColor: '#87CEEB', secondaryColor: '#003087' },
  { name: 'Leander Club',                    primaryColor: '#E91E8C', secondaryColor: '#FFFFFF' },
  { name: 'Oxford University Rowing Club',   primaryColor: '#002147', secondaryColor: '#FFFFFF' },
  { name: 'Molesey BC',                      primaryColor: '#006400', secondaryColor: '#FFD700' },
]

const crews = [
  {
    boatCode: '8+',
    name: 'Varsity Eight',
    clubName: 'Thames Rowing Club',
    raceName: 'The Boat Race 2026',
    boatName: 'Goldie',
    coachName: 'Rob Baker',
    raceCategory: 'Grand Final',
    crewNames: [
      'Sam Taylor',          // cox
      'James Mitchell-Brown',
      'William Thompson',
      'Oliver St. James',
      'George O\'Brien',
      'Harry Davies-Smith',
      'J. Wilson',
      'Charlie Moore',
      'T. Taylor',
    ],
  },
  {
    boatCode: '4+',
    name: 'Senior Coxed Four',
    clubName: 'Leander Club',
    raceName: 'Henley Royal Regatta',
    boatName: 'Pink Panther',
    coachName: 'Sarah P.',
    raceCategory: 'Heat 2',
    crewNames: [
      'C. Fox',              // cox
      'Alex J.',
      'Sam W.',
      'Ben D.',
      'Tom E.',
    ],
  },
  {
    boatCode: '4-',
    name: 'Coxless Four A',
    clubName: 'Cambridge University BC',
    raceName: 'Metropolitan Regatta',
    boatName: 'Pegasus',
    coachName: 'Dr. Helen Cooper',
    raceCategory: 'Final A',
    crewNames: [
      'Bartholomew Kingsley-Hughes',
      'Maximilian Schwarzenberger',
      'Ade',
      'Liu Wei',
    ],
  },
  {
    boatCode: '4x',
    name: 'Quad Sculls',
    clubName: 'Oxford University Rowing Club',
    raceName: 'World Rowing Championships',
    boatName: 'Dark Blue',
    coachName: 'M. Davies',
    raceCategory: 'Semi-Final B',
    crewNames: [
      'Sophie Martin-Lefèvre',
      'Ingrid Müller',
      'Yuki Tanaka',
      'Priya Krishnamurthy',
    ],
  },
  {
    boatCode: '2-',
    name: 'Open Pair',
    clubName: 'Molesey BC',
    raceName: 'Tideway Scullers Head',
    boatName: 'Swift',
    coachName: 'J. Brooks',
    raceCategory: null,
    crewNames: [
      'Matthew Hall',
      'Joshua Allen',
    ],
  },
  {
    boatCode: '2x',
    name: 'Double Sculls',
    clubName: 'Thames Rowing Club',
    raceName: 'Diamond Sculls',
    boatName: 'Velocity',
    coachName: 'David Turner-Smith',
    raceCategory: 'Final',
    crewNames: [
      'Emmanuella Okonkwo-Baptiste',
      'Siobhán Ó\'Flanagáin',
    ],
  },
  {
    boatCode: '1x',
    name: 'Elite Single',
    clubName: 'Leander Club',
    raceName: 'Diamond Challenge Sculls',
    boatName: 'Phoenix',
    coachName: 'R. Singh',
    raceCategory: 'Heat 1',
    crewNames: [
      'Aleksandr Petrov-Volkonsky',
    ],
  },
]

async function main() {
  console.log('Seeding clubs...')
  const clubMap: Record<string, string> = {}

  for (const club of clubs) {
    const existing = await prisma.club.findFirst({ where: { name: club.name, userId: USER_ID } })
    if (existing) {
      clubMap[club.name] = existing.id
      console.log(`  ✓ ${club.name} (existing)`)
    } else {
      const created = await prisma.club.create({ data: { ...club, userId: USER_ID } })
      clubMap[club.name] = created.id
      console.log(`  + ${club.name}`)
    }
  }

  console.log('\nSeeding crews...')
  for (const crew of crews) {
    const existing = await prisma.crew.findFirst({ where: { name: crew.name, userId: USER_ID } })
    if (existing) {
      console.log(`  ✓ ${crew.name} (existing)`)
      continue
    }
    const clubId = clubMap[crew.clubName]
    await prisma.crew.create({
      data: {
        name: crew.name,
        clubName: crew.clubName,
        clubId: clubId || undefined,
        raceName: crew.raceName,
        boatName: crew.boatName,
        coachName: crew.coachName,
        raceCategory: crew.raceCategory || undefined,
        boatCode: crew.boatCode,
        crewNames: crew.crewNames,
        userId: USER_ID,
      },
    })
    console.log(`  + ${crew.name} (${crew.boatCode})`)
  }

  console.log('\nDone!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
