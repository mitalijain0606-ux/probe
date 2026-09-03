/**
 * Runs `tasks` with at most `limit` running concurrently.
 *
 * This intentionally avoids Promise.all across the whole task list: with a
 * few hundred monitored URLs, firing every check at once would open that
 * many sockets simultaneously and make response-time numbers meaningless
 * (everything queues behind the same event loop and network stack). A
 * worker-pool of `limit` slots keeps memory and outbound connections bounded
 * regardless of how many URLs are being checked, and one task throwing never
 * stops the others because each task is wrapped individually.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ item: T; result?: R; error?: unknown }>> {
  const results: Array<{ item: T; result?: R; error?: unknown }> = new Array(items.length);
  const poolSize = Math.max(1, Math.min(limit, items.length || 1));
  let cursor = 0;

  async function runSlot(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;

      const item = items[index] as T;
      try {
        const result = await worker(item, index);
        results[index] = { item, result };
      } catch (error) {
        results[index] = { item, error };
      }
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => runSlot()));
  return results;
}
