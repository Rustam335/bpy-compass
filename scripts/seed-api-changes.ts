/**
 * Seed `blenderVersion` and `apiChange` documents from sanity/seed/*.json.
 * Idempotent: deterministic _ids + createOrReplace.
 *
 *   yarn seed
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeClient } from "../lib/sanity";

const SEED_DIR = path.join(process.cwd(), "sanity", "seed");

type VersionSeed = { version: string; lts: boolean; releaseDate: string | null; releaseNotesUrl: string };
type ApiChangeSeed = {
  id: string;
  symbol: string;
  kind: "removed" | "renamed" | "behavior" | "added";
  changedIn: string;
  replacement?: string;
  summary: string;
  before?: string;
  after?: string;
  sourceUrl: string;
  area: string;
};

export function versionDocId(version: string): string {
  return `blenderVersion-${version.replace(/\./g, "-")}`;
}

async function loadJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(SEED_DIR, file), "utf8")) as T;
}

function codeField(code?: string) {
  return code ? { _type: "code", language: "python", code } : undefined;
}

async function main() {
  const [versions, changes] = await Promise.all([
    loadJson<VersionSeed[]>("blender-versions.json"),
    loadJson<ApiChangeSeed[]>("api-changes.json"),
  ]);

  const knownVersions = new Set(versions.map((v) => v.version));
  const orphans = changes.filter((c) => !knownVersions.has(c.changedIn));
  if (orphans.length > 0) {
    throw new Error(
      `apiChange references unknown versions: ${orphans.map((c) => `${c.id}→${c.changedIn}`).join(", ")}`,
    );
  }

  const tx = writeClient().transaction();

  for (const v of versions) {
    tx.createOrReplace({
      _id: versionDocId(v.version),
      _type: "blenderVersion",
      version: v.version,
      lts: v.lts,
      releaseDate: v.releaseDate ?? undefined,
      releaseNotesUrl: v.releaseNotesUrl,
    });
  }

  for (const c of changes) {
    tx.createOrReplace({
      _id: `apiChange-${c.id}`,
      _type: "apiChange",
      symbol: c.symbol,
      kind: c.kind,
      changedIn: { _type: "reference", _ref: versionDocId(c.changedIn) },
      replacement: c.replacement,
      summary: c.summary,
      before: codeField(c.before),
      after: codeField(c.after),
      sourceUrl: c.sourceUrl,
      area: c.area,
    });
  }

  const result = await tx.commit();
  console.log(`Seeded ${versions.length} versions and ${changes.length} api changes (tx ${result.transactionId}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
