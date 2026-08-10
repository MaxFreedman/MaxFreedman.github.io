import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the MB4X archive shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>MB4X Radio Archive<\/title>/i);
  assert.match(html, /Indexing 4,606 contacts/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("contact index and audio timeline stay aligned", async () => {
  const [contactData, manifest, page] = await Promise.all([
    readFile(new URL("../public/data/contacts.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../public/data/manifest.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
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
