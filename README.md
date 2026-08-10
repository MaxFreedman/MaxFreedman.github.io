# MB4X Radio Archive

An interactive explorer for the MB4X IARU HF 2026 contest log and its synchronized stereo field recording. Audio-activity correlation identified Radio 0 on the right channel and Radio 1 on the left; the interface can solo either radio, preserve the stereo split, mix both to center, or manually swap the assignment.

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Rebuild the data

The checked-in contact index and audio manifest are generated from the supplied Cabrillo log:

```bash
node scripts/prepare-data.mjs /path/to/mb4x.txt
```

The eight browser-ready MP3 segments are derived from the supplied ZIP archives without modifying the originals:

```bash
./scripts/prepare-audio.sh /path/to/download-folder
```

Generate audio-derived second estimates after preparing the log and audio:

```bash
/Users/maxfreedman/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/analyze-audio.py
```

This measures half-second activity independently on each stereo channel. Contacts within the same logged radio/minute are placed chronologically across the detected activity, with four seconds of pre-roll for CW and seven seconds for SSB. These are estimates because Cabrillo stores no seconds; the original minute remains available in every contact record.

The recorder metadata places the first audio sample at 2026-07-11 12:45:37 British Summer Time, or 11:45:37 UTC. The contest therefore begins 14 minutes 23 seconds into the first recording. The final recording ends at 11:59:40 UTC, about 19 seconds before the final 12:00 log entry.

## Validation

```bash
npm run lint
npm test
```
