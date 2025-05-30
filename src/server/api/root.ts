import { genreRouter } from "~/server/api/routers/genre";
import { createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/user";
import { artistRouter } from "./routers/artist";
import { bookmarkRouter } from "./routers/bookmark";
import { postSignUpRegistrationRouter } from "./routers/postSignUpRegistration";
import { tabRouter } from "./routers/tab";
import { searchRouter } from "./routers/search";
import { tabRatingRouter } from "./routers/tabRating";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  genre: genreRouter,
  search: searchRouter,
  tab: tabRouter,
  tabRating: tabRatingRouter,
  user: userRouter,
  artist: artistRouter,
  bookmark: bookmarkRouter,
  postSignUpRegistration: postSignUpRegistrationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
