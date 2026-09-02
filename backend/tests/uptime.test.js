const {
  calculateUptimePercentage,
  calculateAvgResponseTime,
} = require('../src/services/urlService');

describe('Uptime and Latency Metrics Calculation', () => {
  describe('calculateUptimePercentage', () => {
    test('returns 100% when there are no checks recorded yet', () => {
      expect(calculateUptimePercentage([])).toBe(100);
      expect(calculateUptimePercentage(null)).toBe(100);
    });

    test('returns 100% when all checks are UP', () => {
      const checks = [
        { status: 'UP' },
        { status: 'UP' },
        { status: 'UP' },
      ];
      expect(calculateUptimePercentage(checks)).toBe(100);
    });

    test('returns 0% when all checks are DOWN', () => {
      const checks = [
        { status: 'DOWN' },
        { status: 'DOWN' },
      ];
      expect(calculateUptimePercentage(checks)).toBe(0);
    });

    test('calculates 95% accurately for 95 UP and 5 DOWN (matches prompt example)', () => {
      const checks = [
        ...Array(95).fill({ status: 'UP' }),
        ...Array(5).fill({ status: 'DOWN' }),
      ];
      expect(calculateUptimePercentage(checks)).toBe(95);
    });

    test('calculates 66.7% for 2 UP and 1 DOWN', () => {
      const checks = [
        { status: 'UP' },
        { status: 'UP' },
        { status: 'DOWN' },
      ];
      expect(calculateUptimePercentage(checks)).toBe(66.7);
    });
  });

  describe('calculateAvgResponseTime', () => {
    test('returns 0 for empty checks array', () => {
      expect(calculateAvgResponseTime([])).toBe(0);
    });

    test('computes mean latency in ms', () => {
      const checks = [
        { responseTime: 100 },
        { responseTime: 200 },
        { responseTime: 300 },
      ];
      expect(calculateAvgResponseTime(checks)).toBe(200);
    });
  });
});
