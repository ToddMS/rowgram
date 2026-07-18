#!/usr/bin/env tsx
/**
 * generate-small-boat-previews.ts
 *
 * Renders every active template for each unique club × every non-8 boat size.
 * One synthetic crew is built per club per boat size — no DB crew records needed.
 *
 * Usage:
 *   npx tsx scripts/generate-small-boat-previews.ts
 *   npx tsx scripts/generate-small-boat-previews.ts --template=1,4,11
 *   npx tsx scripts/generate-small-boat-previews.ts --boat=4+,2-
 *   npx tsx scripts/generate-small-boat-previews.ts --out=my-dir
 *
 * Output: local-crew-output-small-boats/{club-slug}/{boat-code}/{template-N}.png
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

const boatArg = args
  .filter((a) => a.startsWith('--boat='))
  .flatMap((a) => a.slice('--boat='.length).split(','))
  .filter(Boolean)

const outArg = args.find((a) => a.startsWith('--out='))?.slice('--out='.length)
const OUT_DIR = path.join(process.cwd(), outArg ?? 'local-crew-output-small-boats')

// ─── Boat size definitions ─────────────────────────────────────────────────────

const ALL_SMALL_BOATS: Array<{
  code: string
  name: string
  hasCox: boolean
  rowerCount: number
}> = [
  { code: '4+', name: 'Coxed Four', hasCox: true,  rowerCount: 4 },
  { code: '4-', name: 'Four',       hasCox: false, rowerCount: 4 },
  { code: '4x', name: 'Quad',       hasCox: false, rowerCount: 4 },
  { code: '2-', name: 'Pair',       hasCox: false, rowerCount: 2 },
  { code: '2x', name: 'Double',     hasCox: false, rowerCount: 2 },
  { code: '1x', name: 'Single',     hasCox: false, rowerCount: 1 },
]

const BOAT_FILTER = boatArg.length
  ? ALL_SMALL_BOATS.filter((b) => boatArg.includes(b.code))
  : ALL_SMALL_BOATS

// ─── Generic names pools ───────────────────────────────────────────────────────

const ROWER_NAMES = [
  'Alex Morgan', 'Sam Taylor', 'Jamie Reed', 'Chris Lane',
  'Robin Hall', 'Casey Ford', 'Drew Blake', 'Morgan Shaw',
]
const COX_NAMES = ['Pat Quinn', 'Jordan Cross', 'Avery Park']
const RACE_NAMES = [
  'Henley Royal Regatta',
  'National Schools Regatta',
  'BUCS Championships',
  'Tideway Head',
  'British Rowing Juniors',
  'Women\'s Henley Regatta',
]
const COACHES = ['Sarah Hill', 'Mark Evans', 'Julia Brooks', 'Rob Baker', 'Paul Thompson']

function pick<T>(arr: Array<T>, index: number): T {
  return arr[index % arr.length]
}

function buildCrewNames(boatDef: typeof ALL_SMALL_BOATS[0], clubIndex: number): Array<string> {
  const names: Array<string> = []
  if (boatDef.hasCox) names.push(pick(COX_NAMES, clubIndex))
  for (let i = 0; i < boatDef.rowerCount; i++) {
    names.push(ROWER_NAMES[(clubIndex * 4 + i) % ROWER_NAMES.length])
  }
  return names
}

function buildCrew(
  club: { id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null },
  boatDef: typeof ALL_SMALL_BOATS[0],
  clubIndex: number,
) {
  return {
    id: `synthetic-${club.id}-${boatDef.code}`,
    name: `${club.name} ${boatDef.name}`,
    raceName: pick(RACE_NAMES, clubIndex),
    raceCategory: `M1 Club ${boatDef.name} ${boatDef.code}`,
    raceDate: '2026-07-01T10:00',
    boatCode: boatDef.code,
    boatName: boatDef.name,
    coachName: pick(COACHES, clubIndex),
    crewNames: buildCrewNames(boatDef, clubIndex),
    club: {
      name: club.name,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      logoUrl: club.logoUrl,
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function codeSlug(code: string): string {
  return code.replace('+', 'plus').replace('-', 'minus').replace('x', 'x')
}

async function templateExists(num: number): Promise<boolean> {
  try {
    await fs.access(
      path.join(process.cwd(), 'public', 'templates', `template${num}`, `template${num}.html`),
    )
    return true
  } catch {
    return false
  }
}

async function renderToPng(
  num: number,
  crew: ReturnType<typeof buildCrew>,
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
    primaryColor: crew.club.primaryColor,
    secondaryColor: crew.club.secondaryColor,
  }

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
  let clubs: Array<{ id: string; name: string; primaryColor: string; secondaryColor: string; logoUrl: string | null }>
  try {
    clubs = await prisma.club.findMany({ orderBy: { name: 'asc' } })
  } finally {
    await prisma.$disconnect()
  }

  if (clubs.length === 0) {
    console.error('No clubs found in database.')
    process.exit(1)
  }

  // Deduplicate by color pair so we don't render identical-looking outputs
  const seen = new Set<string>()
  const uniqueClubs = clubs.filter((c) => {
    const key = `${c.primaryColor.toLowerCase()}|${c.secondaryColor.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const allNums = Array.from({ length: 21 }, (_, i) => i + 1)
  const baseNums = onlyTemplates.length ? allNums.filter((n) => onlyTemplates.includes(n)) : allNums
  const templatesToRun: Array<number> = []
  for (const n of baseNums) {
    if (await templateExists(n)) templatesToRun.push(n)
  }

  const totalRenders = uniqueClubs.length * BOAT_FILTER.length * templatesToRun.length

  console.log(`Unique clubs:  ${uniqueClubs.length} (of ${clubs.length} total)`)
  console.log(`Boat sizes:    ${BOAT_FILTER.map((b) => b.code).join(', ')}`)
  console.log(`Templates:     ${templatesToRun.join(', ')}`)
  console.log(`Output:        ${OUT_DIR}`)
  console.log(`Total renders: ${totalRenders}\n`)

  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  let passed = 0
  let failed = 0
  const failures: Array<string> = []

  try {
    for (let ci = 0; ci < uniqueClubs.length; ci++) {
      const club = uniqueClubs[ci]
      const clubSlug = slugify(club.name)

      for (const boatDef of BOAT_FILTER) {
        const crew = buildCrew(club, boatDef, ci)
        const boatDir = path.join(OUT_DIR, clubSlug, codeSlug(boatDef.code))
        await fs.mkdir(boatDir, { recursive: true })

        for (const num of templatesToRun) {
          const label = `${club.name} ${boatDef.code} × template${num}`
          const start = Date.now()
          try {
            const png = await renderToPng(num, crew, browser)
            await fs.writeFile(path.join(boatDir, `template${num}.png`), png)
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
