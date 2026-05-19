import { prisma } from '../src/lib/prisma'

async function cleanupCrews() {
  console.log('🧹 Starting database cleanup...')

  // Get all boat types
  const boatTypes = await prisma.boatType.findMany({
    orderBy: { name: 'asc' }
  })

  console.log('🚣 Found boat types:', boatTypes.map(bt => `${bt.code} (${bt.name})`))

  // For each boat type, keep only the first crew and delete the rest
  for (const boatType of boatTypes) {
    const crews = await prisma.crew.findMany({
      where: { boatTypeId: boatType.id },
      orderBy: { createdAt: 'asc' },
      include: { boatType: true }
    })

    if (crews.length > 1) {
      console.log(`\n🔧 Processing ${boatType.code} (${boatType.name}): ${crews.length} crews found`)

      // Keep the first crew
      const keepCrew = crews[0]
      console.log(`✅ Keeping: "${keepCrew.name}" (ID: ${keepCrew.id})`)

      // Delete the rest
      const deleteCrew = crews.slice(1)
      for (const crew of deleteCrew) {
        console.log(`🗑️  Deleting: "${crew.name}" (ID: ${crew.id})`)

        // Delete related saved images first
        await prisma.savedImage.deleteMany({
          where: { crewId: crew.id }
        })

        // Delete the crew
        await prisma.crew.delete({
          where: { id: crew.id }
        })
      }
    } else if (crews.length === 1) {
      console.log(`✅ ${boatType.code} (${boatType.name}): 1 crew - no cleanup needed`)
    } else {
      console.log(`⚠️  ${boatType.code} (${boatType.name}): No crews found`)
    }
  }

  // Show final summary
  console.log('\n📊 Final summary:')
  const finalCrews = await prisma.crew.findMany({
    include: { boatType: true },
    orderBy: { boatType: { name: 'asc' } }
  })

  for (const crew of finalCrews) {
    console.log(`✅ ${crew.boatType.code}: "${crew.name}"`)
  }

  console.log(`\n🎉 Database cleanup complete! ${finalCrews.length} crews remaining.`)
}

cleanupCrews()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })