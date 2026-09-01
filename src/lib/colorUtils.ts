/**
 * WCAG-based color contrast utilities.
 *
 * Used by the template compiler to ensure club colors don't produce invisible
 * or unreadable text when they're very light (e.g. white primary) or very
 * dark (e.g. black secondary).
 */

/** WCAG relative luminance for a hex color. */
export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between two hex colors (always ≥ 1). */
export function getContrastRatio(fg: string, bg: string): number {
  const l1 = getRelativeLuminance(fg)
  const l2 = getRelativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─── HSL ↔ hex helpers ───────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    const tt = ((t % 1) + 1) % 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Adjusts `color` lightness until it reaches `minRatio` contrast against
 * `background`. Returns the original if it already passes.
 *
 * Direction: darkens when background is light, lightens when background is dark.
 */
export function clampToMinContrast(
  color: string,
  background: string,
  minRatio = 4.5,
): string {
  if (getContrastRatio(color, background) >= minRatio) return color

  const bgLum = getRelativeLuminance(background)
  const [h, s, l] = hexToHsl(color)

  // Which direction to step
  const goDown = bgLum > 0.5 // darken text against light bg
  const step = goDown ? -0.01 : 0.01
  let current = l

  for (let i = 0; i < 100; i++) {
    current = Math.max(0, Math.min(1, current + step))
    const candidate = hslToHex(h, s, current)
    if (getContrastRatio(candidate, background) >= minRatio) return candidate
    if (current <= 0 || current >= 1) break
  }

  return bgLum > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Returns the version of `color` safe for use as text on a white background
 * (WCAG AA large-text minimum: 3:1; normal text: 4.5:1).
 *
 * If the color already passes, it is returned unchanged.
 */
export function textSafeOnWhite(color: string, minRatio = 4.5): string {
  return clampToMinContrast(color, '#ffffff', minRatio)
}

/**
 * Returns the version of `color` safe for use as text on a near-black (#1a1a1a)
 * background.
 */
export function textSafeOnDark(color: string, minRatio = 4.5): string {
  return clampToMinContrast(color, '#1a1a1a', minRatio)
}

/**
 * Returns `color` if it's visible against a white background, otherwise `fallback`
 * (normally the other club color). For decorative fills/shapes — not text — so the
 * threshold is much looser than WCAG text contrast: a solid block just needs to read
 * as a distinct shape against white, not carry a 4.5:1 text-legibility guarantee.
 * The default (1.3:1) passes ordinary saturated colors, including pale pastels like
 * the templates' own default pink (~1.6:1), while still catching near-white colors,
 * washed-out pastels, and bright yellow (~1.0-1.3:1).
 */
export function colorSafeOnWhite(
  color: string,
  fallback: string,
  minRatio = 1.3,
): string {
  return getContrastRatio(color, '#ffffff') >= minRatio ? color : fallback
}

/**
 * Validates a color pair and returns a list of human-readable warnings.
 * Useful for surfacing issues in the UI before/after a user picks club colors.
 */
export function validateColorPair(
  primary: string,
  secondary: string,
): Array<string> {
  const warnings: Array<string> = []

  const primOnWhite = getContrastRatio(primary, '#ffffff')
  const secOnWhite = getContrastRatio(secondary, '#ffffff')
  const primOnBlack = getContrastRatio(primary, '#000000')
  const secOnBlack = getContrastRatio(secondary, '#000000')
  const primOnSec = getContrastRatio(primary, secondary)

  if (primOnWhite < 3) {
    warnings.push(
      `Primary color (${primary}) is too light for text on white backgrounds (contrast ${primOnWhite.toFixed(1)}:1, minimum 3:1).`,
    )
  }
  if (secOnWhite < 3) {
    warnings.push(
      `Secondary color (${secondary}) is too light for text on white backgrounds (contrast ${secOnWhite.toFixed(1)}:1, minimum 3:1).`,
    )
  }
  if (primOnBlack < 3) {
    warnings.push(
      `Primary color (${primary}) is too dark for text on dark backgrounds (contrast ${primOnBlack.toFixed(1)}:1, minimum 3:1).`,
    )
  }
  if (secOnBlack < 3) {
    warnings.push(
      `Secondary color (${secondary}) is too dark for text on dark backgrounds (contrast ${secOnBlack.toFixed(1)}:1, minimum 3:1).`,
    )
  }
  if (primOnSec < 2) {
    warnings.push(
      `Primary and secondary colors are very similar (contrast ${primOnSec.toFixed(1)}:1). Elements may blend together.`,
    )
  }

  return warnings
}
