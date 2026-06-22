import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'toddsandlerwasd@gmail.com' } })
  if (!user) {
    console.error('User not found in dev database')
    process.exit(1)
  }

  const clubs = await prisma.club.findMany({
    where: { userId: user.id },
    select: { name: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  })

  console.log(`Found ${clubs.length} clubs for ${user.email}`)
  console.log(JSON.stringify(clubs, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
