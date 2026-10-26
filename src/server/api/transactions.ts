import type { Prisma, PrismaClient } from "~/generated/client";

function isWriteConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error))
    return false;
  if (error.code === "P2034") return true;
  // Prisma 7's pg adapter wraps conflicts from raw SQL as P2010.
  if (error.code !== "P2010" || !("meta" in error)) return false;
  const meta = error.meta as
    | {
        code?: string;
        driverAdapterError?: { cause?: { originalCode?: string } };
      }
    | undefined;
  const code = meta?.code ?? meta?.driverAdapterError?.cause?.originalCode;
  return code === "40001" || code === "40P01";
}

/** Retry the entire database-only operation when concurrent writers conflict. */
export async function serializableTransaction<T>(
  db: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (error) {
      if (attempt >= 4 || !isWriteConflict(error)) {
        throw error;
      }
    }
  }
}
