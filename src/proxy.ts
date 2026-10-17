import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  // Early sign-in redirect for navigation; each profile page also checks auth.
  const pathname = req.nextUrl.pathname;
  const isNavigation =
    req.headers.get("accept")?.includes("text/html") ||
    ["document", "iframe"].includes(req.headers.get("sec-fetch-dest") ?? "") ||
    req.headers.has("x-nextjs-data");

  if (
    isNavigation &&
    (pathname === "/profile" || pathname.startsWith("/profile/"))
  ) {
    const { isAuthenticated, redirectToSignIn } = await auth();
    if (!isAuthenticated) return redirectToSignIn();
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
