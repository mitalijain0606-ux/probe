import { describe, expect, it } from 'vitest';
import { uptimePercentage } from '../src/utils/serialize.js';

describe('uptimePercentage', () => {
  it('returns 0 for no checks', () => {
    expect(uptimePercentage(0, 0)).toBe(0);
  });

  it('computes successful / total * 100', () => {
    expect(uptimePercentage(9, 10)).toBe(90);
    expect(uptimePercentage(1, 3)).toBe(33.33);
  });

  it('returns 100 when all checks succeeded', () => {
    expect(uptimePercentage(5, 5)).toBe(100);
  });
});
