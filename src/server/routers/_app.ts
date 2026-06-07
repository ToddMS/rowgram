import { router } from '../../lib/trpc'
import { simpleRouter } from './simple'
import { userRouter } from './user'
import { crewRouter } from './crew'
import { clubRouter } from './club'
import { templateRouter } from './template'
import { savedImageRouter } from './savedImage'

export const appRouter = router({
  simple: simpleRouter,
  user: userRouter,
  crew: crewRouter,
  club: clubRouter,
  template: templateRouter,
  savedImage: savedImageRouter,
})

export type AppRouter = typeof appRouter
