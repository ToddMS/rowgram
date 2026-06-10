import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../../lib/trpc'
import { prisma } from '../../lib/prisma'

export const clubRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return []
    return await prisma.club.findMany({
      where: { userId: ctx.user.id },
      include: { user: true, crews: true },
      orderBy: { name: 'asc' },
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.club.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          crews: { include: { club: true } },
        },
      })
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.club.findMany({
        where: { userId: input.userId },
        include: { crews: true },
        orderBy: { name: 'asc' },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
        logoUrl: z.string().optional(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId: _ignored, ...rest } = input
      return await prisma.club.create({
        data: { ...rest, userId: ctx.user.id },
        include: { user: true },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
        logoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input
      return await prisma.club.update({
        where: { id },
        data,
        include: { user: true },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.club.delete({ where: { id: input.id } })
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return await prisma.club.deleteMany({
        where: { id: { in: input.ids } },
      })
    }),
})
