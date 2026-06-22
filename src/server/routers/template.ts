import { z } from 'zod'
import { publicProcedure, router } from '../../lib/trpc'
import { prisma } from '../../lib/prisma'

export const templateRouter = router({
  getAll: publicProcedure.query(async () => {
    const templates = await prisma.template.findMany({
      where: { isActive: true },
    })
    return templates.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0
      const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0
      return numA - numB
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.template.findUnique({
        where: { id: input.id },
        include: {
          savedImages: {
            include: {
              crew: true,
              user: true,
            },
          },
        },
      })
    }),

  getByType: publicProcedure
    .input(z.object({ templateType: z.string() }))
    .query(async ({ input }) => {
      return await prisma.template.findMany({
        where: {
          templateType: input.templateType,
          isActive: true,
        },
      })
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        templateType: z.string(),
        previewUrl: z.string().url(),
        metadata: z.any().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      return await prisma.template.create({
        data: input,
      })
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        templateType: z.string().optional(),
        previewUrl: z.string().url().optional(),
        metadata: z.any().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return await prisma.template.update({
        where: { id },
        data,
      })
    }),

  toggleActive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const template = await prisma.template.findUnique({
        where: { id: input.id },
      })

      return await prisma.template.update({
        where: { id: input.id },
        data: { isActive: !template?.isActive },
      })
    }),
})
