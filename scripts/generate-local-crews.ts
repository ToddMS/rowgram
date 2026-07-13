#!/usr/bin/env tsx
/**
 * generate-local-crews.ts
 *
 * Fetches all 8+ crews from the local (dev) database and renders every active
 * template for each crew.  Images are saved to:
 *
 *   local-crew-output/{crew-slug}/{template-N}.png
 *
 * Usage:
 *   npx tsx scripts/generate-local-crews.ts
 *   npx tsx scripts/generate-local-crews.ts --template=1,4,11   # subset of templates
 *   npx tsx scripts/generate-local-crews.ts --boat=4+,8+        # different boat codes
 *   npx tsx scripts/generate-local-crews.ts --out=my-dir        # custom output dir
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { TemplateCompiler } from '../src/lib/templateCompiler'

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)

const onlyTemplates = args
  .filter((a) => a.startsWith('--template='))
  .flatMap((a) => a.slice('--template='.length).split(',').map(Number))

const boatCodes = args
  .filter((a) => a.startsWith('--boat='))
  .flatMap((a) => a.slice('--boat='.length).split(','))
  .filter(Boolean)

const boatFilter = boatCodes.length ? boatCodes : ['8+']

const outArg = args.find((a) => a.startsWith('--out='))?.slice('--out='.length)
const OUT_DIR = path.join(process.cwd(), outArg ?? 'local-crew-output')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function detectTemplateNumbers(): Array<number> {
  // We scan the public/templates dir rather than querying the DB so we always
  // get the latest set even if the Template table is out of sync.
  const templateDir = path.join(process.cwd(), 'public', 'templates')
  // We'll return numbers from 1–21; the render step will skip missing dirs.
  return Array.from({ length: 21 }, (_, i) => i + 1)
}

async function templateExists(num: number): Promise<boolean> {
  const dir = path.join(process.cwd(), 'public', 'templates', `template${num}`)
  try {
    await fs.access(path.join(dir, `template${num}.html`))
    return true
  } catch {
    return false
  }
}

async function renderToPng(
  num: number,
  crew: {
    id: string
    name: string
    raceName: string | null
    raceCategory: string | null
    raceDate: string | null
    boatCode: string
    boatName: string | null
    coachName: string | null
    crewNames: Array<string>
    club: { name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null } | null
  },
  browser: any,
): Promise<Buffer> {
  const templateName = `template${num}`
  const dir = path.join(process.cwd(), 'public', 'templates', templateName)

  let html = await fs.readFile(path.join(dir, `${templateName}.html`), 'utf-8')
  const css = await fs.readFile(path.join(dir, `${templateName}.css`), 'utf-8')
  html = html.replace('</head>', `<style>${css}</style></head>`)
  html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '')

  const template = {
    id: `template-${num}`,
    name: `Template ${num}`,
    templateType: 'custom',
    metadata: {
      htmlFile: `templates/${templateName}/${templateName}.html`,
      cssFile: `templates/${templateName}/${templateName}.css`,
    },
  }

  const colors = {
    primaryColor: crew.club?.primaryColor ?? '#15803d',
    secondaryColor: crew.club?.secondaryColor ?? '#f9a8d4',
  }

  // Silence compiler noise during batch render
  const _log = console.log
  const _error = console.error
  console.log = () => undefined
  console.error = () => undefined

  let compiled: string
  try {
    const data = await TemplateCompiler.formatCrewData(crew, template)
    compiled = TemplateCompiler.compileTemplate(html, data, colors, template.metadata)
  } finally {
    console.log = _log
    console.error = _error
  }

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1080, height: 1080 })
    await page.setContent(compiled, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 600))
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    })
    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient()

  let crews: Array<any>
  try {
    crews = await prisma.crew.findMany({
      where: { boatCode: { in: boatFilter } },
      include: { club: true },
      orderBy: { createdAt: 'asc' },
    })
  } finally {
    await prisma.$disconnect()
  }

  if (crews.length === 0) {
    console.error(`No crews found with boatCode in [${boatFilter.join(', ')}].`)
    process.exit(1)
  }

  console.log(`Found ${crews.length} crew(s): ${crews.map((c) => c.name).join(', ')}`)

  const allNums = detectTemplateNumbers()
  const baseNums = onlyTemplates.length ? allNums.filter((n) => onlyTemplates.includes(n)) : allNums

  // Filter to only templates that actually exist on disk
  const templatesToRun: Array<number> = []
  for (const n of baseNums) {
    if (await templateExists(n)) templatesToRun.push(n)
  }

  console.log(`Templates: ${templatesToRun.join(', ')}`)
  console.log(`Output:    ${OUT_DIR}`)
  console.log(`Total renders: ${crews.length * templatesToRun.length}\n`)

  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let passed = 0
  let failed = 0
  const failures: Array<string> = []

  try {
    for (const crew of crews) {
      const crewSlug = slugify(crew.name)
      const crewDir = path.join(OUT_DIR, crewSlug)
      await fs.mkdir(crewDir, { recursive: true })

      for (const num of templatesToRun) {
        const label = `${crew.name} × template${num}`
        const start = Date.now()
        try {
          const png = await renderToPng(num, crew, browser)
          const outPath = path.join(crewDir, `template${num}.png`)
          await fs.writeFile(outPath, png)
          const ms = Date.now() - start
          console.log(`  ✓  ${label}  (${ms}ms, ${(png.length / 1024).toFixed(0)}KB)`)
          passed++
        } catch (err) {
          const ms = Date.now() - start
          const msg = err instanceof Error ? err.message.split('\n')[0] : String(err)
          console.log(`  ✗  ${label}  (${ms}ms) — ${msg}`)
          failures.push(`${label}: ${msg}`)
          failed++
        }
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`${passed} passed  ${failed} failed`)
  console.log(`Output: ${OUT_DIR}`)

  if (failures.length > 0) {
    console.log('\nFailures:')
    failures.forEach((f) => console.log(`  - ${f}`))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
