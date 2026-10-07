# Max Freedman — Projects

The source for Max Freedman's personal GitHub Pages site. The home page introduces the project collection; the first published project is the MB4X Radio Archive.

## Routes

- `/` — personal home and projects
- `/projects/expeditionops/` — browser-local logistics demo with JSON import/export
- `/projects/mb4x-radio-archive/` — interactive MB4X IARU HF 2026 log and synchronized stereo recording

The archive contains 4,606 contacts and eight browser-ready MP3 segments. Audio-activity correlation identified Radio 0 on the right channel and Radio 1 on the left. The player can solo either radio, preserve stereo, or mix both channels.

## Develop locally

```bash
npm install
npm run dev
```

## Rebuild the archive

Generate the contact index and audio manifest from the Cabrillo log:

```bash
node scripts/prepare-data.mjs /path/to/mb4x.txt
```

Prepare the eight MP3 segments from the source ZIP archives:

```bash
./scripts/prepare-audio.sh /path/to/download-folder
```

Generate audio-derived timing estimates:

```bash
python3 scripts/analyze-audio.py
```

The analysis measures half-second activity independently on each stereo channel. Contacts in the same logged radio/minute are distributed across detected activity, with four seconds of pre-roll for CW and seven seconds for SSB. These are estimates because Cabrillo records minutes, not seconds.

## Publish

The workflow in `.github/workflows/pages.yml` builds and deploys the static site whenever `main` changes. GitHub Pages must be configured to use **GitHub Actions** as its source.

```bash
npm run lint
npm test
```

## ExpeditionOps demo

The GitHub Pages edition runs entirely in the browser. It stores expedition plans in IndexedDB on the current device; JSON exports provide backups and transfers between devices. It supports the original `expeditionops-v1` backup envelope and validated plain expedition JSON. Imports replace the current plan only after confirmation, or create the first plan in an empty browser.

The demo preserves equipment manifests, bag and freight assignments, traveler arrivals and baggage limits, readiness tasks, planning alerts, CSV exports, and printable field packs. It does not require sign-in or provide shared invitations or online synchronization. The original Sites app and its database remain unchanged.

The static app lives in `public/projects/expeditionops/`. `domain.js` preserves the original planning calculations; `storage.js` provides transactional local saving, validation, backup compatibility, and revision checks between browser tabs. Only the fictional seed expedition is included in the published files.
