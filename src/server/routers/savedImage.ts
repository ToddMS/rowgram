import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../../lib/trpc'
import { prisma } from '../../lib/prisma'
import { ImageGenerationService } from '../../lib/imageGeneration'
import JSZip from 'jszip'

function generateClubAbbreviation(clubName: string): string {
  const cleanedName = clubName.trim()
  if (cleanedName.toLowerCase().includes('london') && cleanedName.toLowerCase().includes('rowing')) return 'LRC'
  if (cleanedName.toLowerCase().includes('cambridge') && cleanedName.toLowerCase().includes('university')) return 'CUBC'
  if (cleanedName.toLowerCase().includes('oxford') && cleanedName.toLowerCase().includes('university')) return 'OUBC'
  if (cleanedName.toLowerCase().includes('thames') && cleanedName.toLowerCase().includes('rowing')) return 'TRC'
  if (cleanedName.toLowerCase().includes('leander') && cleanedName.toLowerCase().includes('club')) return 'LRC'
  const words = cleanedName.replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => !['rowing', 'boat', 'club', 'the', 'and', 'of', 'bc', 'rc'].includes(w.toLowerCase()))
  if (words.length === 0) return cleanedName.replace(/[^\w]/g, '').substring(0, 4).toUpperCase()
  let abbreviation = ''
  for (const word of words) { if (abbreviation.length < 4) abbreviation += word.charAt(0).toUpperCase() }
  if (abbreviation.length < 2) abbreviation = cleanedName.replace(/[^\w]/g, '').substring(0, 4).toUpperCase()
  return abbreviation
}

function createBoatFilename(boatName: string | null | undefined, fallbackFilename: string): string {
  if (!boatName?.trim()) return fallbackFilename
  return `${boatName.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.png`
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  return fs.readFile(path.join(process.cwd(), 'public', imageUrl))
}

export const savedImageRouter = router({
  getAll: publicProcedure.query(async () => {
    return await prisma.savedImage.findMany({
      include: { crew: { include: { boatType: true, club: true } }, template: true, user: true },
      orderBy: { createdAt: 'desc' },
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.savedImage.findUnique({
        where: { id: input.id },
        include: { crew: { include: { boatType: true, club: true } }, template: true, user: true },
      })
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.savedImage.findMany({
        where: { userId: input.userId },
        include: { crew: { include: { boatType: true, club: true } }, template: true },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getByCrewId: publicProcedure
    .input(z.object({ crewId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.savedImage.findMany({
        where: { crewId: input.crewId },
        include: { template: true, user: true },
        orderBy: { createdAt: 'desc' },
      })
    }),

  create: protectedProcedure
    .input(z.object({
      filename: z.string(),
      imageUrl: z.string().url(),
      fileSize: z.number().int().optional(),
      dimensions: z.any().optional(),
      metadata: z.any().optional(),
      crewId: z.string(),
      templateId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await prisma.savedImage.create({
        data: { ...input, userId: ctx.user.id },
        include: { crew: { include: { boatType: true } }, template: true, user: true },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      filename: z.string().optional(),
      imageUrl: z.string().url().optional(),
      fileSize: z.number().int().optional(),
      dimensions: z.any().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return await prisma.savedImage.update({
        where: { id },
        data,
        include: { crew: { include: { boatType: true } }, template: true, user: true },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.savedImage.delete({ where: { id: input.id } })
    }),

  generate: protectedProcedure
    .input(z.object({
      crewId: z.string(),
      templateId: z.string(),
      clubId: z.string().optional(),
      colors: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<{ id: string; imageUrl: string; filename: string }> => {
      try {
        const crew = await prisma.crew.findUnique({ where: { id: input.crewId }, include: { boatType: true, club: true } })
        if (!crew) throw new Error('Crew not found')

        const template = await prisma.template.findUnique({ where: { id: input.templateId } })
        if (!template) throw new Error('Template not found')

        const validation = ImageGenerationService.validateGenerationInput(crew, template)
        if (!validation.valid) throw new Error(validation.error)

        let selectedClub = null
        if (input.clubId) selectedClub = await prisma.club.findUnique({ where: { id: input.clubId } })
        const crewForGeneration = selectedClub ? { ...crew, club: selectedClub } : crew

        const generatedImage = await ImageGenerationService.generateCrewImage(
          crewForGeneration,
          template,
          input.colors?.primaryColor && input.colors?.secondaryColor
            ? { primaryColor: input.colors.primaryColor, secondaryColor: input.colors.secondaryColor }
            : undefined,
        )

        const saved = await prisma.savedImage.create({
          data: {
            crewId: input.crewId,
            templateId: input.templateId,
            userId: ctx.user.id,
            imageUrl: generatedImage.imageUrl,
            filename: generatedImage.filename,
            metadata: {
              width: generatedImage.width,
              height: generatedImage.height,
              generatedAt: new Date().toISOString(),
              colors: input.colors || { primaryColor: crew.club?.primaryColor || '#15803d', secondaryColor: crew.club?.secondaryColor || '#f9a8d4' },
            },
          },
        })
        return { id: saved.id, imageUrl: saved.imageUrl, filename: saved.filename }
      } catch (err) {
        console.error('Image generation error:', err)
        throw new Error(`Failed to generate image: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }),

  generatePreview: publicProcedure
    .input(z.object({
      crewId: z.string(),
      templateId: z.string(),
      clubId: z.string().optional(),
      colors: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const crew = await prisma.crew.findUnique({ where: { id: input.crewId }, include: { boatType: true, club: true } })
        if (!crew) throw new Error('Crew not found')
        const template = await prisma.template.findUnique({ where: { id: input.templateId } })
        if (!template) throw new Error('Template not found')
        let selectedClub = null
        if (input.clubId) selectedClub = await prisma.club.findUnique({ where: { id: input.clubId } })
        const crewForGeneration = selectedClub ? { ...crew, club: selectedClub } : crew
        const validation = ImageGenerationService.validateGenerationInput(crewForGeneration, template)
        if (!validation.valid) throw new Error(validation.error)
        const generatedImage = await ImageGenerationService.generateCrewImage(
          crewForGeneration, template,
          input.colors?.primaryColor && input.colors?.secondaryColor
            ? { primaryColor: input.colors.primaryColor, secondaryColor: input.colors.secondaryColor }
            : undefined,
        )
        return { imageUrl: generatedImage.imageUrl, filename: generatedImage.filename, width: generatedImage.width, height: generatedImage.height }
      } catch (err) {
        console.error('Preview generation error:', err)
        throw new Error(`Failed to generate preview: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }),

  generateBatch: protectedProcedure
    .input(z.object({
      crewIds: z.array(z.string()),
      templateId: z.string(),
      clubId: z.string().optional(),
      colors: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<{ successful: number; failed: number; errors: Array<string>; total: number }> => {
      try {
        const template = await prisma.template.findUnique({ where: { id: input.templateId } })
        if (!template) throw new Error('Template not found')

        let selectedClub = null
        if (input.clubId) selectedClub = await prisma.club.findUnique({ where: { id: input.clubId } })

        const results: Array<any> = []
        const errors: Array<{ crewId: string; error: string }> = []

        const browser = await ImageGenerationService.launchBrowser()
        try {
          const CONCURRENCY = 3
          for (let i = 0; i < input.crewIds.length; i += CONCURRENCY) {
            const chunk = input.crewIds.slice(i, i + CONCURRENCY)
            const chunkResults = await Promise.allSettled(
              chunk.map(async (crewId) => {
                const crew = await prisma.crew.findUnique({ where: { id: crewId }, include: { boatType: true, club: true } })
                if (!crew) throw new Error('Crew not found')
                const validation = ImageGenerationService.validateGenerationInput(crew, template)
                if (!validation.valid) throw new Error(validation.error)
                const crewForGeneration = selectedClub ? { ...crew, club: selectedClub } : crew
                const generatedImage = await ImageGenerationService.generateCrewImage(
                  crewForGeneration, template,
                  input.colors?.primaryColor && input.colors?.secondaryColor
                    ? { primaryColor: input.colors.primaryColor, secondaryColor: input.colors.secondaryColor }
                    : undefined,
                  browser,
                )
                return await prisma.savedImage.create({
                  data: {
                    crewId,
                    templateId: input.templateId,
                    userId: ctx.user.id,
                    imageUrl: generatedImage.imageUrl,
                    filename: generatedImage.filename,
                    metadata: {
                      width: generatedImage.width,
                      height: generatedImage.height,
                      generatedAt: new Date().toISOString(),
                      colors: input.colors || { primaryColor: crew.club?.primaryColor || '#15803d', secondaryColor: crew.club?.secondaryColor || '#f9a8d4' },
                    },
                  },
                  include: { crew: { include: { boatType: true, club: true } }, template: true, user: { select: { id: true, name: true, email: true } } },
                })
              }),
            )
            for (let j = 0; j < chunkResults.length; j++) {
              const result = chunkResults[j]
              if (result.status === 'fulfilled') results.push(result.value)
              else errors.push({ crewId: chunk[j], error: result.reason instanceof Error ? result.reason.message : 'Unknown error' })
            }
          }
        } finally {
          await browser.close()
        }

        return { successful: results.length, failed: errors.length, errors: errors.map((e) => e.error), total: input.crewIds.length }
      } catch (err) {
        console.error('Batch image generation error:', err)
        throw new Error(`Failed to generate batch images: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }),

  downloadWithCover: publicProcedure
    .input(z.object({ savedImageId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const savedImage = await prisma.savedImage.findUnique({
          where: { id: input.savedImageId },
          include: { crew: { include: { boatType: true, club: true } }, template: true, user: true },
        })
        if (!savedImage) throw new Error('Saved image not found')

        const meta = savedImage.metadata as Record<string, any> | null
        const colors = meta?.colors ? { primaryColor: meta.colors.primaryColor as string, secondaryColor: meta.colors.secondaryColor as string } : undefined

        const coverImage = await ImageGenerationService.generateCoverImage(
          { raceName: savedImage.crew.raceName || 'Crew Announcement', raceDate: savedImage.crew.raceDate ?? undefined, club: savedImage.crew.club },
          savedImage.template,
          colors,
        )

        const zip = new JSZip()
        const crewImageBuffer = await fetchImageBuffer(savedImage.imageUrl)
        const coverImageBuffer = await fetchImageBuffer(coverImage.imageUrl)

        zip.file(createBoatFilename(savedImage.crew.boatName, savedImage.filename), crewImageBuffer)
        zip.file(`${savedImage.crew.raceName || 'race'}-cover.png`, coverImageBuffer)

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
        return { zipData: zipBuffer.toString('base64'), filename: `${savedImage.crew.name || savedImage.crew.raceName || 'crew'}-images.zip`, size: zipBuffer.length }
      } catch (err) {
        console.error('Download with cover error:', err)
        throw new Error(`Failed to create download package: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }),

  batchDownload: publicProcedure
    .input(z.object({
      savedImageIds: z.array(z.string()),
      mode: z.enum(['auto', 'all-together', 'by-club', 'by-race', 'by-club-race', 'covers-only', 'images-only']).optional().default('auto'),
    }))
    .mutation(async ({ input }) => {
      try {
        const savedImages = await prisma.savedImage.findMany({
          where: { id: { in: input.savedImageIds } },
          include: { crew: { include: { boatType: true, club: true } }, template: true, user: true },
        })
        if (savedImages.length === 0) throw new Error('No images found')

        const raceGroups = new Map<string, typeof savedImages>()
        const clubGroups = new Map<string, typeof savedImages>()
        for (const image of savedImages) {
          const raceKey = image.crew.raceName || 'No Race'
          const clubKey = image.crew.club?.name || image.crew.clubName || 'No Club'
          if (!raceGroups.has(raceKey)) raceGroups.set(raceKey, [])
          if (!clubGroups.has(clubKey)) clubGroups.set(clubKey, [])
          raceGroups.get(raceKey)!.push(image)
          clubGroups.get(clubKey)!.push(image)
        }

        const hasMultipleRaces = raceGroups.size > 1
        const hasMultipleClubs = clubGroups.size > 1
        const isMixed = hasMultipleRaces || hasMultipleClubs

        if (input.mode === 'auto' && isMixed) {
          return {
            requiresUserChoice: true,
            analysisData: {
              totalImages: savedImages.length,
              raceGroups: Array.from(raceGroups.entries()).map(([raceName, images]) => ({ raceName, count: images.length })),
              clubGroups: Array.from(clubGroups.entries()).map(([clubName, images]) => ({ clubName, count: images.length })),
              hasMixedRaces: hasMultipleRaces,
              hasMixedClubs: hasMultipleClubs,
            },
          }
        }

        if (input.mode === 'all-together' || (!isMixed && input.mode === 'auto')) {
          const zip = new JSZip()
          for (const image of savedImages) {
            zip.file(createBoatFilename(image.crew.boatName, image.filename), await fetchImageBuffer(image.imageUrl))
          }
          if (!isMixed || input.mode === 'all-together') {
            const firstImage = savedImages[0]
            const coverImage = await ImageGenerationService.generateCoverImage(
              { raceName: firstImage.crew.raceName || (isMixed ? 'Mixed Races' : 'Race'), raceDate: firstImage.crew.raceDate || undefined, club: firstImage.crew.club },
              firstImage.template!,
              { primaryColor: firstImage.crew.club?.primaryColor || '#15803d', secondaryColor: firstImage.crew.club?.secondaryColor || '#f9a8d4' },
            )
            zip.file(`${(firstImage.crew.raceName || 'race').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}-cover.png`, await fetchImageBuffer(coverImage.imageUrl))
          }
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
          const filename = isMixed ? 'all-selected-images.zip' : `${(savedImages[0].crew.raceName || 'race').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}.zip`
          return { downloads: [{ zipData: zipBuffer.toString('base64'), filename }] }
        }

        if (input.mode === 'by-race') {
          const downloads = []
          for (const [raceName, raceImages] of raceGroups.entries()) {
            const zip = new JSZip()
            for (const image of raceImages) zip.file(createBoatFilename(image.crew.boatName, image.filename), await fetchImageBuffer(image.imageUrl))
            const firstImage = raceImages[0]
            const coverImage = await ImageGenerationService.generateCoverImage(
              { raceName, raceDate: firstImage.crew.raceDate || undefined, club: firstImage.crew.club },
              firstImage.template!,
              { primaryColor: firstImage.crew.club?.primaryColor || '#15803d', secondaryColor: firstImage.crew.club?.secondaryColor || '#f9a8d4' },
            )
            zip.file(`${raceName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}-cover.png`, await fetchImageBuffer(coverImage.imageUrl))
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
            downloads.push({ zipData: zipBuffer.toString('base64'), filename: `${raceName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}.zip` })
          }
          return { downloads }
        }

        if (input.mode === 'by-club') {
          const downloads = []
          for (const [clubName, clubImages] of clubGroups.entries()) {
            const zip = new JSZip()
            for (const image of clubImages) zip.file(createBoatFilename(image.crew.boatName, image.filename), await fetchImageBuffer(image.imageUrl))
            const firstImage = clubImages[0]
            const clubAbbr = generateClubAbbreviation(clubName)
            const coverImage = await ImageGenerationService.generateCoverImage(
              { raceName: hasMultipleRaces ? `${clubName} Crews` : (firstImage.crew.raceName || 'Club Announcement'), raceDate: firstImage.crew.raceDate || undefined, club: firstImage.crew.club },
              firstImage.template!,
              { primaryColor: firstImage.crew.club?.primaryColor || '#15803d', secondaryColor: firstImage.crew.club?.secondaryColor || '#f9a8d4' },
            )
            zip.file(`${clubAbbr.toLowerCase()}-crews-cover.png`, await fetchImageBuffer(coverImage.imageUrl))
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
            downloads.push({ zipData: zipBuffer.toString('base64'), filename: `${clubAbbr.toLowerCase()}-crews.zip` })
          }
          return { downloads }
        }

        if (input.mode === 'by-club-race') {
          const downloads = []
          const clubRaceCombinations = new Map<string, typeof savedImages>()
          for (const image of savedImages) {
            const key = `${image.crew.club?.name || image.crew.clubName || 'No Club'}|${image.crew.raceName || 'No Race'}`
            if (!clubRaceCombinations.has(key)) clubRaceCombinations.set(key, [])
            clubRaceCombinations.get(key)!.push(image)
          }
          for (const [key, images] of clubRaceCombinations.entries()) {
            const pipeIndex = key.indexOf('|')
            const clubName = key.slice(0, pipeIndex)
            const raceName = key.slice(pipeIndex + 1)
            const zip = new JSZip()
            for (const image of images) zip.file(createBoatFilename(image.crew.boatName, image.filename), await fetchImageBuffer(image.imageUrl))
            const firstImage = images[0]
            const coverImage = await ImageGenerationService.generateCoverImage(
              { raceName, raceDate: firstImage.crew.raceDate || undefined, club: firstImage.crew.club },
              firstImage.template!,
              { primaryColor: firstImage.crew.club?.primaryColor || '#15803d', secondaryColor: firstImage.crew.club?.secondaryColor || '#f9a8d4' },
            )
            const safeRaceName = raceName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            zip.file(`${safeRaceName}-cover.png`, await fetchImageBuffer(coverImage.imageUrl))
            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
            downloads.push({ zipData: zipBuffer.toString('base64'), filename: `${safeRaceName}-${generateClubAbbreviation(clubName)}.zip` })
          }
          return { downloads }
        }

        if (input.mode === 'covers-only') {
          const zip = new JSZip()
          const processedRaces = new Set<string>()
          for (const image of savedImages) {
            const raceName = image.crew.raceName || 'No Race'
            if (processedRaces.has(raceName)) continue
            processedRaces.add(raceName)
            const coverImage = await ImageGenerationService.generateCoverImage(
              { raceName, raceDate: image.crew.raceDate || undefined, club: image.crew.club },
              image.template!,
              { primaryColor: image.crew.club?.primaryColor || '#15803d', secondaryColor: image.crew.club?.secondaryColor || '#f9a8d4' },
            )
            zip.file(`${raceName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}-cover.png`, await fetchImageBuffer(coverImage.imageUrl))
          }
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
          return { downloads: [{ zipData: zipBuffer.toString('base64'), filename: 'cover-images.zip' }] }
        }

        if (input.mode === 'images-only') {
          const zip = new JSZip()
          for (const image of savedImages) zip.file(createBoatFilename(image.crew.boatName, image.filename), await fetchImageBuffer(image.imageUrl))
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
          return { downloads: [{ zipData: zipBuffer.toString('base64'), filename: 'crew-images.zip' }] }
        }

        throw new Error(`Mode ${input.mode} not implemented`)
      } catch (err) {
        console.error('Batch download error:', err)
        throw new Error(`Failed to create batch download: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }),
})
