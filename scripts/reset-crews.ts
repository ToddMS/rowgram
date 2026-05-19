import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetCrews() {
  console.log('🗑️  Clearing all existing crews...')

  // Delete all saved images first (due to foreign key constraints)
  await prisma.savedImage.deleteMany()
  console.log('   ✅ Deleted saved images')

  // Delete all crews
  await prisma.crew.deleteMany()
  console.log('   ✅ Deleted all crews')

  console.log('\n🚣‍♀️ Creating fresh sample crew data...')

  // Get existing boat types and users
  const boatTypes = await prisma.boatType.findMany()
  const users = await prisma.user.findMany()
  const clubs = await prisma.club.findMany()

  if (users.length === 0) {
    console.log('❌ No users found. Please create a user first.')
    return
  }

  const user = users[0]
  console.log(`   Using user: ${user.name} (${user.email})`)

  // Find specific clubs or create them if missing
  let auriollKensington = clubs.find(c => c.name.includes('Auriol'))
  let thamesRC = clubs.find(c => c.name.includes('Thames'))
  let londonRC = clubs.find(c => c.name.includes('London'))

  // Create missing clubs
  if (!thamesRC) {
    console.log('   Creating Thames RC...')
    thamesRC = await prisma.club.create({
      data: {
        name: 'Thames Rowing Club',
        primaryColor: '#2563eb',
        secondaryColor: '#f8fafc',
        userId: user.id,
      }
    })
  }

  if (!londonRC) {
    console.log('   Creating London RC...')
    londonRC = await prisma.club.create({
      data: {
        name: 'London Rowing Club',
        primaryColor: '#dc2626',
        secondaryColor: '#fef2f2',
        userId: user.id,
      }
    })
  }

  console.log(`   Clubs available: ${clubs.length}`)
  console.log(`   Auriol Kensington: ${auriollKensington ? '✅' : '❌'}`)
  console.log(`   Thames RC: ${thamesRC ? '✅' : '❌'}`)
  console.log(`   London RC: ${londonRC ? '✅' : '❌'}`)

  // Get available boat types for reference
  console.log('   Available boat types:')
  boatTypes.forEach(bt => console.log(`     - ${bt.name} (${bt.code})`))

  // Sample crew data - one for each boat type in Auriol Kensington + random crews for other clubs
  const sampleCrews = [
    // Auriol Kensington crews for Hammersmith Regatta - one for each boat type
    {
      name: "Senior Men's Eight",
      raceName: "Hammersmith Regatta",
      raceDate: "2024-03-15",
      raceCategory: "Senior Men",
      crewNames: ["James Wilson", "Tom Brown", "Alex Smith", "Charlie Davis", "Sam Johnson", "Matt Taylor", "David Miller", "cox: Sarah Jones"],
      boatTypeId: boatTypes.find(bt => bt.code === '8+')?.id,
      userId: user.id,
      clubId: auriollKensington?.id
    },
    {
      name: "Women's Coxed Four",
      raceName: "Hammersmith Regatta",
      raceDate: "2024-03-15",
      raceCategory: "Senior Women",
      crewNames: ["Emma Thompson", "Kate Williams", "Lucy Brown", "cox: Mike Davis"],
      boatTypeId: boatTypes.find(bt => bt.code === '4+')?.id,
      userId: user.id,
      clubId: auriollKensington?.id
    },
    {
      name: "Men's Coxless Four",
      raceName: "Hammersmith Regatta",
      raceDate: "2024-03-15",
      raceCategory: "Senior Men",
      crewNames: ["Harry Wilson", "Josh Taylor", "Ryan Clark", "Ben White"],
      boatTypeId: boatTypes.find(bt => bt.code === '4x')?.id,
      userId: user.id,
      clubId: auriollKensington?.id
    },
    {
      name: "Men's Double Scull",
      raceName: "Hammersmith Regatta",
      raceDate: "2024-03-15",
      raceCategory: "Senior Men",
      crewNames: ["Alex Smith", "Charlie Davis"],
      boatTypeId: boatTypes.find(bt => bt.code === '2x')?.id,
      userId: user.id,
      clubId: auriollKensington?.id
    },
    {
      name: "Men's Single Scull",
      raceName: "Hammersmith Regatta",
      raceDate: "2024-03-15",
      raceCategory: "Senior Men",
      crewNames: ["Tom Anderson"],
      boatTypeId: boatTypes.find(bt => bt.code === '1x')?.id,
      userId: user.id,
      clubId: auriollKensington?.id
    },
    // Random crews for other clubs at smaller regattas
    {
      name: "Masters Eight",
      raceName: "Kingston Regatta",
      raceDate: "2024-04-20",
      raceCategory: "Masters",
      crewNames: ["Peter Johnson", "Mark Davis", "Steve Wilson", "Paul Taylor", "Rob Smith", "Andy Brown", "Chris Miller", "cox: Helen Clark"],
      boatTypeId: boatTypes.find(bt => bt.code === '8+')?.id,
      userId: user.id,
      clubId: thamesRC?.id
    },
    {
      name: "Women's Double",
      raceName: "Putney Regatta",
      raceDate: "2024-05-10",
      raceCategory: "Senior Women",
      crewNames: ["Sophie Williams", "Amy Jones"],
      boatTypeId: boatTypes.find(bt => bt.code === '2x')?.id,
      userId: user.id,
      clubId: londonRC?.id
    },
    {
      name: "Club Four",
      raceName: "Richmond Regatta",
      raceDate: "2024-06-01",
      raceCategory: "Club Level",
      crewNames: ["Dan Wilson", "Mike Brown", "Tom Green", "cox: Rachel Smith"],
      boatTypeId: boatTypes.find(bt => bt.code === '4+')?.id,
      userId: user.id,
      clubId: thamesRC?.id
    }
  ]

  console.log(`\n   Creating ${sampleCrews.length} sample crews...`)

  for (const crewData of sampleCrews) {
    if (!crewData.boatTypeId) {
      console.log(`   ⚠️  Skipping ${crewData.name} - no boat type found`)
      continue
    }

    try {
      const crew = await prisma.crew.create({
        data: { ...crewData, boatTypeId: crewData.boatTypeId! },
        include: {
          boatType: true,
          club: true
        }
      })
      console.log(`   ✅ Created: ${crew.name} (${crew.boatType.name}) - Race Category: ${crew.raceCategory || 'None'}`)
    } catch (error) {
      console.log(`   ❌ Failed to create ${crewData.name}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('\n🎉 Successfully reset crews with fresh sample data!')
  console.log('\n📊 Current database summary:')

  const crewCount = await prisma.crew.count()
  const clubCount = await prisma.club.count()
  const boatTypeCount = await prisma.boatType.count()
  const userCount = await prisma.user.count()

  console.log(`   • ${crewCount} crews`)
  console.log(`   • ${clubCount} clubs`)
  console.log(`   • ${boatTypeCount} boat types`)
  console.log(`   • ${userCount} users`)
}

resetCrews()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })