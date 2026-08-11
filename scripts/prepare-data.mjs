import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const logPath = process.argv[2] || "/Users/maxfreedman/Downloads/mb4x.txt";
const outputDir = path.join(root, "public", "data");

const bandFor = (frequency) => {
  if (frequency < 2000) return "160m";
  if (frequency < 4000) return "80m";
  if (frequency < 8000) return "40m";
  if (frequency < 11000) return "30m";
  if (frequency < 15000) return "20m";
  if (frequency < 19000) return "17m";
  if (frequency < 22000) return "15m";
  if (frequency < 26000) return "12m";
  return "10m";
};

const text = await readFile(logPath, "utf8");
const contacts = [];
const header = {};

for (const line of text.split(/\r?\n/)) {
  if (line.startsWith("QSO:")) {
    const fields = line.trim().split(/\s+/);
    const frequency = Number(fields[1]);
    const time = `${fields[4].slice(0, 2)}:${fields[4].slice(2, 4)}`;
    contacts.push({
      id: contacts.length + 1,
      frequency,
      band: bandFor(frequency),
      mode: fields[2],
      timestamp: `${fields[3]}T${time}:00Z`,
      call: fields[8],
      sent: `${fields[6]} ${fields[7]}`,
      received: `${fields[9]} ${fields[10]}`,
      exchange: fields[10],
      radio: Number(fields[11]),
    });
    continue;
  }

  const separator = line.indexOf(":");
  if (separator > 0) {
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value && !header[key]) header[key] = value;
  }
}

const contestStart = "2026-07-11T12:00:00Z";
const contestEnd = "2026-07-12T12:00:00Z";
const fullDuration = 12173.200544217687;
const lastDuration = 2032.6690249433107;
// The Zoom BWF metadata records the station's local British Summer Time.
// Cabrillo timestamps are UTC, so preserving the +01:00 offset here is
// essential: the first recording begins 14m23s before the contest starts.
const recorderStartsBst = [
  "2026-07-11T12:45:37+01:00",
  "2026-07-11T16:08:30+01:00",
  "2026-07-11T19:31:23+01:00",
  "2026-07-11T22:54:16+01:00",
  "2026-07-12T02:17:09+01:00",
  "2026-07-12T05:40:02+01:00",
  "2026-07-12T09:02:55+01:00",
  "2026-07-12T12:25:48+01:00",
];
const audioStarts = recorderStartsBst.map((timestamp) => new Date(timestamp).toISOString());
const audioEnd = new Date(Date.parse(audioStarts.at(-1)) + lastDuration * 1000).toISOString();

const manifest = {
  station: header.CALLSIGN || "MB4X",
  contest: header.CONTEST || "IARU-HF",
  operators: (header.OPERATORS || "W7WLW N4ML").split(/\s+/),
  claimedScore: Number(header["CLAIMED-SCORE"] || 0),
  contestStart,
  contestEnd,
  audioStart: audioStarts[0],
  audioEnd,
  recorderClock: "Europe/London (BST, UTC+1)",
  channelMap: { 0: "right", 1: "left" },
  channelMapSource: "audio activity correlation",
  chunks: audioStarts.map((start, index) => ({
    id: index + 1,
    file: `/audio/recording-${String(index + 1).padStart(2, "0")}.mp3`,
    start,
    duration: index === 7 ? lastDuration : fullDuration,
  })),
};

const summary = {
  total: contacts.length,
  uniqueCalls: new Set(contacts.map((contact) => contact.call)).size,
  byRadio: [0, 1].map((radio) => contacts.filter((contact) => contact.radio === radio).length),
  byMode: Object.fromEntries(
    ["CW", "PH"].map((mode) => [mode, contacts.filter((contact) => contact.mode === mode).length]),
  ),
  byBand: Object.fromEntries(
    [...new Set(contacts.map((contact) => contact.band))].map((band) => [
      band,
      contacts.filter((contact) => contact.band === band).length,
    ]),
  ),
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "contacts.json"), JSON.stringify({ contacts, summary }));
await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Prepared ${contacts.length} contacts from ${logPath}`);
