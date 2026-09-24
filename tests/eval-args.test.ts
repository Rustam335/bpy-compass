import assert from "node:assert/strict";
import { test } from "node:test";
import { parseArgs } from "../scripts/eval";

test("--only N selects by order and --dry-run is independent", () => {
  assert.deepEqual(parseArgs(["--only", "3"]), { dryRun: false, only: 3 });
  assert.deepEqual(parseArgs(["--dry-run", "--only", "12"]), { dryRun: true, only: 12 });
  assert.deepEqual(parseArgs(["--dry-run"]), { dryRun: true });
});

test("--only without a positive integer refuses to run instead of running everything", () => {
  for (const argv of [["--only"], ["--only", "abc"], ["--only", "0"], ["--only", "-1"], ["--only", "1.5"], ["--only", "--dry-run"]]) {
    assert.throws(() => parseArgs(argv), /--only expects a positive integer/, argv.join(" "));
  }
});
