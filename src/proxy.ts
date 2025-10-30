import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProfileRoute = createRouteMatcher(["/profile(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Restrict profile routes to signed in users
  if (isProfileRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
