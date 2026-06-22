import { z } from 'zod'
import { publicProcedure, protectedProcedure, router } from '../../lib/trpc'
import { prisma } from '../../lib/prisma'

export const crewRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) return []
    try {
      return await prisma.crew.findMany({
        where: { userId: ctx.user.id },
        include: { club: true },
      })
    } catch (error) {
      console.error('Error fetching crews:', error)
      return []
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await prisma.crew.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          club: true,
          savedImages: { include: { template: true } },
        },
      })
    }),

  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ input }) => {
      return await prisma.crew.findMany({
        where: { id: { in: input.ids } },
        include: { user: true, club: true },
      })
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.crew.findMany({
        where: { userId: input.userId },
        include: {
          club: true,
          savedImages: { include: { template: true } },
        },
      })
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        clubName: z.string().optional(),
        clubId: z.string().optional(),
        raceName: z.string().optional(),
        raceDate: z.string().optional(),
        boatName: z.string().optional(),
        coachName: z.string().optional(),
        raceCategory: z.string().optional(),
        crewNames: z.array(z.string()),
        boatCode: z.string(),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }): Promise<{ id: string; name: string }> => {
      const { userId: _ignored, ...rest } = input
      const crew = await prisma.crew.create({
        data: { ...rest, userId: ctx.user.id },
      })
      return { id: crew.id, name: crew.name }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        clubName: z.string().optional(),
        clubId: z.string().optional(),
        raceName: z.string().optional(),
        raceDate: z.string().optional(),
        boatName: z.string().optional(),
        coachName: z.string().optional(),
        raceCategory: z.string().optional(),
        crewNames: z.array(z.string()).optional(),
        boatCode: z.string().optional(),
      }),
    )
    .mutation(async ({ input }): Promise<{ id: string; name: string }> => {
      const { id, ...data } = input
      const crew = await prisma.crew.update({
        where: { id },
        data,
      })
      return { id: crew.id, name: crew.name }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }): Promise<{ id: string }> => {
      await prisma.crew.delete({ where: { id: input.id } })
      return { id: input.id }
    }),

})
