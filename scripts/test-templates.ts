#!/usr/bin/env tsx
/**
 * Template test runner
 *
 * Runs two suites against every template × boat class:
 *
 *   full   — all crew fields populated (raceName, raceDate, raceCategory, coachName,
 *             boatName, club, club logo). Tests that every piece of data renders.
 *
 *   sparse — only the required fields (name, boatCode, crewNames). Every optional
 *             field is null/absent. Tests graceful degradation and fallback text.
 *
 * Output:  test-output/full/template{N}/{boatCode}.png
 *          test-output/sparse/template{N}/{boatCode}.png
 *          test-output/RESULTS.md
 *
 * Usage:
 *   npx tsx scripts/test-templates.ts               # both suites, all templates/boats
 *   npx tsx scripts/test-templates.ts --suite=full  # full suite only
 *   npx tsx scripts/test-templates.ts --suite=sparse
 *   npx tsx scripts/test-templates.ts --template=1,4,11
 *   npx tsx scripts/test-templates.ts --boat=8+,1x
 *   npx tsx scripts/test-templates.ts --verbose     # show compiler debug logs
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { TemplateCompiler } from '../src/lib/templateCompiler'

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const verbose = args.includes('--verbose')

const onlyTemplates = args
  .filter((a) => a.startsWith('--template='))
  .flatMap((a) => a.slice('--template='.length).split(',').map(Number))

const onlyBoats = args
  .filter((a) => a.startsWith('--boat='))
  .flatMap((a) => a.slice('--boat='.length).split(','))

const suiteArg = args.find((a) => a.startsWith('--suite='))?.slice('--suite='.length)
const runFull = !suiteArg || suiteArg === 'full'
const runSparse = !suiteArg || suiteArg === 'sparse'

if (args.includes('--help')) {
  console.log(`
Usage: npx tsx scripts/test-templates.ts [options]

Options:
  --suite=full|sparse  Run only one suite (default: both)
  --template=1,2,3     Only run these template numbers
  --boat=8+,1x         Only run these boat codes
  --verbose            Show template compiler debug output
  --help               Show this help

Suites:
  full    All crew fields + club logo — verifies everything renders
  sparse  Only required fields, all optional fields null — verifies fallbacks
`)
  process.exit(0)
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_TEMPLATE_NUMS = Array.from({ length: 21 }, (_, i) => i + 1)
const OUT_DIR = path.join(process.cwd(), 'test-output')
const COLORS = { primaryColor: '#1e3a8a', secondaryColor: '#fde047' }
const MIN_FILE_BYTES = 15_000

// Small inline club logo: navy circle with "HRC" in gold — used by the full suite
const TEST_LOGO_URL = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<circle cx="50" cy="50" r="48" fill="#1e3a8a"/>' +
    '<circle cx="50" cy="50" r="44" fill="none" stroke="#fde047" stroke-width="3"/>' +
    '<text x="50" y="59" text-anchor="middle" fill="#fde047" ' +
    'font-family="Arial,sans-serif" font-size="26" font-weight="bold">HRC</text>' +
    '</svg>',
).toString('base64')}`

// ─── Full crews — every optional field populated, club logo included ──────────
// crewNames order: coxed boats → [cox, stroke, 7…2, bow]; coxless → [stroke, …, bow]

const FULL_CREWS = [
  {
    id: 'full-8p',
    boatCode: '8+',
    name: 'Oxford Blue Boat',
    raceName: 'Henley Royal Regatta',
    raceCategory: 'M1 Senior Men Open 8+',
    boatName: 'Black Prince',
    coachName: 'Sean Bowden',
    raceDate: '2025-06-29',
    crewNames: ['James Hart', 'Will Foster', 'Tom Reed', 'Sam Clarke', 'Ben Walsh', 'Jack Turner', 'Alex Moore', 'Dan Hill', 'Chris Lamb'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-4p',
    boatCode: '4+',
    name: 'Dev Four',
    raceName: 'National Championships',
    raceCategory: 'W1 Senior Women Open 4+',
    boatName: 'Lady Grey',
    coachName: 'Emma Willis',
    raceDate: '2025-07-12',
    crewNames: ['Lily Chen', 'Sophie Ward', 'Alice Brown', 'Grace Lee', 'Mia Scott'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-4m',
    boatCode: '4-',
    name: 'Club Four',
    raceName: 'Spring Regatta',
    raceCategory: 'M2 Club Men Coxless 4',
    boatName: 'Harrier',
    coachName: 'Rob Jenkins',
    raceDate: '2025-04-19',
    crewNames: ['Nick Webb', 'Paul Day', 'Luke Finn', 'Adam Fox'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-4x',
    boatCode: '4x',
    name: 'Junior Quad',
    raceName: 'Junior Sculling Head',
    raceCategory: 'J18 Junior Men Quad',
    boatName: 'Osprey',
    coachName: 'David Marks',
    raceDate: '2025-09-06',
    crewNames: ['Ollie Sharp', 'Harry Knight', 'Finn Park', 'Jake Mills'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-2m',
    boatCode: '2-',
    name: 'Masters Pair',
    raceName: 'Masters Regatta',
    raceCategory: 'MasD Mixed Pair',
    boatName: 'Peregrine',
    coachName: 'Ian Ross',
    raceDate: '2025-08-03',
    crewNames: ['Peter Black', 'Kate Aldridge'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-2x',
    boatCode: '2x',
    name: 'Double Act',
    raceName: 'Sculling Festival',
    raceCategory: 'W Senior Double',
    boatName: 'Kingfisher',
    coachName: 'Sarah Holt',
    raceDate: '2025-05-17',
    crewNames: ['Nina Torres', 'Chloe Marsh'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
  {
    id: 'full-1x',
    boatCode: '1x',
    name: 'Championship Single',
    raceName: 'Diamond Sculls',
    raceCategory: 'M Senior Single Sculls',
    boatName: 'Mercury',
    coachName: 'Bill Payne',
    raceDate: '2025-06-29',
    crewNames: ['Tom Whitfield'],
    club: { name: 'Henley RC', primaryColor: '#1e3a8a', secondaryColor: '#fde047', logoUrl: TEST_LOGO_URL },
  },
]

// ─── Sparse crews — only required fields, all optional fields null ────────────
// Verifies that templates handle missing: raceName, raceDate, raceCategory,
// coachName, boatName, and no club (no logo, no club name).
//
// Expected fallbacks in rendered output:
//   RACE_NAME   → "Championship Race"
//   COACH_NAME  → "Head Coach"
//   CLUB_NAME   → "Rowing Club"
//   crewCategory → "Open Club - Open Club"
//   EDITION_TEXT (T20) → "Late Edition"

const SPARSE_CREWS = [
  {
    id: 'sparse-8p',
    boatCode: '8+',
    name: 'Untitled Eight',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['James Hart', 'Will Foster', 'Tom Reed', 'Sam Clarke', 'Ben Walsh', 'Jack Turner', 'Alex Moore', 'Dan Hill', 'Chris Lamb'],
    club: null,
  },
  {
    id: 'sparse-4p',
    boatCode: '4+',
    name: 'Untitled Coxed Four',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Lily Chen', 'Sophie Ward', 'Alice Brown', 'Grace Lee', 'Mia Scott'],
    club: null,
  },
  {
    id: 'sparse-4m',
    boatCode: '4-',
    name: 'Untitled Four',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Nick Webb', 'Paul Day', 'Luke Finn', 'Adam Fox'],
    club: null,
  },
  {
    id: 'sparse-4x',
    boatCode: '4x',
    name: 'Untitled Quad',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Ollie Sharp', 'Harry Knight', 'Finn Park', 'Jake Mills'],
    club: null,
  },
  {
    id: 'sparse-2m',
    boatCode: '2-',
    name: 'Untitled Pair',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Peter Black', 'Kate Aldridge'],
    club: null,
  },
  {
    id: 'sparse-2x',
    boatCode: '2x',
    name: 'Untitled Double',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Nina Torres', 'Chloe Marsh'],
    club: null,
  },
  {
    id: 'sparse-1x',
    boatCode: '1x',
    name: 'Untitled Single',
    raceName: null,
    raceCategory: null,
    boatName: null,
    coachName: null,
    raceDate: null,
    crewNames: ['Tom Whitfield'],
    club: null,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeBoatCode(code: string): string {
  return code.replace('+', 'plus').replace('-', 'minus')
}

/**
 * Inspects compiled HTML to verify crew data fields actually appear in output.
 *
 * Full suite: each optional field present in the crew object should be visible
 * in the compiled HTML. A miss means the template doesn't render that field.
 *
 * Sparse suite: null fields must not produce literal "null" text, and the
 * fallback strings baked into formatCrewData() must appear.
 */
function checkContent(compiledHtml: string, crew: any, suite: 'full' | 'sparse'): Array<string> {
  const issues: Array<string> = []

  if (suite === 'full') {
    // Race name — all templates use {{RACE_NAME}}
    if (crew.raceName && !compiledHtml.includes(crew.raceName)) {
      issues.push(`race name "${crew.raceName}" not in output`)
    }

    // Race category — should appear via {{crewCategory}} or {{RACE_CATEGORY}}
    if (crew.raceCategory && !compiledHtml.includes(crew.raceCategory)) {
      issues.push(`race category "${crew.raceCategory}" not in output`)
    }

    // Coach name — all templates use {{COACH_NAME}}
    // formatName() abbreviates "First Last" → "F. Last" when name > 15 chars
    if (crew.coachName) {
      const parts = crew.coachName.trim().split(/\s+/)
      const abbreviated = `${parts[0][0]}. ${parts[parts.length - 1]}`
      if (!compiledHtml.includes(crew.coachName) && !compiledHtml.includes(abbreviated)) {
        issues.push(`coach name "${crew.coachName}" not in output`)
      }
    }

    // Race date — not all templates show it; flag which ones are missing it
    if (crew.raceDate && !compiledHtml.includes(crew.raceDate)) {
      issues.push(`race date "${crew.raceDate}" not in output (template may not support it)`)
    }

    // Club logo — all templates have a {{#clubLogo}} block; if logo provided it must render
    if (crew.club?.logoUrl && !compiledHtml.includes('data:image')) {
      issues.push('club logo not in output')
    }

    // At least one crew member name must appear
    const anyMember = crew.crewNames.some((n: string) =>
      compiledHtml.includes(n.replace(/^cox:\s*/i, '').trim()),
    )
    if (!anyMember) {
      issues.push('no crew member names in output')
    }
  }

  if (suite === 'sparse') {
    // Literal "null" must not appear as visible text
    if (/>\s*null\s*</.test(compiledHtml)) {
      issues.push('literal "null" visible in output')
    }
    // Race name fallback
    if (!compiledHtml.includes('Championship Race') && !compiledHtml.includes('Championship Regatta')) {
      issues.push('race name fallback "Championship Race" missing')
    }
    // Coach fallback
    if (!compiledHtml.includes('Head Coach')) {
      issues.push('coach fallback "Head Coach" missing')
    }
  }

  return issues
}

type ResultRow = {
  suite: 'full' | 'sparse'
  template: number
  boat: string
  status: 'pass' | 'warn' | 'fail'
  warnings: Array<string>
  error?: string
  ms: number
  bytes: number
}

async function renderTemplate(
  num: number,
  crew: (typeof FULL_CREWS)[0] | (typeof SPARSE_CREWS)[0],
  browser: any,
  suite: 'full' | 'sparse',
): Promise<{ png: Buffer; warnings: Array<string> }> {
  const templateName = `template${num}`
  const dir = path.join(process.cwd(), 'public', 'templates', templateName)
  const htmlPath = path.join(dir, `${templateName}.html`)
  const cssPath = path.join(dir, `${templateName}.css`)

  let html = await fs.readFile(htmlPath, 'utf-8')
  const css = await fs.readFile(cssPath, 'utf-8')
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

  const _log = console.log
  const _error = console.error
  if (!verbose) {
    console.log = () => undefined
    console.error = () => undefined
  }

  let compiledHtml: string
  try {
    const templateData = await TemplateCompiler.formatCrewData(crew, template)
    compiledHtml = TemplateCompiler.compileTemplate(html, templateData, COLORS, template.metadata)
  } finally {
    console.log = _log
    console.error = _error
  }

  const warnings: Array<string> = []

  const unresolved = compiledHtml.match(/\{\{[^}]+\}\}/g)
  if (unresolved) {
    warnings.push(`Unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`)
  }

  checkContent(compiledHtml, crew, suite).forEach((issue) => warnings.push(issue))

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1080, height: 1080 })
    await page.setContent(compiledHtml, { waitUntil: 'networkidle0' })
    await new Promise((r) => setTimeout(r, 600))
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width: 1080, height: 1080 },
    })
    return { png: Buffer.from(screenshot), warnings }
  } finally {
    await page.close()
  }
}

async function runSuite(
  suiteName: 'full' | 'sparse',
  crews: Array<any>,
  templatesToRun: Array<number>,
  browser: any,
  totalOffset: number,
  grandTotal: number,
): Promise<Array<ResultRow>> {
  const results: Array<ResultRow> = []

  console.log(`\n── Suite: ${suiteName} ──`)

  for (const num of templatesToRun) {
    const outDir = path.join(OUT_DIR, suiteName, `template${num}`)
    await fs.mkdir(outDir, { recursive: true })

    for (const crew of crews) {
      const label = `T${String(num).padStart(2, '0')} × ${crew.boatCode.padEnd(3)}`
      const start = Date.now()
      const n = totalOffset + results.length + 1

      try {
        const { png, warnings } = await renderTemplate(num, crew, browser, suiteName)
        const ms = Date.now() - start
        const bytes = png.length

        if (bytes < MIN_FILE_BYTES) {
          warnings.push(`Small file (${(bytes / 1024).toFixed(1)}KB) — may be blank`)
        }

        const outPath = path.join(outDir, `${safeBoatCode(crew.boatCode)}.png`)
        await fs.writeFile(outPath, png)

        const status: ResultRow['status'] = warnings.length > 0 ? 'warn' : 'pass'
        const icon = status === 'pass' ? '✓' : '⚠'
        process.stdout.write(`  [${n}/${grandTotal}] ${suiteName} ${label}  ${icon}  ${ms}ms\n`)
        results.push({ suite: suiteName, template: num, boat: crew.boatCode, status, warnings, ms, bytes })
      } catch (err) {
        const ms = Date.now() - start
        const error = err instanceof Error ? err.message.split('\n')[0] : String(err)
        process.stdout.write(`  [${n}/${grandTotal}] ${suiteName} ${label}  ✗  ${ms}ms — ${error}\n`)
        results.push({ suite: suiteName, template: num, boat: crew.boatCode, status: 'fail', warnings: [], error, ms, bytes: 0 })
      }
    }
  }

  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const templatesToRun = onlyTemplates.length
    ? ALL_TEMPLATE_NUMS.filter((n) => onlyTemplates.includes(n))
    : ALL_TEMPLATE_NUMS

  const fullCrews = onlyBoats.length
    ? FULL_CREWS.filter((c) => onlyBoats.includes(c.boatCode))
    : FULL_CREWS

  const sparseCrews = onlyBoats.length
    ? SPARSE_CREWS.filter((c) => onlyBoats.includes(c.boatCode))
    : SPARSE_CREWS

  const fullCount = runFull ? templatesToRun.length * fullCrews.length : 0
  const sparseCount = runSparse ? templatesToRun.length * sparseCrews.length : 0
  const grandTotal = fullCount + sparseCount

  console.log(`\nRowGram Template Tester`)
  console.log(`Templates: ${templatesToRun.join(', ')}`)
  console.log(`Suites: ${[runFull && 'full', runSparse && 'sparse'].filter(Boolean).join(', ')}`)
  console.log(`Total renders: ${grandTotal}`)

  await fs.mkdir(OUT_DIR, { recursive: true })

  let allResults: Array<ResultRow> = []

  if (runFull) {
    const rows = await runSuite('full', fullCrews, templatesToRun, browser, 0, grandTotal)
    allResults = allResults.concat(rows)
  }

  if (runSparse) {
    const rows = await runSuite('sparse', sparseCrews, templatesToRun, browser, allResults.length, grandTotal)
    allResults = allResults.concat(rows)
  }

  await browser.close()

  // ─── Summary ──────────────────────────────────────────────────────────────

  const pass = allResults.filter((r) => r.status === 'pass').length
  const warn = allResults.filter((r) => r.status === 'warn').length
  const fail = allResults.filter((r) => r.status === 'fail').length

  console.log(`\n─────────────────────────────────────`)
  console.log(`Results: ${pass} pass  ${warn} warn  ${fail} fail  (${grandTotal} total)`)
  console.log(`Output:  ${OUT_DIR}`)

  if (warn > 0 || fail > 0) {
    console.log('\nIssues:')
    allResults
      .filter((r) => r.status !== 'pass')
      .forEach((r) => {
        const label = `  [${r.suite}] T${r.template} × ${r.boat}`
        if (r.error) {
          console.log(`${label}  FAIL: ${r.error}`)
        } else {
          r.warnings.forEach((w) => console.log(`${label}  WARN: ${w}`))
        }
      })
  }

  // ─── Write RESULTS.md ─────────────────────────────────────────────────────

  const boats = [...new Set(allResults.map((r) => r.boat))]

  function matrixTable(suite: 'full' | 'sparse') {
    const rows = templatesToRun.map((n) => {
      const cells = boats.map((b) => {
        const r = allResults.find((x) => x.suite === suite && x.template === n && x.boat === b)
        if (!r) return ' '
        return r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗'
      })
      return `| Template ${n} | ${cells.join(' | ')} |`
    })
    const header = `| Template | ${boats.join(' | ')} |`
    const sep = `|---|${boats.map(() => '---').join('|')}|`
    return [header, sep, ...rows].join('\n')
  }

  const issueLines = allResults
    .filter((r) => r.status !== 'pass')
    .map((r) =>
      r.error
        ? `- **[${r.suite}] T${r.template} × ${r.boat}** FAIL: ${r.error}`
        : r.warnings.map((w) => `- **[${r.suite}] T${r.template} × ${r.boat}** WARN: ${w}`).join('\n'),
    )
    .join('\n')

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const sections: Array<string> = [
    `# Template Test Results`,
    ``,
    `Generated: ${now}  `,
    `**${pass} pass · ${warn} warn · ${fail} fail** out of ${grandTotal} renders`,
    ``,
    `✓ pass · ⚠ warn (unresolved placeholder or small file) · ✗ fail (exception)`,
  ]

  if (runFull) {
    sections.push(``, `## Full suite (all fields + club logo)`, ``, matrixTable('full'))
  }

  if (runSparse) {
    sections.push(
      ``,
      `## Sparse suite (no optional fields — tests fallbacks)`,
      ``,
      `_Expected fallback text: race name → "Championship Race", coach → "Head Coach",_`,
      `_club name → "Rowing Club", crew category → "Open Club - Open Club", edition → "Late Edition"_`,
      ``,
      matrixTable('sparse'),
    )
  }

  sections.push(``, issueLines.length > 0 ? `## Issues\n\n${issueLines}` : `## Issues\n\nNone.`)

  await fs.writeFile(path.join(OUT_DIR, 'RESULTS.md'), sections.join('\n'))
  console.log(`Report:  ${path.join(OUT_DIR, 'RESULTS.md')}\n`)

  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
