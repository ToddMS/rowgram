import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding new templates to database...')

  const newTemplates = [
    { num: 3 },
    { num: 4 },
    { num: 5 },
    { num: 6 },
    { num: 7 },
    { num: 8 },
    { num: 9 },
    { num: 10 },
    { num: 11 },
    { num: 12 },
    { num: 13 },
    { num: 14 },
    { num: 15 },
    { num: 16 },
  ]

  for (const { num } of newTemplates) {
    const name = `Template ${num}`
    const htmlFile = `templates/template${num}/template${num}.html`
    const cssFile = `templates/template${num}/template${num}.css`

    const existing = await prisma.template.findFirst({ where: { name } })

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          metadata: {
            htmlFile,
            cssFile,
          },
        },
      })
      console.log(`Updated: ${name}`)
    } else {
      await prisma.template.create({
        data: {
          name,
          templateType: 'custom',
          previewUrl: `/templates/previews/template-${num}.svg`,
          isActive: true,
          metadata: {
            htmlFile,
            cssFile,
          },
        },
      })
      console.log(`Created: ${name}`)
    }
  }

  console.log('\nAll templates registered.')

  const all = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { name: true, templateType: true },
  })
  console.log(`Active templates (${all.length}):`)
  all.forEach((t) => console.log(`  - ${t.name} (${t.templateType})`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
