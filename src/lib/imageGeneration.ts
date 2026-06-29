import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { TemplateCompiler } from './templateCompiler'
import { getBoatType } from './boat-types'

interface Crew {
  id: string
  name: string
  raceName?: string | null
  raceCategory?: string | null
  crewNames: Array<string>
  boatCode: string
  club?: { name: string; primaryColor: string; secondaryColor: string } | null
}

interface Template {
  id: string
  name: string
  templateType: string
  metadata?: any
}

interface GeneratedImage {
  imageUrl: string
  filename: string
  width: number
  height: number
}

async function launchBrowser() {
  const isVercel = process.env.VERCEL === '1'

  if (isVercel) {
    const chromium = await import('@sparticuz/chromium')
    const puppeteer = await import('puppeteer-core')
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  } else {
    const puppeteer = await import('puppeteer')
    return puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
}

async function htmlToBuffer(html: string, existingBrowser?: any): Promise<Buffer> {
  const browser = existingBrowser ?? (await launchBrowser())
  try {
    const page = await browser.newPage()
    try {
      await page.setViewport({ width: 1080, height: 1080 })
      await page.setContent(html, { waitUntil: 'networkidle0' })
      await new Promise((r) => setTimeout(r, 1000))
      const buffer = await page.screenshot({
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
      })
      return Buffer.from(buffer)
    } finally {
      await page.close()
    }
  } finally {
    if (!existingBrowser) await browser.close()
  }
}

export class ImageGenerationService {
  static async generateCoverImage(
    raceData: {
      raceName: string
      raceDate?: string
      club?: { name: string; primaryColor: string; secondaryColor: string; logoUrl?: string | null } | null
    },
    template: Template,
    colors?: { primaryColor: string; secondaryColor: string },
  ): Promise<GeneratedImage> {
    const filename = `${raceData.raceName.toLowerCase().replace(/\s+/g, '-')}-cover.png`

    const finalColors = colors || {
      primaryColor: raceData.club?.primaryColor || '#15803d',
      secondaryColor: raceData.club?.secondaryColor || '#f9a8d4',
    }

    let clubLogoDataUrl: string | undefined = undefined
    if (raceData.club?.logoUrl) {
      try {
        if (raceData.club.logoUrl.startsWith('data:')) {
          clubLogoDataUrl = raceData.club.logoUrl
        } else if (raceData.club.logoUrl.startsWith('http')) {
          const res = await fetch(raceData.club.logoUrl)
          const buf = await res.arrayBuffer()
          const ext = raceData.club.logoUrl.split('.').pop()?.toLowerCase() || 'png'
          const mime = ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
          clubLogoDataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
        } else {
          const logoPath = path.join(process.cwd(), 'public', raceData.club.logoUrl)
          const logoBuffer = await fs.readFile(logoPath)
          const ext = path.extname(raceData.club.logoUrl).toLowerCase()
          const mime = ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
          clubLogoDataUrl = `data:${mime};base64,${logoBuffer.toString('base64')}`
        }
      } catch (logoError) {
        console.error('Failed to load club logo:', logoError)
      }
    }

    const coverData: any = {
      RACE_NAME: raceData.raceName || 'Championship Race',
      RACE_DATE: raceData.raceDate || undefined,
      CLUB_NAME: raceData.club?.name || 'Rowing Club',
      clubLogo: clubLogoDataUrl,
    }

    const htmlContent = await this.loadCoverTemplate(template, coverData, finalColors)
    const imgBuffer = await htmlToBuffer(htmlContent)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const base64 = `data:image/png;base64,${imgBuffer.toString('base64')}`
      return { imageUrl: base64, filename, width: 1080, height: 1080 }
    }

    const blob = await put(`covers/${filename}`, imgBuffer, { access: 'public', contentType: 'image/png' })
    return { imageUrl: blob.url, filename, width: 1080, height: 1080 }
  }

  static async generateCrewImage(
    crew: Crew,
    template: Template,
    colors?: { primaryColor: string; secondaryColor: string },
    browser?: any,
    batchInfo?: { sheetNumber: number; totalSheets: number },
  ): Promise<GeneratedImage> {
    const filename = `${crew.name.toLowerCase().replace(/\s+/g, '-')}-${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`

    const finalColors = colors || {
      primaryColor: crew.club?.primaryColor || '#15803d',
      secondaryColor: crew.club?.secondaryColor || '#f9a8d4',
    }

    const htmlContent = await this.loadTemplate(template, crew, finalColors, batchInfo)
    const imgBuffer = await htmlToBuffer(htmlContent, browser)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const base64 = `data:image/png;base64,${imgBuffer.toString('base64')}`
      return { imageUrl: base64, filename, width: 1080, height: 1080 }
    }

    const blob = await put(`crew-images/${filename}`, imgBuffer, { access: 'public', contentType: 'image/png' })
    return { imageUrl: blob.url, filename, width: 1080, height: 1080 }
  }

  static async launchBrowser() {
    return launchBrowser()
  }

  private static async loadTemplate(
    template: Template,
    crew: Crew,
    colors: { primaryColor: string; secondaryColor: string },
    batchInfo?: { sheetNumber: number; totalSheets: number },
  ): Promise<string> {
    let htmlPath: string
    let cssPath: string
    let templateName: string

    if (template.metadata?.htmlFile && template.metadata?.cssFile) {
      htmlPath = path.join(process.cwd(), 'public', template.metadata.htmlFile)
      cssPath = path.join(process.cwd(), 'public', template.metadata.cssFile)
      templateName = path.basename(path.dirname(template.metadata.htmlFile))
    } else {
      const templateMap: Record<string, string> = {
        'Diagonal Professional': 'templates/template1',
        'Corner Brackets Modern': 'templates/template2',
      }
      // Auto-resolve "Template N" names to their directory
      const numberedMatch = template.name.match(/^Template (\d+)$/)
      if (numberedMatch) {
        templateMap[template.name] = `templates/template${numberedMatch[1]}`
      }
      const templateDir = templateMap[template.name] || 'templates/template1'
      templateName = path.basename(templateDir)
      htmlPath = path.join(process.cwd(), 'public', templateDir, `${templateName}.html`)
      cssPath = path.join(process.cwd(), 'public', templateDir, `${templateName}.css`)
    }

    let htmlContent = await fs.readFile(htmlPath, 'utf-8')
    const cssContent = await fs.readFile(cssPath, 'utf-8')
    htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`)
    htmlContent = htmlContent.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '')

    if (htmlContent.includes('{{')) {
      const templateData = await TemplateCompiler.formatCrewData(crew, template)
      if (batchInfo) {
        templateData.SHEET_NUMBER = batchInfo.sheetNumber
        templateData.TOTAL_SHEETS = batchInfo.totalSheets
      }
      const templateMetadata = template.metadata ? template.metadata : undefined
      htmlContent = TemplateCompiler.compileTemplate(htmlContent, templateData, colors, templateMetadata)
    } else {
      htmlContent = this.applyColorsToTemplate(htmlContent, cssContent, templateName, colors)
      htmlContent = this.applyCrewDataToTemplate(htmlContent, crew)
    }

    return htmlContent
  }

  private static applyColorsToTemplate(
    html: string,
    css: string,
    templateName: string,
    colors: { primaryColor: string; secondaryColor: string },
  ): string {
    let modifiedCss = css
    if (templateName === 'template1') {
      modifiedCss = modifiedCss.replace(/\.pink\s*{[^}]*}/g, `.pink { background-color: ${colors.primaryColor}; }`)
      modifiedCss = modifiedCss.replace(/\.green\s*{[^}]*}/g, `.green { background-color: ${colors.secondaryColor}; }`)
    } else if (templateName === 'template2') {
      html = html.replace(/fill="#f9a8d4"/g, `fill="${colors.secondaryColor}"`)
      html = html.replace(/fill="#15803d"/g, `fill="${colors.primaryColor}"`)
    }
    html = html.replace('</head>', `<style>${modifiedCss}</style></head>`)
    html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '')
    return html
  }

  private static applyCrewDataToTemplate(html: string, crew: Crew): string {
    return html.replace('<!-- Content will be dynamically inserted here -->', this.generateCrewContentHtml(crew))
  }

  private static generateCrewContentHtml(crew: Crew): string {
    const crewNames = crew.crewNames
    const clubName = crew.club?.name || 'Rowing Club'
    const crewName = crew.name || 'Crew'
    const boatType = getBoatType(crew.boatCode)?.name || 'Eight'
    const raceName = crew.raceName || 'Championship Race'
    const raceCategory = crew.raceCategory || null

    return `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:black;font-family:'Arial',sans-serif;width:80%;z-index:10;">
        <h1 style="font-size:36px;margin:0 0 20px 0;font-weight:bold;">${clubName}</h1>
        <h2 style="font-size:28px;margin:0 0 15px 0;font-weight:600;">${crewName}</h2>
        <h3 style="font-size:22px;margin:0 0 25px 0;font-weight:500;">${boatType} • ${raceName}${raceCategory ? ` • ${raceCategory}` : ''}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;max-width:600px;margin:0 auto;">
          ${crewNames.map((name: string, index: number) => {
            const pos = index === 0 ? 'Bow' : index === crewNames.length - 1 ? 'Stroke' : `Seat ${index + 1}`
            return `<div style="background:rgba(255,255,255,0.9);padding:8px;border-radius:8px;border:2px solid rgba(0,0,0,0.1);box-shadow:0 2px 4px rgba(0,0,0,0.1);"><div style="font-size:12px;font-weight:bold;margin-bottom:4px;">${pos}</div><div style="font-size:14px;font-weight:500;">${name.replace(/^cox:\s*/i, '')}</div></div>`
          }).join('')}
        </div>
      </div>`
  }

  private static async loadCoverTemplate(
    template: Template,
    coverData: any,
    colors: { primaryColor: string; secondaryColor: string },
  ): Promise<string> {
    const candidates =
      template.metadata?.cssFile?.includes('template2') ||
      template.metadata?.htmlFile?.includes('template2') ||
      template.name.toLowerCase().includes('corner brackets')
        ? ['templates/template2/cover/cover']
        : ['templates/template1/cover/cover']

    for (const base of candidates) {
      try {
        const htmlPath = path.join(process.cwd(), 'public', `${base}.html`)
        const cssPath = path.join(process.cwd(), 'public', `${base}.css`)
        let htmlContent = await fs.readFile(htmlPath, 'utf-8')
        const cssContent = await fs.readFile(cssPath, 'utf-8')
        htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style></head>`)
        htmlContent = htmlContent.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '')
        return TemplateCompiler.compileTemplate(htmlContent, coverData, colors, template.metadata)
      } catch {
        // file doesn't exist — fall through to fallback
      }
    }

    // Fallback: simple cover page using club colors
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1080px; height:1080px; overflow:hidden; }
body { background:${colors.primaryColor}; font-family:Inter,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; }
h1 { color:#fff; font-size:72px; font-weight:900; text-align:center; letter-spacing:-2px; padding:0 80px; line-height:1; }
p { color:${colors.secondaryColor}; font-size:28px; font-weight:700; margin-top:24px; letter-spacing:4px; text-transform:uppercase; }
</style></head><body>
<h1>${coverData.RACE_NAME || 'Race Day'}</h1>
<p>${coverData.CLUB_NAME || 'Rowing Club'}</p>
</body></html>`
  }

  static validateGenerationInput(crew: Crew, _template: Template): { valid: boolean; error?: string } {
    if (crew.crewNames.length === 0) return { valid: false, error: 'Crew must have at least one rower' }
    if (crew.crewNames.some((name) => !name.trim())) return { valid: false, error: 'All rowers must have names' }
    if (!crew.name.trim()) return { valid: false, error: 'Crew must have a name' }
    return { valid: true }
  }
}
