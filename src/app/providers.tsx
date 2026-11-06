"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTabStore } from "~/stores/TabStore";
import { api, createQueryClient, createTRPCClient } from "~/utils/api";

function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(createTRPCClient);
  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}

function SessionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [session, setSession] = useState({ userId, cacheKey: 0 });

  if (isLoaded && userId !== session.userId) {
    setSession({
      userId,
      // An unresolved identity is not a guest session. Keep the initial page
      // mounted when Clerk loads, but discard private caches on real changes.
      cacheKey:
        session.userId === undefined ? session.cacheKey : session.cacheKey + 1,
    });
  }

  return <QueryProvider key={session.cacheKey}>{children}</QueryProvider>;
}

export default function Providers({ children }: { children: ReactNode }) {
  const theme = useTabStore((state) => state.theme);
  return (
    <ClerkProvider
      appearance={{
        theme: theme === "dark" ? dark : undefined,
        options: { showOptionalFields: true },
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </ClerkProvider>
  );
}
