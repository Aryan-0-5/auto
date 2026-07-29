export type ConcurrentResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

/** Runs fn over items with at most `limit` in flight at once. Never throws — each
 * result is tagged ok/error so batch API routes can report partial success instead
 * of failing the whole batch when one Composio call fails. */
export async function runWithConcurrency<I, T>(
  items: I[],
  limit: number,
  fn: (item: I) => Promise<T>
): Promise<ConcurrentResult<T>[]> {
  const results: ConcurrentResult<T>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = { ok: true, value: await fn(items[index]) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
