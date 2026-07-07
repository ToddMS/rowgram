import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getBoatType } from './boat-types'

export interface TemplateData {
  CLUB_NAME: string
  CREW_NAME: string
  BOAT_TYPE: string
  BOAT_CODE: string
  SEATS: number
  RACE_NAME: string
  RACE_CATEGORY?: string
  RACE_DATE?: string
  EDITION_TEXT?: string
  SHEET_NUMBER?: number
  TOTAL_SHEETS?: number
  BOAT_NAME: string
  COACH_NAME: string
  CREW_MEMBERS: Array<{
    POSITION: string
    NAME: string
  }>
  BOAT_IMAGE_URL?: string
  BOAT_IMAGE_AVAILABLE: boolean
  // Legacy lowercase fields used by some templates
  raceName?: string
  crewCategory?: string
  crewMembers?: Array<{ name: string; badge: string; style: string }>
  crewMembersNoCox?: Array<{ name: string; badge: string; style: string }>
  COX_NAME?: string
  hasCox?: boolean
  clubLogo?: string | null
  clubName?: string
  boatImage?: string
  positions?: Array<any>
}

export interface ColorScheme {
  primaryColor: string
  secondaryColor: string
}

export interface PresetColorScheme extends ColorScheme {
  name: string
  description: string
}

export interface TemplateBoatImageConfig {
  enabled: boolean
  position: 'center' | 'left' | 'right' | 'background' | 'top' | 'bottom'
  size: 'small' | 'medium' | 'large'
  opacity?: number
  className?: string
  style?: Record<string, string>
}

export interface TemplateMetadata {
  boatImage?: TemplateBoatImageConfig
  dimensions?: { width: number; height: number }
  [key: string]: any
}

export class TemplateCompiler {
  /**
   * Available boat images - maps boat codes to clean filenames
   */
  private static readonly BOAT_IMAGE_MAP: Record<string, string> = {
    '1x': '1x.svg', // Single scull
    '2-': '2-.svg', // Coxless pair (sweep)
    '2x': '2x.svg', // Double sculls
    '4-': '4-.svg', // Coxless four (sweep) - same hull as 4+
    '4+': '4-.svg', // Coxed four (sweep) - same hull as 4-, coxswain position differs
    '4x': '4x.svg', // Quad sculls
    '8+': '8+.svg', // Eight
  }

  /**
   * Check if boat image exists for the given boat code
   */
  static getBoatImageInfo(boatCode: string): {
    available: boolean
    url?: string
  } {
    try {
      const filename = this.BOAT_IMAGE_MAP[boatCode]
      const available = !!filename

      if (available) {
        // Convert to absolute file path for puppeteer
        const imagePath = path.join(
          process.cwd(),
          'public',
          'boat-images',
          filename,
        )

        if (existsSync(imagePath)) {
          // Convert to base64 data URL for reliable loading in puppeteer
          const imageBuffer = readFileSync(imagePath)
          const base64 = imageBuffer.toString('base64')
          // Detect file extension for proper MIME type
          const extension = filename.split('.').pop()?.toLowerCase()
          const mimeType = extension === 'svg' ? 'image/svg+xml' : 'image/png'
          const dataUrl = `data:${mimeType};base64,${base64}`
          return { available: true, url: dataUrl }
        }
      }
    } catch (error) {
      console.error('Error loading boat image:', error)
    }

    return {
      available: false,
      url: undefined,
    }
  }

  /**
   * Process club logo URL for reliable loading in Puppeteer.
   * Always converts to a base64 data URL so Puppeteer doesn't need network access.
   */
  static async getClubLogoInfo(logoUrl: string | null | undefined): Promise<{
    available: boolean
    url?: string
  }> {
    try {
      if (!logoUrl) {
        return { available: false, url: undefined }
      }

      // Already a data URL — use directly, no re-encoding needed
      if (logoUrl.startsWith('data:')) {
        console.log('🖼️ LOGO: already a data URL, length:', logoUrl.length, 'type:', logoUrl.substring(5, logoUrl.indexOf(';')))
        return { available: true, url: logoUrl }
      }

      if (logoUrl.startsWith('/uploads/')) {
        const imagePath = path.join(process.cwd(), 'public', logoUrl)
        if (existsSync(imagePath)) {
          const base64 = readFileSync(imagePath).toString('base64')
          const ext = logoUrl.split('.').pop()?.toLowerCase()
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
            : ext === 'webp' ? 'image/webp'
            : 'image/png'
          return { available: true, url: `data:${mimeType};base64,${base64}` }
        }
        console.log('🖼️ LOGO: local file not found:', imagePath)
      } else {
        // External URL (e.g. Vercel Blob) — fetch and convert to base64
        const response = await fetch(logoUrl)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          const base64 = buffer.toString('base64')
          const mimeType = (response.headers.get('content-type') ?? 'image/png').split(';')[0].trim()
          return { available: true, url: `data:${mimeType};base64,${base64}` }
        }
        console.error('🖼️ LOGO: fetch failed:', logoUrl, response.status)
      }
    } catch (error) {
      console.error('🖼️ LOGO: exception:', error)
    }

    return { available: false, url: undefined }
  }

  /**
   * Compile a template with crew data and color scheme
   */
  static compileTemplate(
    templateHtml: string,
    data: TemplateData,
    colors: ColorScheme,
    templateMetadata?: TemplateMetadata,
  ): string {
    console.log('🎯 DEBUG: TemplateCompiler.compileTemplate called')
    console.log('  - Has CREW_MEMBERS:', !!data.CREW_MEMBERS, 'Count:', data.CREW_MEMBERS?.length)
    console.log('  - CREW_MEMBERS data:', JSON.stringify(data.CREW_MEMBERS, null, 2))
    let compiledHtml = templateHtml

    // Replace single variables (both uppercase and lowercase versions)
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'CREW_MEMBERS' && key !== 'crewMembers' && key !== 'crewMembersNoCox' && key !== 'hasCox') {
        // Skip null/undefined — let processConditionalBlock clean up the block
        if (value === null || value === undefined) return

        const str = String(value)

        // Handle uppercase keys (e.g., RACE_NAME)
        const placeholder = `{{${key}}}`
        compiledHtml = compiledHtml.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          str,
        )

        // Handle lowercase keys (e.g., raceName)
        const lowerKey = key.charAt(0).toLowerCase() + key.slice(1)
        const lowerPlaceholder = `{{${lowerKey}}}`
        compiledHtml = compiledHtml.replace(
          new RegExp(lowerPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          str,
        )
      }
    })

    // Handle crew members — uppercase format ({{#CREW_MEMBERS}}, used by template2)
    if (data.CREW_MEMBERS?.length > 0) {
      compiledHtml = this.compileCrewMembers(compiledHtml, data.CREW_MEMBERS)
    }

    // Handle crew members — lowercase format ({{#crewMembers}}, used by template1)
    if ((data.crewMembers?.length ?? 0) > 0) {
      compiledHtml = this.compileCrewMembersNew(compiledHtml, data.crewMembers!)
    }

    // Handle rowers-only crew list ({{#crewMembersNoCox}}, used by template12)
    if ((data.crewMembersNoCox?.length ?? 0) > 0) {
      compiledHtml = this.compileCrewMembersNew(compiledHtml, data.crewMembersNoCox!, 'crewMembersNoCox')
    }
    // Handle boat image with template-specific positioning
    compiledHtml = this.applyBoatImage(
      compiledHtml,
      data,
      templateMetadata?.boatImage,
    )

    // Handle club logo conditional
    const hasClubLogo = !!(data as any).clubLogo
    compiledHtml = this.processConditionalBlock(
      compiledHtml,
      'clubLogo',
      hasClubLogo,
    )

    // Debug: Check if the club logo section is actually included
    if (hasClubLogo) {
      const hasLogoSection = compiledHtml.includes('class="club-logo"')
      console.log('🎯 DEBUG: Club logo section included in HTML:', hasLogoSection)
      if (hasLogoSection) {
        const logoIdx = compiledHtml.indexOf('class="club-logo"')
        const snippet = compiledHtml.substring(Math.max(0, logoIdx - 20), logoIdx + 120)
        console.log('🎯 DEBUG: Club logo img tag snippet:', snippet)
      } else {
        console.log('🎯 DEBUG: clubLogo data value (first 60 chars):', String(data.clubLogo).substring(0, 60))
      }
    }

    // Handle race category conditional
    const hasRaceCategory = !!(data as any).RACE_CATEGORY
    compiledHtml = this.processConditionalBlock(
      compiledHtml,
      'RACE_CATEGORY',
      hasRaceCategory,
    )

    // Handle race date conditional
    const hasRaceDate = !!(data as any).RACE_DATE
    compiledHtml = this.processConditionalBlock(
      compiledHtml,
      'RACE_DATE',
      hasRaceDate,
    )

    // Handle cox conditional (used by template12 to show cox in footer)
    compiledHtml = this.processConditionalBlock(
      compiledHtml,
      'hasCox',
      !!data.hasCox,
    )

    // Apply color scheme
    compiledHtml = this.applyColorScheme(compiledHtml, colors)

    return compiledHtml
  }

  /**
   * Compile the crew members section
   */
  private static compileCrewMembers(
    html: string,
    crewMembers: Array<{ POSITION: string; NAME: string }>,
  ): string {
    // Find the crew member template block
    const templateStart = html.indexOf('{{#CREW_MEMBERS}}')
    const templateEnd =
      html.indexOf('{{/CREW_MEMBERS}}') + '{{/CREW_MEMBERS}}'.length

    if (templateStart === -1 || templateEnd === -1) {
      return html
    }

    // Extract the template
    const template = html.substring(
      templateStart + '{{#CREW_MEMBERS}}'.length,
      templateEnd - '{{/CREW_MEMBERS}}'.length,
    )

    // Generate HTML for each crew member
    const crewMemberHtml = crewMembers
      .map((member) => {
        let memberHtml = template
        memberHtml = memberHtml.replace(/\{\{POSITION\}\}/g, member.POSITION)
        memberHtml = memberHtml.replace(/\{\{NAME\}\}/g, this.formatName(member.NAME))

        // Special styling for Coxswain
        if (member.POSITION.toLowerCase().includes('cox')) {
          memberHtml = memberHtml.replace(
            'background: #f9fafb;',
            'background: linear-gradient(135deg, #fdf2f8, #fce7f3);',
          )
          memberHtml = memberHtml.replace(
            'border: 1px solid #e5e7eb;',
            'border: 2px solid #f472b6;',
          )
        }

        return memberHtml
      })
      .join('')

    // Replace the template block with compiled HTML
    return (
      html.substring(0, templateStart) +
      crewMemberHtml +
      html.substring(templateEnd)
    )
  }

  /**
   * Compile the crew members section (new lowercase format)
   */
  private static compileCrewMembersNew(
    html: string,
    crewMembers: Array<{ name: string; badge: string; style: string; seatLabel?: string; [key: string]: any }>,
    blockName: string = 'crewMembers',
  ): string {
    // Find the crew member template block
    const templateStart = html.indexOf(`{{#${blockName}}}`)
    const templateEnd =
      html.indexOf(`{{/${blockName}}}`) + `{{/${blockName}}}`.length

    if (templateStart === -1 || templateEnd === -1) {
      return html
    }

    // Extract the template
    const startTag = `{{#${blockName}}}`
    const endTag = `{{/${blockName}}}`
    const template = html.substring(
      templateStart + startTag.length,
      templateEnd - endTag.length,
    )

    // Generate HTML for each crew member
    const crewMemberHtml = crewMembers
      .map((member) => {
        let memberHtml = template
        memberHtml = memberHtml.replace(/\{\{name\}\}/g, this.formatName(member.name))
        memberHtml = memberHtml.replace(/\{\{badge\}\}/g, member.badge)
        memberHtml = memberHtml.replace(
          /\{\{positionStyle\}\}/g,
          member.style ? `style="${member.style}"` : '',
        )
        memberHtml = memberHtml.replace(/\{\{style\}\}/g, member.style)
        if (member.seatLabel) {
          memberHtml = memberHtml.replace(/\{\{seatLabel\}\}/g, member.seatLabel)
        }
        return memberHtml
      })
      .join('')

    // Replace the template block with compiled HTML
    return (
      html.substring(0, templateStart) +
      crewMemberHtml +
      html.substring(templateEnd)
    )
  }

  /**
   * Apply color scheme to the template
   */
  /**
   * Returns '#ffffff' or '#1a1a17' — whichever has better contrast against the given hex color.
   * Uses WCAG relative luminance formula.
   */
  static getContrastColor(hex: string): string {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.slice(0, 2), 16) / 255
    const g = parseInt(clean.slice(2, 4), 16) / 255
    const b = parseInt(clean.slice(4, 6), 16) / 255
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    const luminance =
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    return luminance > 0.179 ? '#1a1a17' : '#ffffff'
  }

  private static applyColorScheme(html: string, colors: ColorScheme): string {
    let styledHtml = html

    // Apply comprehensive color mappings for all templates
    styledHtml = this.applyGradientColors(styledHtml, colors)
    styledHtml = this.applySolidColors(styledHtml, colors)
    styledHtml = this.applyBorderColors(styledHtml, colors)
    styledHtml = this.applySpecialColors(styledHtml, colors)

    // Inject --on-primary / --on-secondary CSS variables so any template can use them
    const onPrimary = this.getContrastColor(colors.primaryColor)
    const onSecondary = this.getContrastColor(colors.secondaryColor)
    const onPrimaryInvert = onPrimary === '#ffffff' ? 1 : 0
    const onSecondaryInvert = onSecondary === '#ffffff' ? 1 : 0
    const onSecondaryUltra = TemplateCompiler.isUltraDark(colors.secondaryColor) ? 1 : 0
    const onPrimaryUltra = TemplateCompiler.isUltraDark(colors.primaryColor) ? 1 : 0
    const cssVars = `<style>:root{--on-primary:${onPrimary};--on-secondary:${onSecondary};--on-primary-invert:${onPrimaryInvert};--on-secondary-invert:${onSecondaryInvert};--on-secondary-ultra:${onSecondaryUltra};--on-primary-ultra:${onPrimaryUltra};}</style>`
    styledHtml = styledHtml.includes('</head>')
      ? styledHtml.replace('</head>', `${cssVars}</head>`)
      : cssVars + styledHtml

    return styledHtml
  }

  /**
   * Apply gradient color replacements
   */
  private static applyGradientColors(
    html: string,
    colors: ColorScheme,
  ): string {
    const gradientMappings = [
      // Header gradients
      {
        from: 'background: linear-gradient(135deg, #059669 0%, #10b981 50%, #d946ef 100%);',
        to: `background: linear-gradient(135deg, ${colors.primaryColor} 0%, ${colors.secondaryColor} 50%, ${colors.primaryColor} 100%);`,
      },
      // Footer gradients
      {
        from: 'background: linear-gradient(90deg, #059669 0%, #10b981 50%, #d946ef 100%);',
        to: `background: linear-gradient(90deg, ${colors.primaryColor} 0%, ${colors.secondaryColor} 50%, ${colors.primaryColor} 100%);`,
      },
      // Boat silhouette gradients
      {
        from: 'background: linear-gradient(90deg, #059669, #10b981);',
        to: `background: linear-gradient(90deg, ${colors.primaryColor}, ${colors.secondaryColor});`,
      },
      // Position badge gradients
      {
        from: 'background: linear-gradient(90deg, #059669, #d946ef);',
        to: `background: linear-gradient(90deg, ${colors.primaryColor}, ${colors.secondaryColor});`,
      },
      {
        from: 'background: linear-gradient(90deg, #059669, #10b981);',
        to: `background: linear-gradient(90deg, ${colors.primaryColor}, ${colors.secondaryColor});`,
      },
    ]

    let styledHtml = html
    gradientMappings.forEach((mapping) => {
      styledHtml = styledHtml.replace(
        new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        mapping.to,
      )
    })

    return styledHtml
  }

  /**
   * Apply solid color replacements
   */
  private static applySolidColors(html: string, colors: ColorScheme): string {
    const solidColorMappings = [
      // Primary color mappings
      { from: '#059669', to: colors.primaryColor },
      { from: '#15803d', to: colors.primaryColor },
      { from: '#094e2a', to: colors.primaryColor }, // Text colors
      { from: '#080a54', to: colors.primaryColor }, // Cover template text color
      { from: '#10b981', to: colors.secondaryColor },
      // Secondary color mappings
      { from: '#f9a8d4', to: colors.secondaryColor },
      { from: '#f3bfd4', to: colors.secondaryColor }, // Header text color
      { from: '#d946ef', to: colors.secondaryColor },
    ]

    let styledHtml = html
    solidColorMappings.forEach((mapping) => {
      styledHtml = styledHtml.replace(new RegExp(mapping.from, 'g'), mapping.to)
    })

    return styledHtml
  }

  /**
   * Apply border color replacements
   */
  private static applyBorderColors(html: string, colors: ColorScheme): string {
    const borderMappings = [
      {
        from: 'border-left: 8px solid #059669;',
        to: `border-left: 8px solid ${colors.primaryColor};`,
      },
      {
        from: 'border: 2px solid #f472b6;',
        to: `border: 2px solid ${colors.secondaryColor};`,
      },
    ]

    let styledHtml = html
    borderMappings.forEach((mapping) => {
      styledHtml = styledHtml.replace(
        new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        mapping.to,
      )
    })

    return styledHtml
  }

  /**
   * Apply special color effects and CSS customizations
   */
  private static applySpecialColors(html: string, colors: ColorScheme): string {
    let styledHtml = html

    // Apply SVG fill colors for Template 1 (diagonal split layout)
    // Background should be secondary color, diagonal sections should be primary color
    styledHtml = styledHtml.replace(
      /fill="#f3bfd4"/g,
      `fill="${colors.secondaryColor}"`,
    )
    styledHtml = styledHtml.replace(
      /fill="#15803d"/g,
      `fill="${colors.primaryColor}"`,
    )

    // Apply crew member hover effects with custom colors
    const hoverEffect = `
      .crew-member:hover {
        box-shadow: 0 8px 25px ${colors.primaryColor}33;
        border-left: 4px solid ${colors.primaryColor};
      }
    `

    // Insert hover effects before closing style tag
    if (styledHtml.includes('</style>')) {
      styledHtml = styledHtml.replace('</style>', `${hoverEffect}</style>`)
    }

    return styledHtml
  }

  /**
   * Apply boat image to template based on availability and positioning
   */
  private static applyBoatImage(
    html: string,
    data: TemplateData,
    boatImageConfig?: TemplateBoatImageConfig,
  ): string {
    let styledHtml = html

    // Check if boat images are disabled in template config
    if (boatImageConfig && !boatImageConfig.enabled) {
      styledHtml = styledHtml.replace(/\{\{BOAT_IMAGE\}\}/g, '')
      styledHtml = this.removeConditionalBlock(
        styledHtml,
        'BOAT_IMAGE_AVAILABLE',
      )
      return styledHtml
    }

    // Generate boat image HTML with template-specific styling
    const boatImageHtml = this.generateBoatImageHtml(data, boatImageConfig)

    // Replace {{BOAT_IMAGE}} placeholder
    styledHtml = styledHtml.replace(/\{\{BOAT_IMAGE\}\}/g, boatImageHtml)

    // Handle {{#BOAT_IMAGE_AVAILABLE}} conditional blocks
    styledHtml = this.processConditionalBlock(
      styledHtml,
      'BOAT_IMAGE_AVAILABLE',
      data.BOAT_IMAGE_AVAILABLE,
    )

    // Add boat image specific CSS if configured
    if (boatImageConfig && data.BOAT_IMAGE_AVAILABLE) {
      styledHtml = this.addBoatImageCSS(styledHtml, boatImageConfig)
    }

    return styledHtml
  }

  /**
   * Generate boat image HTML based on data and configuration
   */
  private static generateBoatImageHtml(
    data: TemplateData,
    config?: TemplateBoatImageConfig,
  ): string {
    if (!data.BOAT_IMAGE_AVAILABLE || !data.BOAT_IMAGE_URL) {
      return `<div class="boat-image-placeholder">Boat image for ${data.BOAT_CODE} coming soon...</div>`
    }

    const className = config?.className || 'boat-image'
    const sizeClass = config?.size
      ? `boat-image-${config.size}`
      : 'boat-image-medium'
    const positionClass = config?.position
      ? `boat-image-${config.position}`
      : 'boat-image-center'

    let style = ''
    // Force full opacity for better visibility
    style += 'opacity: 1.0; z-index: 25;'

    if (config?.style) {
      style += Object.entries(config.style)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ')
    }

    return `<img src="${data.BOAT_IMAGE_URL}" alt="${data.BOAT_TYPE} boat" class="${className} ${sizeClass} ${positionClass}" style="${style}" />`
  }

  /**
   * Process conditional template blocks
   */
  private static processConditionalBlock(
    html: string,
    blockName: string,
    condition: boolean,
  ): string {
    const startTag = `{{#${blockName}}}`
    const endTag = `{{/${blockName}}}`

    let result = html
    let startIndex = result.indexOf(startTag)

    while (startIndex !== -1) {
      const endIndex = result.indexOf(endTag, startIndex)
      if (endIndex === -1) break

      const beforeBlock = result.substring(0, startIndex)
      const blockContent = result.substring(startIndex + startTag.length, endIndex)
      const afterBlock = result.substring(endIndex + endTag.length)

      result = beforeBlock + (condition ? blockContent : '') + afterBlock
      startIndex = result.indexOf(startTag)
    }

    return result
  }

  /**
   * Remove conditional template blocks entirely
   */
  private static removeConditionalBlock(
    html: string,
    blockName: string,
  ): string {
    const startTag = `{{#${blockName}}}`
    const endTag = `{{/${blockName}}}`
    const startIndex = html.indexOf(startTag)
    const endIndex = html.indexOf(endTag)

    if (startIndex !== -1 && endIndex !== -1) {
      const beforeBlock = html.substring(0, startIndex)
      const afterBlock = html.substring(endIndex + endTag.length)
      return beforeBlock + afterBlock
    }

    return html
  }

  /**
   * Add boat image specific CSS based on configuration
   */
  private static addBoatImageCSS(
    html: string,
    config: TemplateBoatImageConfig,
  ): string {
    const boatImageCSS = `
      .boat-image {
        max-width: 100%;
        height: auto;
        display: block;
      }

      .boat-image-small { max-width: 150px; }
      .boat-image-medium { max-width: 300px; }
      .boat-image-large { max-width: 500px; }

      .boat-image-center { margin: 0 auto; }
      .boat-image-left { margin-right: auto; }
      .boat-image-right { margin-left: auto; }
      .boat-image-background {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: -1;
      }
      .boat-image-top { margin-bottom: auto; }
      .boat-image-bottom { margin-top: auto; }

      .boat-image-placeholder {
        padding: 20px;
        text-align: center;
        color: #6b7280;
        font-style: italic;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        background: #f9fafb;
      }
    `

    if (html.includes('</style>')) {
      return html.replace('</style>', `${boatImageCSS}</style>`)
    } else if (html.includes('</head>')) {
      return html.replace('</head>', `<style>${boatImageCSS}</style></head>`)
    }

    return html
  }

  /**
   * Convert crew data from database format to template format
   */
  static async formatCrewData(crew: any, template: any): Promise<TemplateData> {
    const crewMembers: Array<{ POSITION: string; NAME: string }> = []

    // Add regular crew members
    if (crew.crewNames && Array.isArray(crew.crewNames)) {
      const boatSeats = getBoatType(crew.boatCode)?.seats ?? 8
      const hasCox = getBoatType(crew.boatCode)?.hasCox ?? false
      // seats in boat-types already excludes the cox, so maxRowerSeat == boatSeats
      const maxRowerSeat = boatSeats

      console.log(`🎯 DEBUG: boatSeats=${boatSeats}, hasCox=${hasCox}, maxRowerSeat=${maxRowerSeat}`)

      crew.crewNames.forEach((name: string, index: number) => {
        if (name.toLowerCase().startsWith('cox:')) {
          // Handle coxswain with "cox:" prefix
          crewMembers.push({
            POSITION: 'Coxswain',
            NAME: this.formatName(name.replace(/^cox:\s*/i, '').trim()),
          })
        } else if (hasCox && index === 0) {
          // First crew member in coxed boats is the coxswain
          crewMembers.push({
            POSITION: 'Coxswain',
            NAME: this.formatName(name.trim()),
          })
        } else {
          // Handle rowers in reverse order (cox -> stroke -> ... -> bow)
          // For 8+: Tim(idx 1)=Stroke(8), Todd(idx 2)=7, ..., Alex(idx 8)=Bow(1)
          // For 1x: Todd(idx 0)=Stroke(1)
          const seatNumber = hasCox ? maxRowerSeat - (index - 1) : maxRowerSeat - index

          // Only create rower positions for valid seat numbers (1 to maxRowerSeat)
          if (seatNumber >= 1 && seatNumber <= maxRowerSeat) {
            const position = this.getPositionLabel(seatNumber, maxRowerSeat)

            crewMembers.push({
              POSITION: position,
              NAME: this.formatName(name.trim()),
            })
          }
        }
      })
    }

    // Get boat image information
    const boatCode = crew.boatCode || '8+'
    const boatImageInfo = this.getBoatImageInfo(boatCode)

    // Get club logo information
    console.log('🎯 DEBUG: crew.clubId:', crew.clubId)
    console.log('🎯 DEBUG: crew.clubName:', crew.clubName)
    console.log('🎯 DEBUG: crew.club:', JSON.stringify(crew.club, null, 2))
    const clubLogoInfo = await this.getClubLogoInfo(crew.club?.logoUrl)

    // Enhanced data for Template 4 (Professional Layout)
    const crewMembersWithPositions = this.generateCrewPositions(crewMembers, boatCode)
    const crewCategory = this.generateCrewCategory(crew, template)

    // Separate cox from rowers for templates that show them differently (e.g. template12)
    const coxPosition = crewMembersWithPositions.find(m => m.badge === 'C')
    const crewMembersNoCox = crewMembersWithPositions.filter(m => m.badge !== 'C')

    // For Template 2: Put crew in Bow to Stroke order with Cox at end
    const rowers = crewMembers.filter(m => m.POSITION !== 'Coxswain')
    const coxswain = crewMembers.find(m => m.POSITION === 'Coxswain')
    const reversedCrewOrder = [...rowers].reverse() // Bow to Stroke order
    if (coxswain) {
      reversedCrewOrder.push(coxswain) // Add cox at the end
    }

    // Create abbreviated version for Template 2
    const abbreviatedCrewOrder = reversedCrewOrder.map(member => ({
      ...member,
      POSITION: this.getAbbreviatedPosition(member.POSITION)
    }))

    const isTemplate2 = this.isTemplate2(template)
    console.log('🔍 DEBUG Template Compiler:')
    console.log('  - Template ID:', template?.id)
    console.log('  - Template Name:', template?.name)
    console.log('  - Template CSS File:', template?.metadata?.cssFile)
    console.log('  - Is Template 2?', isTemplate2)
    console.log('  - Original positions:', reversedCrewOrder.map(m => m.POSITION))
    console.log('  - Abbreviated positions:', abbreviatedCrewOrder.map(m => m.POSITION))

    return {
      CLUB_NAME: crew.club?.name || crew.clubName || 'Rowing Club',
      CREW_NAME: crew.name || 'Crew',
      BOAT_TYPE: getBoatType(crew.boatCode)?.name || 'Eight',
      BOAT_CODE: boatCode,
      SEATS:
        getBoatType(crew.boatCode)?.seats ||
        crewMembers.filter((m) => m.POSITION !== 'Coxswain').length ||
        8,
      RACE_NAME: crew.raceName || 'Championship Race',
      RACE_CATEGORY: crew.raceCategory || undefined,
      RACE_DATE: crew.raceDate ? TemplateCompiler.formatRaceDate(crew.raceDate) : undefined,
      EDITION_TEXT: crew.raceDate ? TemplateCompiler.formatRaceDate(crew.raceDate) : 'Late Edition',
      SHEET_NUMBER: 1,
      TOTAL_SHEETS: 1,
      BOAT_NAME: crew.boatName || `${getBoatType(crew.boatCode)?.name || 'Eight'} Shell`,
      COACH_NAME: this.formatName(crew.coachName || crew.coach?.name || 'Head Coach'),
      CREW_MEMBERS: this.isTemplate2(template)
        ? abbreviatedCrewOrder
        : reversedCrewOrder,
      BOAT_IMAGE_URL: boatImageInfo.url,
      BOAT_IMAGE_AVAILABLE: boatImageInfo.available,
      raceName: crew.raceName || 'Championship Regatta 2025',
      crewCategory: crewCategory,
      crewMembers: crewMembersWithPositions,
      crewMembersNoCox,
      COX_NAME: coxPosition?.name,
      hasCox: !!coxPosition,
      clubLogo: clubLogoInfo.url || null,
      clubName: crew.club?.name || crew.clubName || 'Rowing Club',
      boatImage: boatImageInfo.url,
      positions: this.generateOarPositions(boatCode),
    }
  }

  static isUltraDark(hex: string): boolean {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.slice(0, 2), 16) / 255
    const g = parseInt(clean.slice(2, 4), 16) / 255
    const b = parseInt(clean.slice(4, 6), 16) / 255
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    return luminance < 0.02
  }

  static formatRaceDate(raw: string): string {
    // Handles "2025-06-15T09:30" (datetime-local) and "2025-06-15" (legacy date-only)
    const dt = new Date(raw)
    if (isNaN(dt.getTime())) return raw
    const hasTime = raw.includes('T') && !raw.endsWith('T00:00')
    const datePart = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    if (!hasTime) return datePart
    const timePart = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${datePart} - ${timePart}`
  }

  private static readonly NAME_MAX_LENGTH = 15

  /**
   * Format name: full name by default, abbreviated to "F. Surname" if over NAME_MAX_LENGTH chars.
   */
  private static formatName(name: string): string {
    if (!name || typeof name !== 'string') {
      return name || ''
    }

    const trimmedName = name.trim()
    const nameParts = trimmedName.split(/\s+/)

    if (nameParts.length === 1) {
      return nameParts[0]
    }

    if (trimmedName.length <= this.NAME_MAX_LENGTH) {
      return trimmedName
    }

    const firstInitial = nameParts[0].charAt(0).toUpperCase()
    const lastName = nameParts[nameParts.length - 1]
    return `${firstInitial}. ${lastName}`
  }

  /**
   * Get position label for rowing positions
   */
  private static getPositionLabel(
    seatNumber: number,
    totalSeats: number,
  ): string {
    // For single sculls (1x), use 'Sculler' instead of 'Stroke'
    if (totalSeats === 1) return 'Sculler'
    if (seatNumber === 1) return 'Bow'
    if (seatNumber === totalSeats) return 'Stroke'
    return `Seat ${seatNumber}`
  }

  /**
   * Get predefined color schemes
   */
  static getPresetColorSchemes(): Array<PresetColorScheme> {
    return [
      {
        name: 'Classic Green',
        description: 'Traditional rowing club green and pink',
        primaryColor: '#15803d',
        secondaryColor: '#f9a8d4',
      },
      {
        name: 'Ocean Blue',
        description: 'Deep blue with light blue accents',
        primaryColor: '#1e40af',
        secondaryColor: '#60a5fa',
      },
      {
        name: 'Royal Purple',
        description: 'Rich purple with gold highlights',
        primaryColor: '#7c3aed',
        secondaryColor: '#fbbf24',
      },
      {
        name: 'Sunset Orange',
        description: 'Warm orange with coral accents',
        primaryColor: '#ea580c',
        secondaryColor: '#fb7185',
      },
      {
        name: 'Forest Green',
        description: 'Deep forest green with emerald',
        primaryColor: '#059669',
        secondaryColor: '#10b981',
      },
      {
        name: 'Cardinal Red',
        description: 'Bold cardinal red with cream',
        primaryColor: '#dc2626',
        secondaryColor: '#fef3c7',
      },
      {
        name: 'Navy Blue',
        description: 'Classic navy with silver accents',
        primaryColor: '#1e3a8a',
        secondaryColor: '#e5e7eb',
      },
      {
        name: 'Maroon Gold',
        description: 'Rich maroon with golden yellow',
        primaryColor: '#991b1b',
        secondaryColor: '#fde047',
      },
    ]
  }

  /**
   * Get a color scheme by name
   */
  static getColorSchemeByName(name: string): ColorScheme | null {
    const preset = this.getPresetColorSchemes().find(
      (scheme) => scheme.name === name,
    )
    return preset
      ? {
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
        }
      : null
  }

  /**
   * Generate crew positions with styling for Template 4
   */
  private static generateCrewPositions(crewMembers: Array<any>, boatCode: string) {
    console.log(`🔍 DEBUG: generateCrewPositions for ${boatCode}, crewMembers:`, crewMembers.map(m => ({ position: m.POSITION, name: m.NAME })))

    return crewMembers.map((member, index) => {
      // member.POSITION already contains the correct position string
      let badge: string

      if (member.POSITION === 'Coxswain') {
        badge = 'C'
      } else if (member.POSITION === 'Bow') {
        badge = 'B'
      } else if (member.POSITION === 'Stroke') {
        // Special case for 1x boats - use "1x" badge for better styling
        badge = boatCode === '1x' ? '1x' : 'S'
      } else if (member.POSITION === 'Sculler') {
        // Handle single scull - use "1x" badge for styling consistency
        badge = '1x'
      } else {
        // Extract seat number from "Seat X" format
        const seatMatch = member.POSITION.match(/Seat (\d+)/)
        badge = seatMatch ? seatMatch[1] : member.POSITION
      }

      console.log(`🔍 DEBUG: Member "${member.NAME}" - Position: "${member.POSITION}" -> Badge: "${badge}"`)
      const style = this.getPositionStyle(badge, boatCode)
      const seatLabel = this.getSeatLabel(badge)

      return {
        name: this.formatName(member.NAME),
        position: badge,
        badge: badge,
        seatLabel: seatLabel,
        style: style
      }
    })
  }

  private static getSeatLabel(badge: string): string {
    if (badge === 'C') return 'Cox'
    if (badge === 'S') return 'Stroke'
    if (badge === 'B') return 'Bow'
    if (/^\d+$/.test(badge)) return `${badge} Seat`
    return badge
  }

  /**
   * Generate crew category string with different formats for different templates
   * Template 1: "Heat 2 | 8+" format
   * Template 2: "boat name | race category" format
   */
  private static generateCrewCategory(crew: any, template?: any): string {
    const raceCategory = crew.raceCategory || null
    const boatCode = crew.boatCode || '8+'
    const boatName = crew.boatName || crew.name || null
    const templateId = template?.id

    console.log('🔍 DEBUG generateCrewCategory:')
    console.log('  - crew.raceCategory:', crew.raceCategory)
    console.log('  - crew.boatName:', crew.boatName)
    console.log('  - crew.name:', crew.name)
    console.log('  - boatCode:', boatCode)
    console.log('  - templateId:', templateId)
    console.log('  - crew object keys:', Object.keys(crew))

    // Template 2: Use "boat name - race category" format (no boat code)
    if (templateId && (templateId.includes('template-2') || templateId.includes('template2'))) {
      console.log('  - Using Template 2 format: boat name - race category (no boat code)')
      if (boatName && raceCategory) {
        console.log('  - Result:', `${boatName} - ${raceCategory}`)
        return `${boatName} - ${raceCategory}`
      } else if (boatName) {
        console.log('  - Result (no race category):', `${boatName}`)
        return boatName
      } else if (raceCategory) {
        console.log('  - Result (no boat name):', `${raceCategory}`)
        return raceCategory
      } else {
        console.log('  - Result (fallback):', `Open Club`)
        return 'Open Club'
      }
    }

    // Template 1 and others: Use "boat name - race category" format (no boat code)
    console.log('  - Using Template 1 format: boat name - race category')
    if (boatName && raceCategory) {
      console.log('  - Result:', `${boatName} - ${raceCategory}`)
      return `${boatName} - ${raceCategory}`
    } else if (boatName) {
      console.log('  - Result (no race category):', `${boatName} - Open Club`)
      return `${boatName} - Open Club`
    } else if (raceCategory) {
      console.log('  - Result (no boat name):', `Open Club - ${raceCategory}`)
      return `Open Club - ${raceCategory}`
    } else {
      console.log('  - Result (fallback):', `Open Club - Open Club`)
      return `Open Club - Open Club`
    }
  }

  /**
   * Check if the template is Template 2 based on metadata or ID
   */
  private static isTemplate2(template?: any): boolean {
    // Check template metadata paths first (most reliable)
    if (template?.metadata?.cssFile?.includes('template2') ||
        template?.metadata?.htmlFile?.includes('template2')) {
      return true
    }

    // Fallback to checking template ID or name
    if (template?.id?.includes('template-2') ||
        template?.id?.includes('template2') ||
        template?.name?.toLowerCase().includes('corner brackets')) {
      return true
    }

    return false
  }

  /**
   * Get abbreviated position for template 2 (first letter/number)
   */
  private static getAbbreviatedPosition(position: string): string {
    // Handle numbered seats - check both formats: "2 Seat", "Seat 2"
    const numberMatch = position.match(/(\d+)/)
    if (numberMatch) {
      return numberMatch[1]
    }

    // Handle special positions
    const pos = position.toLowerCase()
    if (pos.includes('bow')) return 'B'
    if (pos.includes('stroke')) return 'S'
    if (pos.includes('cox')) return 'C'

    // Default to first letter, uppercase
    return position.charAt(0).toUpperCase()
  }

  /**
   * Get position badge text for crew member
   */
  private static getPositionBadge(position: string, seatNumber: number, totalSeats: number) {
    if (position === 'Coxswain') {
      return { badge: 'C', fullName: 'Coxswain' }
    }

    if (seatNumber === 1) {
      return { badge: 'B', fullName: 'Bow' }
    }

    if (seatNumber === totalSeats - 1) { // Exclude cox from total
      return { badge: 'S', fullName: 'Stroke' }
    }

    return { badge: seatNumber.toString(), fullName: `Seat ${seatNumber}` }
  }

  /**
   * Get CSS positioning style for crew member based on boat layout
   */
  private static getPositionStyle(badge: string, boatCode: string): string {
    // Different positioning layouts based on boat type
    switch (boatCode) {
      case '4+':
        return this.get4PlusPositions(badge)
      case '4-':
        return this.get4MinusPositions(badge)
      case '4x':
        return this.get4xPositions(badge)
      case '2x':
        return this.get2xPositions(badge)
      case '2-':
        return this.get2MinusPositions(badge)
      case '1x':
        return this.get1xPositions(badge)
      case '8+':
      default:
        return this.get8PlusPositions(badge)
    }
  }

  /**
   * Position layout for 8+ boats (original layout)
   */
  private static get8PlusPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 37% !important; right: 360px !important;',
      '2': 'top: 41% !important; left: 310px !important;',
      '3': 'top: 47% !important; right: 360px !important;',
      '4': 'top: 51% !important; left: 310px !important;',
      '5': 'top: 57% !important; right: 360px !important;',
      '6': 'top: 61% !important; left: 310px !important;',
      '7': 'top: 67% !important; right: 360px !important;',
      'S': 'top: 72% !important; left: 310px !important;',
      'C': 'top: 76% !important; right: 520px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 4+ boats (Coxed Four)
   */
  private static get4PlusPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 45% !important; right: 360px !important;',
      '2': 'top: 52% !important; left: 310px !important;',
      '3': 'top: 59% !important; right: 360px !important;',
      'S': 'top: 66% !important; left: 310px !important;',
      'C': 'top: 72% !important; right: 520px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 4- boats (Coxless Four)
   */
  private static get4MinusPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 45% !important; right: 360px !important;',
      '2': 'top: 52% !important; left: 310px !important;',
      '3': 'top: 59% !important; right: 360px !important;',
      'S': 'top: 66% !important; left: 310px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 4x boats (Quad Sculls)
   */
  private static get4xPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 42% !important; right: 385px !important;',
      '2': 'top: 51% !important; left: 335px !important;',
      '3': 'top: 60% !important; right: 385px !important;',
      'S': 'top: 69% !important; left: 335px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 2x boats (Double Sculls)
   */
  private static get2xPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 46% !important; right: 340px !important;',
      'S': 'top: 63% !important; left: 290px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 2- boats (Coxless Pair)
   */
  private static get2MinusPositions(badge: string): string {
    const positions: Record<string, string> = {
      'B': 'top: 49% !important; right: 340px !important;',
      'S': 'top: 63% !important; left: 290px !important;'
    }
    return positions[badge] || 'top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Position layout for 1x boats (Single Sculls)
   */
  private static get1xPositions(badge: string): string {
    const positions: Record<string, string> = {
      'S': 'top: 35% !important; left: 65% !important; transform: translate(-50%, -50%) !important;',
      '1x': 'top: 35% !important; left: 65% !important; transform: translate(-50%, -50%) !important;',
      'Sculler': 'top: 35% !important; left: 65% !important; transform: translate(-50%, -50%) !important;'
    }
    return positions[badge] || 'top: 53% !important; left: 50% !important; transform: translate(-50%, -50%) !important;'
  }

  /**
   * Generate oar positions for boat diagram
   */
  private static generateOarPositions(boatCode: string) {
    const positions = []
    const seatCount = parseInt(boatCode.charAt(0)) || 8

    for (let i = 1; i <= seatCount; i++) {
      const isPort = i % 2 === 0 // Even seats are port side
      const oarX = 50 + (i * 35) // Spread oars along boat

      positions.push({
        seat: i,
        isPort: isPort,
        oarX: oarX
      })
    }

    return positions
  }
}
