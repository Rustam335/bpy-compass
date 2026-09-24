/**
 * Minimal per-IP fixed-window rate limiter for /api/chat.
 * In-memory: good enough for a demo on Fluid Compute where instances are reused,
 * but not a hard guarantee. The real cost guard is the credit limit on the OpenRouter key.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
/** Expired buckets are swept at most this often, so the map cannot grow with one-off IPs (issue #10). */
const SWEEP_INTERVAL_MS = WINDOW_MS;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let nextSweepAt = 0;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** Drop every bucket whose window has ended. Runs lazily on the next request after the interval. */
function sweepExpired(now: number): void {
  if (now < nextSweepAt) return;
  nextSweepAt = now + SWEEP_INTERVAL_MS;
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(ip);
  }
}

export function checkRateLimit(ip: string, now = Date.now()): RateLimitResult {
  sweepExpired(now);
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }
  buckets.set(ip, { count: current.count + 1, resetAt: current.resetAt });
  return { ok: true };
}

/** Number of tracked IPs. Exposed for tests only. */
export function trackedIpCount(): number {
  return buckets.size;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
