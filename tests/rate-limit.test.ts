import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimit, trackedIpCount } from "../lib/rate-limit";

test("allows 10 requests per minute per IP, then rejects with a retry hint", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 10; i++) assert.deepEqual(checkRateLimit("a", t0 + i), { ok: true });
  const blocked = checkRateLimit("a", t0 + 10);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.retryAfterSec, 60);
  assert.deepEqual(checkRateLimit("a", t0 + 60_000), { ok: true });
});

test("sweeps buckets of IPs that never come back", () => {
  const t0 = 10_000_000;
  for (let i = 0; i < 50; i++) checkRateLimit(`one-off-${i}`, t0);
  assert.ok(trackedIpCount() >= 50);
  // A single request from any IP after the window triggers the sweep.
  checkRateLimit("later", t0 + 61_000);
  assert.equal(trackedIpCount(), 1);
});
