import { PrismaClient } from '@prisma/client'

const USER_EMAIL = 'toddsandlerwasd@gmail.com'

const DEV_URL = 'postgresql://postgres.bhzcthtvbbcumbdgmkym:vPRLzWaUZtGTR0cv@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true'

const PROD_URL = process.env.DATABASE_URL
if (!PROD_URL) {
  console.error('Pass DATABASE_URL=<prod_url> when running this script')
  process.exit(1)
}

const devPrisma = new PrismaClient({ datasources: { db: { url: DEV_URL } } })
const prodPrisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } })

async function main() {
  // Read clubs from dev
  const devUser = await devPrisma.user.findFirst({ where: { email: USER_EMAIL } })
  if (!devUser) { console.error('User not found in dev db'); process.exit(1) }

  const clubs = await devPrisma.club.findMany({
    where: { userId: devUser.id },
    select: { name: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  })
  console.log(`Exporting ${clubs.length} clubs from dev...\n`)

  // Find user in prod
  const prodUser = await prodPrisma.user.findFirst({ where: { email: USER_EMAIL } })
  if (!prodUser) { console.error('User not found in prod db — have you signed in to prod yet?'); process.exit(1) }

  // Upsert each club in prod
  for (const club of clubs) {
    const existing = await prodPrisma.club.findFirst({
      where: { userId: prodUser.id, name: club.name },
    })
    if (existing) {
      await prodPrisma.club.update({
        where: { id: existing.id },
        data: { primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, logoUrl: club.logoUrl },
      })
      console.log(`  ↺ ${club.name} (updated)`)
    } else {
      await prodPrisma.club.create({
        data: { name: club.name, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, logoUrl: club.logoUrl, userId: prodUser.id },
      })
      console.log(`  ✓ ${club.name} (created)`)
    }
  }

  console.log(`\nDone — ${clubs.length} clubs migrated to prod.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => {
    await devPrisma.$disconnect()
    await prodPrisma.$disconnect()
  })
