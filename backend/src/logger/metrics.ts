interface Histogram {
  count: number;
  sum: number;
  max: number;
}

const emptyHistogram = (): Histogram => ({ count: 0, sum: 0, max: 0 });

const counters = new Map<string, number>();
const histograms = new Map<string, Histogram>();
const startedAt = Date.now();

function key(name: string, labels?: Record<string, string | number>): string {
  if (!labels) return name;
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? `${name}{${parts.join(',')}}` : name;
}

export function incrementCounter(name: string, labels?: Record<string, string | number>, by = 1): void {
  const k = key(name, labels);
  counters.set(k, (counters.get(k) ?? 0) + by);
}

export function observe(name: string, value: number, labels?: Record<string, string | number>): void {
  const k = key(name, labels);
  const current = histograms.get(k) ?? emptyHistogram();
  current.count += 1;
  current.sum += value;
  current.max = Math.max(current.max, value);
  histograms.set(k, current);
}

export function snapshot() {
  const histogramOutput: Record<string, { count: number; avg: number; max: number }> = {};
  for (const [name, h] of histograms) {
    histogramOutput[name] = {
      count: h.count,
      avg: h.count === 0 ? 0 : Math.round((h.sum / h.count) * 100) / 100,
      max: h.max,
    };
  }
  return {
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    counters: Object.fromEntries(counters),
    histograms: histogramOutput,
  };
}

export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
}
