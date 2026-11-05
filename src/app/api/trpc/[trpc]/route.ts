import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { env } from "~/env.js";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
}
export { handler as GET, handler as POST };
