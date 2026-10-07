import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("static export contains the personal home and MB4X project", async () => {
  const [home, archive] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../dist/projects/mb4x-radio-archive/index.html", import.meta.url), "utf8"),
  ]);
  assert.match(home, /<title>Max Freedman \/ N4ML<\/title>/i);
  assert.match(home, /src="\/assets\/[^\"]+\.js"/i);
  const homeSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(homeSource, /whole site is AI experimentation/i);
  assert.match(homeSource, /3Y0K Bouvet Island expedition/i);
  assert.match(homeSource, /modern technology[\s\S]*?plan complex logistics[\s\S]*?carry out ambitious operations/i);
  const html = archive;
  assert.match(html, /<title>MB4X Radio Archive<\/title>/i);
  assert.match(html, /maxfreedman\.github\.io\/projects\/mb4x-radio-archive/i);
});

test("contact index and audio timeline stay aligned", async () => {
  const [contactData, manifest, page] = await Promise.all([
    readFile(new URL("../public/data/contacts.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../public/data/manifest.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../components/radio-archive/ArchivePage.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(contactData.contacts.length, 4606);
  assert.equal(contactData.summary.byRadio[0] + contactData.summary.byRadio[1], 4606);
  assert.ok(contactData.contacts.every((contact) => Number.isFinite(Date.parse(contact.timestamp))));
  assert.equal(manifest.chunks.length, 8);
  assert.equal(manifest.audioStart, "2026-07-11T11:45:37.000Z");
  assert.equal(manifest.audioEnd, "2026-07-12T11:59:40.669Z");
  assert.equal(manifest.recorderClock, "Europe/London (BST, UTC+1)");
  assert.deepEqual(manifest.channelMap, { "0": "right", "1": "left" });
  assert.equal(Date.parse(contactData.contacts[0].timestamp) - Date.parse(manifest.audioStart), 863000);
  const unmapped = contactData.contacts.filter((contact) => !manifest.chunks.some((chunk) => {
    const contactTime = Date.parse(contact.timestamp);
    const chunkStart = Date.parse(chunk.start);
    return contactTime >= chunkStart && contactTime < chunkStart + chunk.duration * 1000;
  }));
  assert.deepEqual(unmapped.map((contact) => contact.id), [4606]);
  const estimated = contactData.contacts.filter((contact) => contact.estimatedTimestamp);
  assert.equal(estimated.length, 4605);
  assert.ok(estimated.every((contact) => Date.parse(contact.cueTimestamp) <= Date.parse(contact.estimatedTimestamp)));
  assert.match(page, /R0 solo/);
  assert.match(page, /R1 solo/);
  assert.match(page, /Swap L\/R/);
});

test("all eight audio recordings ship in the Pages artifact", async () => {
  const files = Array.from({ length: 8 }, (_, index) =>
    `recording-${String(index + 1).padStart(2, "0")}.mp3`
  );
  const sizes = await Promise.all(files.map((file) =>
    stat(new URL(`../dist/audio/${file}`, import.meta.url)).then((entry) => entry.size)
  ));
  assert.ok(sizes.every((size) => size > 10_000_000));
});
