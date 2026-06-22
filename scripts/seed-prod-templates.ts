import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PREVIEWS_WITH_IMAGE = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15])

const TEMPLATE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

async function main() {
  console.log('Upserting templates to production...\n')

  for (const num of TEMPLATE_NUMS) {
    const name = `Template ${num}`
    const previewUrl = PREVIEWS_WITH_IMAGE.has(num)
      ? `/templates/previews/template-${num}.png`
      : null

    const existing = await prisma.template.findFirst({ where: { name } })

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          previewUrl: previewUrl ?? existing.previewUrl,
          metadata: {
            htmlFile: `templates/template${num}/template${num}.html`,
            cssFile: `templates/template${num}/template${num}.css`,
          },
        },
      })
      console.log(`Updated:  ${name}`)
    } else {
      await prisma.template.create({
        data: {
          name,
          templateType: 'custom',
          previewUrl,
          isActive: true,
          metadata: {
            htmlFile: `templates/template${num}/template${num}.html`,
            cssFile: `templates/template${num}/template${num}.css`,
          },
        },
      })
      console.log(`Created:  ${name}`)
    }
  }

  console.log('\nDone. Active templates:')
  const all = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { name: true, previewUrl: true },
  })
  all.forEach((t) => console.log(`  ${t.name}  →  ${t.previewUrl ?? '(no preview)'}`))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
