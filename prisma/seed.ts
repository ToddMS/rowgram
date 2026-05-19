import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create boat types - covering all common rowing boat classes
  console.log('Creating boat types...')

  const boatTypes = [
    // Sculling boats (each rower has two oars)
    { name: 'Single Scull', code: '1x', seats: 1, category: 'sculling' },
    { name: 'Double Scull', code: '2x', seats: 2, category: 'sculling' },
    { name: 'Quadruple Scull', code: '4x', seats: 4, category: 'sculling' },
    {
      name: 'Quadruple Scull with Cox',
      code: '4x+',
      seats: 5,
      category: 'sculling',
    },
    { name: 'Octuple Scull', code: '8x', seats: 8, category: 'sculling' },

    // Sweep boats (each rower has one oar)
    { name: 'Pair', code: '2-', seats: 2, category: 'sweep' },
    { name: 'Coxed Pair', code: '2+', seats: 3, category: 'sweep' },
    { name: 'Coxless Four', code: '4-', seats: 4, category: 'sweep' },
    { name: 'Coxed Four', code: '4+', seats: 5, category: 'sweep' },
    { name: 'Eight', code: '8+', seats: 9, category: 'sweep' },
  ]

  for (const boatType of boatTypes) {
    await prisma.boatType.upsert({
      where: { code: boatType.code },
      update: {},
      create: {
        ...boatType,
        metadata: {
          description: `${boatType.name} - ${boatType.seats} total seats`,
          hasCox: boatType.code.includes('+'),
          rowersOnly: boatType.code.includes('+')
            ? boatType.seats - 1
            : boatType.seats,
        },
      },
    })
  }

  console.log('✅ Created boat types')

  // Create template types and basic templates
  console.log('Creating templates...')

  const templates = [
    {
      name: 'Classic Blue',
      templateType: 'classic',
      previewUrl: '/templates/classic-blue-preview.jpg',
      metadata: {
        primaryColor: '#1e40af',
        secondaryColor: '#ffffff',
        fontFamily: 'serif',
        style: 'traditional',
      },
    },
    {
      name: 'Modern Red',
      templateType: 'modern',
      previewUrl: '/templates/modern-red-preview.jpg',
      metadata: {
        primaryColor: '#dc2626',
        secondaryColor: '#f9fafb',
        fontFamily: 'sans-serif',
        style: 'contemporary',
      },
    },
    {
      name: 'Elegant Navy',
      templateType: 'classic',
      previewUrl: '/templates/elegant-navy-preview.jpg',
      metadata: {
        primaryColor: '#1e3a8a',
        secondaryColor: '#f8fafc',
        fontFamily: 'serif',
        style: 'formal',
      },
    },
    {
      name: 'Minimal White',
      templateType: 'minimal',
      previewUrl: '/templates/minimal-white-preview.jpg',
      metadata: {
        primaryColor: '#374151',
        secondaryColor: '#ffffff',
        fontFamily: 'sans-serif',
        style: 'clean',
      },
    },
    {
      name: 'Bold Orange',
      templateType: 'modern',
      previewUrl: '/templates/bold-orange-preview.jpg',
      metadata: {
        primaryColor: '#ea580c',
        secondaryColor: '#1f2937',
        fontFamily: 'sans-serif',
        style: 'energetic',
      },
    },
    {
      name: 'Traditional Green',
      templateType: 'classic',
      previewUrl: '/templates/traditional-green-preview.jpg',
      metadata: {
        primaryColor: '#059669',
        secondaryColor: '#ecfdf5',
        fontFamily: 'serif',
        style: 'heritage',
      },
    },
  ]

  for (const template of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: template.name },
    })

    if (!existing) {
      await prisma.template.create({
        data: template,
      })
    }
  }

  console.log('✅ Created templates')

  // Create a sample user for development
  console.log('Creating sample user...')

  const sampleUser = await prisma.user.upsert({
    where: { email: 'demo@rowing-club.com' },
    update: {},
    create: {
      email: 'demo@rowing-club.com',
      name: 'Demo Rower',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      preferences: {
        defaultClub: 'Sample Rowing Club',
        favoriteTemplateType: 'classic',
      },
    },
  })

  console.log('✅ Created sample user')

  // Create sample clubs
  console.log('Creating sample clubs...')

  const sampleClubs = [
    {
      name: 'Sample Rowing Club',
      primaryColor: '#1e40af', // Blue
      secondaryColor: '#ffffff', // White
      userId: sampleUser.id,
    },
    {
      name: 'Thames Rowing Club',
      primaryColor: '#dc2626', // Red
      secondaryColor: '#fbbf24', // Gold
      userId: sampleUser.id,
    },
    {
      name: 'Cambridge University Boat Club',
      primaryColor: '#7dd3fc', // Light Blue
      secondaryColor: '#1e3a8a', // Navy
      userId: sampleUser.id,
    },
  ]

  const createdClubs = []
  for (const club of sampleClubs) {
    const existing = await prisma.club.findFirst({
      where: { name: club.name, userId: club.userId },
    })

    if (!existing) {
      const newClub = await prisma.club.create({
        data: club,
      })
      createdClubs.push(newClub)
    }
  }

  console.log('✅ Created sample clubs')

  // Create multiple sample crews
  console.log('Creating sample crews...')

  const boatTypeMap = await prisma.boatType.findMany()
  const eightBoatType = boatTypeMap.find(bt => bt.code === '8+')
  const fourBoatType = boatTypeMap.find(bt => bt.code === '4-')
  const pairBoatType = boatTypeMap.find(bt => bt.code === '2-')
  const singleBoatType = boatTypeMap.find(bt => bt.code === '1x')

  const sampleClub = await prisma.club.findFirst({
    where: { name: 'Sample Rowing Club', userId: sampleUser.id },
  })

  const thamesClub = await prisma.club.findFirst({
    where: { name: 'Thames Rowing Club', userId: sampleUser.id },
  })

  const cambridgeClub = await prisma.club.findFirst({
    where: { name: 'Cambridge University Boat Club', userId: sampleUser.id },
  })

  const sampleCrews = [
    {
      name: 'Varsity Eight',
      clubId: cambridgeClub?.id,
      raceName: 'The Boat Race 2024',
      boatName: 'Goldie',
      coachName: 'Rob Baker',
      crewNames: [
        'James Mitchell', 'William Thompson', 'Oliver Jackson', 'George White',
        'Harry Davies', 'Jack Wilson', 'Charlie Moore', 'Thomas Taylor',
        'Emma Cox'
      ],
      boatTypeId: eightBoatType?.id,
      userId: sampleUser.id,
    },
    {
      name: 'Senior Four',
      clubId: thamesClub?.id,
      raceName: 'Henley Royal Regatta',
      boatName: 'Lightning',
      coachName: 'Sarah Parker',
      crewNames: ['Alex Johnson', 'Sam Williams', 'Ben Davies', 'Tom Evans'],
      boatTypeId: fourBoatType?.id,
      userId: sampleUser.id,
    },
    {
      name: 'Championship Pair',
      clubId: sampleClub?.id,
      raceName: 'World Championships',
      boatName: 'Velocity',
      coachName: 'Helen Cooper',
      crewNames: ['Matthew Hall', 'Joshua Allen'],
      boatTypeId: pairBoatType?.id,
      userId: sampleUser.id,
    },
    {
      name: 'Elite Single',
      clubId: thamesClub?.id,
      raceName: 'Diamond Challenge Sculls',
      boatName: 'Phoenix',
      coachName: 'David Turner',
      crewNames: ['Sophie Martin'],
      boatTypeId: singleBoatType?.id,
      userId: sampleUser.id,
    }
  ]

  for (const crew of sampleCrews) {
    if (crew.boatTypeId) {
      const existingCrew = await prisma.crew.findFirst({
        where: { name: crew.name, userId: sampleUser.id },
      })

      if (!existingCrew) {
        await prisma.crew.create({
          data: { ...crew, boatTypeId: crew.boatTypeId! },
        })
      }
    }
  }

  console.log('✅ Created sample crews')

  // Create some saved images
  console.log('Creating sample saved images...')

  const allTemplates = await prisma.template.findMany()
  const crews = await prisma.crew.findMany({ where: { userId: sampleUser.id } })

  if (allTemplates.length > 0 && crews.length > 0) {
    for (let i = 0; i < Math.min(3, crews.length); i++) {
      const existingImage = await prisma.savedImage.findFirst({
        where: {
          crewId: crews[i].id,
          userId: sampleUser.id
        },
      })

      if (!existingImage) {
        await prisma.savedImage.create({
          data: {
            filename: `crew_image_${i + 1}.jpg`,
            imageUrl: `https://images.unsplash.com/photo-156${i}000000?w=1080&h=1080&fit=crop`,
            fileSize: 256000 + (i * 50000),
            dimensions: { width: 1080, height: 1080 },
            metadata: {
              template: allTemplates[i % allTemplates.length].name,
              generated: new Date().toISOString(),
              colors: ['#1e3a8a', '#ffffff']
            },
            crewId: crews[i].id,
            templateId: allTemplates[i % allTemplates.length].id,
            userId: sampleUser.id
          }
        })
      }
    }
  }

  console.log('✅ Created sample saved images')

  const counts = {
    boatTypes: await prisma.boatType.count(),
    templates: await prisma.template.count(),
    users: await prisma.user.count(),
    clubs: await prisma.club.count(),
    crews: await prisma.crew.count(),
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log(
    `📊 Created: ${counts.boatTypes} boat types, ${counts.templates} templates, ${counts.clubs} clubs, ${counts.users} users, ${counts.crews} crews`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
