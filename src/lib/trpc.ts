import { TRPCError, initTRPC } from '@trpc/server'
import { auth } from '../../auth'

interface Context {
  user?: { id: string }
}

export async function createContext(): Promise<Context> {
  const session = await auth()
  if (session?.user?.id) {
    return { user: { id: session.user.id } }
  }
  return {}
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})
