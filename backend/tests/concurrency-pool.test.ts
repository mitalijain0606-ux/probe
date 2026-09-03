import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from '../src/modules/monitoring/service/concurrency-pool.js';

describe('runWithConcurrency', () => {
  it('never runs more than the configured limit at once', async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return item * 2;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('does not let one failed task stop the others', async () => {
    const results = await runWithConcurrency([1, 2, 3], 2, async (item) => {
      if (item === 2) throw new Error('boom');
      return item;
    });

    expect(results[0]?.result).toBe(1);
    expect(results[1]?.error).toBeInstanceOf(Error);
    expect(results[2]?.result).toBe(3);
  });

  it('preserves the order and count of results', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const results = await runWithConcurrency(items, 5, async (item) => item);
    expect(results.map((r) => r.result)).toEqual(items);
  });
});
