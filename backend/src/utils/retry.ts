/**
 * Helper to retry database or network operations on transient errors
 * (e.g. Prisma Accelerate connection drops or network timeouts).
 */
export async function withRetry<R>(fn: () => Promise<R>, retries = 3, delayMs = 300): Promise<R> {
  try {
    return await fn();
  } catch (err: any) {
    const isTransientError =
      err?.name === "PrismaClientInitializationError" ||
      err?.name === "PrismaClientRustPanicError" ||
      err?.message?.includes("Can't reach database server") ||
      err?.message?.includes("Connection refused") ||
      err?.message?.includes("Timed out") ||
      err?.message?.includes("closed transaction");

    if (retries > 0 && isTransientError) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, Math.round(delayMs * 1.5));
    }
    throw err;
  }
}
