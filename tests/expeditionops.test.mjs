import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  seed,
  blank,
  validateData,
  bagWeight,
  alerts,
  stats,
} from "../public/projects/expeditionops/domain.js";
import {
  parseBackup,
  encodeBackup,
} from "../public/projects/expeditionops/storage.js";

test("ExpeditionOps backups retain planning data and reject invalid imports", () => {
  const data = seed();
  assert.deepEqual(parseBackup(encodeBackup(data)), data);
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
  assert.deepEqual(parseBackup(encodeBackup(blank())), blank());
  assert.throws(() => parseBackup("{broken"), /valid JSON/);
  assert.throws(
    () => parseBackup(JSON.stringify({ format: "expeditionops-v2", data })),
    /Unsupported/,
  );
  assert.throws(() => parseBackup(" ".repeat(1_000_001)), /under 1 MB/);
  const broken = structuredClone(data);
  broken.items[0].bag = "missing-bag";
  assert.throws(
    () => parseBackup(JSON.stringify(broken)),
    /Unknown assignment/,
  );
});

test("Logistics calculations preserve baggage, arrival, and readiness behavior", () => {
  const data = validateData(seed());
  assert.equal(bagWeight(data, data.bags[0]), 13.4);
  assert.equal(stats(data).readiness, 38);
  assert.equal(stats(blank()).readiness, 0);
  assert.equal(
    alerts(data, "2026-10-02").filter((item) =>
      item.title.includes("arrives too late"),
    ).length,
    2,
  );
  data.bags[1].traveler = "p1";
  assert.equal(
    alerts(data, "2026-10-02").filter((item) =>
      item.title.includes("arrives too late"),
    ).length,
    0,
  );
  data.bags[0].limit = 10;
  assert.ok(alerts(data).some((item) => item.title.includes("overweight")));
});

test("GitHub Pages artifact contains the standalone ExpeditionOps demo assets", async () => {
  const assets = [
    "index.html",
    "app.js",
    "domain.js",
    "storage.js",
    "styles.css",
    "favicon.svg",
  ];
  const files = await Promise.all(
    assets.map((name) =>
      readFile(
        new URL(`../dist/projects/expeditionops/${name}`, import.meta.url),
        "utf8",
      ),
    ),
  );
  assert.match(files[0], /src="\.\/app\.js"/);
  assert.match(files[0], /href="\.\/styles\.css"/);
  assert.doesNotMatch(
    files[1],
    /fetch\(|signin-with-chatgpt|data-action="invite"/,
  );
});
