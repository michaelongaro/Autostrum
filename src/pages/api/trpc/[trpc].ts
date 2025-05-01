import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "~/env.js";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // extra, maybe reduce if needed
    },
    responseLimit: false,
  },
};

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
});
