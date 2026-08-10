"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Contact = {
  id: number;
  frequency: number;
  band: string;
  mode: "CW" | "PH";
  timestamp: string;
  call: string;
  sent: string;
  received: string;
  exchange: string;
  radio: 0 | 1;
  estimatedTimestamp?: string;
  cueTimestamp?: string;
  estimatedSecond?: number;
  analysisConfidence?: "high" | "medium" | "low" | "unavailable";
  analysisScore?: number;
};

type Summary = {
  total: number;
  uniqueCalls: number;
  byRadio: number[];
  byMode: Record<string, number>;
  byBand: Record<string, number>;
};

type Chunk = { id: number; file: string; start: string; duration: number };

type Manifest = {
  station: string;
  contest: string;
  operators: string[];
  claimedScore: number;
  contestStart: string;
  contestEnd: string;
  audioStart: string;
  audioEnd: string;
  recorderClock: string;
  channelMap: Record<string, "left" | "right">;
  channelMapSource?: string;
  chunks: Chunk[];
};

type ListenMode = "stereo" | "radio0" | "radio1" | "mix";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const secondFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatTime(timestamp: string | number) {
  return timeFormatter.format(new Date(timestamp));
}

function formatFullTime(timestamp: string | number) {
  const date = new Date(timestamp);
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)} UTC`;
}

function formatSecondTime(timestamp: string | number) {
  return secondFormatter.format(new Date(timestamp));
}

function formatFrequency(frequency: number) {
  return (frequency / 1000).toFixed(3);
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function nearestContact(contacts: Contact[], target: number) {
  let low = 0;
  let high = contacts.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (Date.parse(contacts[mid].timestamp) < target) low = mid + 1;
    else high = mid;
  }
  if (low > 0) {
    const before = contacts[low - 1];
    const after = contacts[low];
    if (Math.abs(Date.parse(before.timestamp) - target) < Math.abs(Date.parse(after.timestamp) - target)) {
      return before;
    }
  }
  return contacts[low];
}

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [radio, setRadio] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(180);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [activeChunk, setActiveChunk] = useState<Chunk | null>(null);
  const [currentAbsolute, setCurrentAbsolute] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listenMode, setListenMode] = useState<ListenMode>("stereo");
  const [swapped, setSwapped] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState("Select a contact to cue its audio");
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainMatrixRef = useRef<GainNode[][] | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/contacts.json").then((response) => response.json()),
      fetch("/data/manifest.json").then((response) => response.json()),
    ]).then(([contactData, manifestData]) => {
      setContacts(contactData.contacts);
      setSummary(contactData.summary);
      setManifest(manifestData);
      setSwapped(manifestData.channelMap?.["0"] === "right");
      setSelected(contactData.contacts.find((contact: Contact) => {
        const timestamp = Date.parse(contact.timestamp);
        return timestamp >= Date.parse(manifestData.audioStart) && timestamp < Date.parse(manifestData.audioEnd);
      }) ?? contactData.contacts[0]);
    });
  }, []);

  const bands = useMemo(() => summary ? Object.keys(summary.byBand).sort((a, b) => parseFloat(b) - parseFloat(a)) : [], [summary]);

  const filtered = useMemo(() => {
    const term = query.trim().toUpperCase();
    return contacts.filter((contact) => {
      if (term && !contact.call.includes(term) && !contact.exchange.includes(term)) return false;
      if (band !== "ALL" && contact.band !== band) return false;
      if (mode !== "ALL" && contact.mode !== mode) return false;
      if (radio !== "ALL" && contact.radio !== Number(radio)) return false;
      return true;
    });
  }, [contacts, query, band, mode, radio]);

  useEffect(() => setVisibleCount(180), [query, band, mode, radio]);

  const activity = useMemo(() => {
    if (!manifest) return [];
    const bins = Array.from({ length: 192 }, () => [0, 0]);
    const start = Date.parse(manifest.contestStart);
    const duration = Date.parse(manifest.contestEnd) - start;
    contacts.forEach((contact) => {
      const index = Math.min(bins.length - 1, Math.max(0, Math.floor(((Date.parse(contact.timestamp) - start) / duration) * bins.length)));
      bins[index][contact.radio] += 1;
    });
    return bins;
  }, [contacts, manifest]);

  const updateGainMatrix = useCallback(() => {
    const matrix = gainMatrixRef.current;
    if (!matrix) return;
    matrix.flat().forEach((gain) => { gain.gain.value = 0; });
    const physicalForRadio = (radioNumber: number) => swapped ? 1 - radioNumber : radioNumber;
    const route = (radioNumber: number, left: number, right: number) => {
      const physical = physicalForRadio(radioNumber);
      matrix[physical][0].gain.value = left;
      matrix[physical][1].gain.value = right;
    };
    if (listenMode === "stereo") {
      route(0, 1, 0);
      route(1, 0, 1);
    } else if (listenMode === "mix") {
      route(0, 0.72, 0.72);
      route(1, 0.72, 0.72);
    } else if (listenMode === "radio0") {
      route(0, 1, 1);
    } else {
      route(1, 1, 1);
    }
  }, [listenMode, swapped]);

  useEffect(() => updateGainMatrix(), [updateGainMatrix]);

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioContextRef.current) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const splitter = context.createChannelSplitter(2);
      const merger = context.createChannelMerger(2);
      const matrix = [
        [context.createGain(), context.createGain()],
        [context.createGain(), context.createGain()],
      ];
      source.connect(splitter);
      for (let input = 0; input < 2; input += 1) {
        for (let output = 0; output < 2; output += 1) {
          splitter.connect(matrix[input][output], input);
          matrix[input][output].connect(merger, 0, output);
        }
      }
      merger.connect(context.destination);
      audioContextRef.current = context;
      gainMatrixRef.current = matrix;
      updateGainMatrix();
    }
    if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
  }, [updateGainMatrix]);

  const loadAbsolute = useCallback((target: number, shouldPlay = false) => {
    if (!manifest || !audioRef.current) return false;
    const chunk = manifest.chunks.find((item) => {
      const start = Date.parse(item.start);
      return target >= start && target < start + item.duration * 1000;
    });
    if (!chunk) {
      setNotice(target < Date.parse(manifest.audioStart)
        ? `No recording — audio starts at ${formatTime(manifest.audioStart)} UTC`
        : `No recording — audio ends at ${formatTime(manifest.audioEnd)} UTC`);
      setCurrentAbsolute(target);
      return false;
    }

    const audio = audioRef.current;
    const offset = Math.max(0, (target - Date.parse(chunk.start)) / 1000);
    wasPlayingRef.current = shouldPlay || !audio.paused;
    const cue = () => {
      audio.currentTime = offset;
      audio.playbackRate = speed;
      setCurrentAbsolute(target);
      setNotice(`Recording ${chunk.id} · ${formatDuration(offset)} into segment · log time is minute-precision`);
      if (wasPlayingRef.current) {
        ensureAudioGraph().then(() => audio.play()).catch(() => setIsPlaying(false));
      }
    };

    if (activeChunk?.id !== chunk.id || !audio.src) {
      setActiveChunk(chunk);
      audio.src = chunk.file;
      audio.load();
      audio.addEventListener("loadedmetadata", cue, { once: true });
    } else {
      cue();
    }
    return true;
  }, [activeChunk, ensureAudioGraph, manifest, speed]);

  const cueContact = useCallback((contact: Contact) => {
    setSelected(contact);
    loadAbsolute(Date.parse(contact.cueTimestamp ?? contact.timestamp), !audioRef.current?.paused);
  }, [loadAbsolute]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !manifest) return;
    if (!activeChunk) {
      const contact = selected ?? contacts.find((item) => Date.parse(item.timestamp) >= Date.parse(manifest.audioStart));
      if (contact) {
        loadAbsolute(Date.parse(contact.cueTimestamp ?? contact.timestamp), true);
        setIsPlaying(true);
      }
      return;
    }
    if (audio.paused) {
      await ensureAudioGraph();
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const stepAudio = (seconds: number) => {
    const base = currentAbsolute ?? (selected ? Date.parse(selected.cueTimestamp ?? selected.timestamp) : Date.parse(manifest?.audioStart ?? "1970-01-01T00:00:00Z"));
    loadAbsolute(base + seconds * 1000, isPlaying);
  };

  const moveContact = (direction: number) => {
    if (!selected) return;
    const index = contacts.findIndex((contact) => contact.id === selected.id);
    const next = contacts[index + direction];
    if (next) cueContact(next);
  };

  const clickTimeline = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!manifest || !contacts.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const target = Date.parse(manifest.contestStart) + ratio * (Date.parse(manifest.contestEnd) - Date.parse(manifest.contestStart));
    setSelected(nearestContact(contacts, target));
    loadAbsolute(target, isPlaying);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !activeChunk) return;
    setCurrentAbsolute(Date.parse(activeChunk.start) + audio.currentTime * 1000);
  };

  const onEnded = () => {
    if (!manifest || !activeChunk) return;
    const next = manifest.chunks[activeChunk.id];
    if (next) loadAbsolute(Date.parse(next.start), true);
    else setIsPlaying(false);
  };

  const contestProgress = manifest && currentAbsolute
    ? ((currentAbsolute - Date.parse(manifest.contestStart)) / (Date.parse(manifest.contestEnd) - Date.parse(manifest.contestStart))) * 100
    : null;
  const contestStartMs = Date.parse(manifest?.contestStart ?? "1970-01-01T00:00:00Z");
  const contestEndMs = Date.parse(manifest?.contestEnd ?? "1970-01-01T00:00:00Z");
  const contestDurationMs = Math.max(1, contestEndMs - contestStartMs);
  const leadingGapPercent = manifest ? Math.max(0, ((Date.parse(manifest.audioStart) - contestStartMs) / contestDurationMs) * 100) : 0;
  const trailingGapPercent = manifest ? Math.max(0, ((contestEndMs - Date.parse(manifest.audioEnd)) / contestDurationMs) * 100) : 0;

  if (!summary || !manifest) {
    return <main className="loading"><div className="loading-mark">MB4X</div><p>Indexing 4,606 contacts…</p></main>;
  }

  return (
    <main className="app-shell">
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
      />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">MB<span>4</span>X</div>
          <div>
            <div className="eyebrow">WRTC station archive</div>
            <h1>IARU HF 2026</h1>
          </div>
        </div>
        <div className="topbar-meta">
          <span><b>{summary.total.toLocaleString()}</b> contacts</span>
          <span><b>{summary.uniqueCalls.toLocaleString()}</b> unique calls</span>
          <span><b>24h</b> contest</span>
        </div>
        <div className="operator-card">
          <span className="live-dot" />
          <div><small>Operators</small><strong>{manifest.operators.join(" · ")}</strong></div>
        </div>
      </header>

      <section className="timeline-section" aria-label="Contest activity timeline">
        <div className="timeline-heading">
          <div>
            <span className="section-kicker">Contest clock</span>
            <strong>{currentAbsolute ? formatFullTime(currentAbsolute) : "11 Jul · 12:00 UTC"}</strong>
          </div>
          <div className="timeline-legend">
            <span><i className="legend-radio0" />Radio 0</span>
            <span><i className="legend-radio1" />Radio 1</span>
            <span className="audio-coverage">Audio {formatTime(manifest.audioStart)} → {formatTime(manifest.audioEnd)} UTC</span>
          </div>
        </div>
        <div className="timeline-axis"><span>12:00</span><span>18:00</span><span>00:00</span><span>06:00</span><span>12:00</span></div>
        <div className="timeline" onClick={clickTimeline} role="slider" aria-label="Seek contest timeline" aria-valuemin={0} aria-valuemax={24} tabIndex={0}>
          {leadingGapPercent > 0 && <div className="missing-audio" style={{ width: `${leadingGapPercent}%` }}><span>no audio</span></div>}
          {trailingGapPercent > 0 && <div className="missing-audio trailing" style={{ width: `${trailingGapPercent}%` }}><span>no audio</span></div>}
          <div className="activity-lane lane-zero">
            {activity.map((bin, index) => <i key={`a${index}`} style={{ height: `${Math.max(4, Math.min(100, bin[0] * 7))}%` }} />)}
          </div>
          <div className="activity-lane lane-one">
            {activity.map((bin, index) => <i key={`b${index}`} style={{ height: `${Math.max(4, Math.min(100, bin[1] * 7))}%` }} />)}
          </div>
          {contestProgress !== null && <div className="playhead" style={{ left: `${Math.max(0, Math.min(100, contestProgress))}%` }}><span /></div>}
        </div>
      </section>

      <div className="workspace-grid">
        <section className="contacts-panel">
          <div className="panel-title-row">
            <div><span className="section-kicker">Logbook</span><h2>Contacts</h2></div>
            <span className="result-count">{filtered.length.toLocaleString()} shown</span>
          </div>

          <div className="filters">
            <label className="search-box">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value.toUpperCase())} placeholder="Search call or exchange" aria-label="Search contacts" />
              {query && <button onClick={() => setQuery("")} aria-label="Clear search">×</button>}
            </label>
            <div className="filter-row">
              <div className="segmented compact" aria-label="Mode filter">
                {["ALL", "CW", "PH"].map((value) => <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{value === "PH" ? "SSB" : value}</button>)}
              </div>
              <select value={radio} onChange={(event) => setRadio(event.target.value)} aria-label="Radio filter">
                <option value="ALL">Both radios</option><option value="0">Radio 0</option><option value="1">Radio 1</option>
              </select>
            </div>
            <div className="band-filters">
              <button className={band === "ALL" ? "active" : ""} onClick={() => setBand("ALL")}>All bands</button>
              {bands.map((value) => <button key={value} className={band === value ? "active" : ""} onClick={() => setBand(value)}>{value}<span>{summary.byBand[value]}</span></button>)}
            </div>
          </div>

          <div className="contact-table-head">
            <span>UTC</span><span>Callsign</span><span>Frequency</span><span>Mode</span><span>Radio</span><span>Exchange</span>
          </div>
          <div className="contact-list">
            {filtered.slice(0, visibleCount).map((contact) => {
                const contactTime = Date.parse(contact.estimatedTimestamp ?? contact.timestamp);
              const available = manifest.chunks.some((chunk) => {
                const chunkStart = Date.parse(chunk.start);
                return contactTime >= chunkStart && contactTime < chunkStart + chunk.duration * 1000;
              });
              return (
                <button key={contact.id} className={`contact-row ${selected?.id === contact.id ? "selected" : ""}`} onClick={() => cueContact(contact)}>
                  <span className="contact-time"><b>{formatTime(contact.timestamp)}</b><small>{dateFormatter.format(new Date(contact.timestamp))}{contact.estimatedTimestamp ? ` · ~${formatSecondTime(contact.estimatedTimestamp)}` : ""}</small></span>
                  <strong className="callsign">{contact.call}</strong>
                  <span className="frequency">{formatFrequency(contact.frequency)}<small>{contact.band}</small></span>
                  <span className={`mode-tag ${contact.mode.toLowerCase()}`}>{contact.mode === "PH" ? "SSB" : "CW"}</span>
                  <span className={`radio-tag radio-${contact.radio}`}>R{contact.radio}</span>
                  <span className="exchange">{contact.received}<small className={available ? "has-audio" : "no-audio"}>{available ? "● audio" : "○ no audio"}</small></span>
                </button>
              );
            })}
            {!filtered.length && <div className="empty-state"><strong>No matching contacts</strong><span>Try clearing a filter or searching another call.</span></div>}
          </div>
          {visibleCount < filtered.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 180)}>Load 180 more <span>↓</span></button>}
        </section>

        <aside className="player-panel">
          <div className="player-sticky">
            <div className="on-air-strip"><span className={isPlaying ? "pulse" : ""} />{isPlaying ? "ON AIR" : "CUED"}<small>{activeChunk ? `REC ${String(activeChunk.id).padStart(2, "0")}/08` : "WAITING"}</small></div>

            <div className="selected-contact">
              <div className="selected-label">Selected contact</div>
              <div className="selected-call-row">
                <h2>{selected?.call ?? "—"}</h2>
                {selected && <span className={`radio-tag radio-${selected.radio}`}>RADIO {selected.radio}</span>}
              </div>
              {selected && <>
                <div className="selected-frequency"><strong>{formatFrequency(selected.frequency)}</strong><span>MHz · {selected.band} · {selected.mode === "PH" ? "SSB" : "CW"}</span></div>
                {selected.estimatedTimestamp && <div className={`analysis-estimate confidence-${selected.analysisConfidence}`}><span>Audio estimate</span><strong>~{formatSecondTime(selected.estimatedTimestamp)} UTC</strong><small>{selected.analysisConfidence} confidence · {selected.mode === "CW" ? "4s" : "7s"} pre-roll</small></div>}
                <div className="contact-facts">
                  <div><small>Time</small><b>{formatFullTime(selected.timestamp)}</b></div>
                  <div><small>Received</small><b>{selected.received}</b></div>
                  <div><small>Sent</small><b>{selected.sent}</b></div>
                  <div><small>Log #</small><b>{String(selected.id).padStart(4, "0")}</b></div>
                </div>
              </>}
            </div>

            <div className="transport">
              <div className="transport-time">
                <strong>{activeChunk && audioRef.current ? formatDuration(audioRef.current.currentTime) : "00:00"}</strong>
                <span>{activeChunk ? formatDuration(activeChunk.duration) : "—"}</span>
              </div>
              <div className="scrub-track">
                <i style={{ width: activeChunk && audioRef.current ? `${Math.min(100, (audioRef.current.currentTime / activeChunk.duration) * 100)}%` : "0%" }} />
              </div>
              <div className="transport-buttons">
                <button onClick={() => moveContact(-1)} aria-label="Previous contact">‹<small>QSO</small></button>
                <button onClick={() => stepAudio(-10)} aria-label="Back 10 seconds"><span>−10</span></button>
                <button className="play-button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button>
                <button onClick={() => stepAudio(10)} aria-label="Forward 10 seconds"><span>+10</span></button>
                <button onClick={() => moveContact(1)} aria-label="Next contact">›<small>QSO</small></button>
              </div>
              <div className="audio-notice">{notice}</div>
            </div>

            <div className="radio-mixer">
              <div className="mixer-heading"><div><span className="section-kicker">Stereo mixer</span><h3>Listen by radio</h3></div><button className={swapped ? "active" : ""} onClick={() => setSwapped((value) => !value)}>⇄ Swap L/R</button></div>
              <div className="channel-map">
                <div className={listenMode === "radio0" ? "solo" : ""}><span className="channel-dot zero" /><strong>Radio 0</strong><small>{swapped ? "RIGHT" : "LEFT"} CHANNEL</small></div>
                <div className={listenMode === "radio1" ? "solo" : ""}><span className="channel-dot one" /><strong>Radio 1</strong><small>{swapped ? "LEFT" : "RIGHT"} CHANNEL</small></div>
              </div>
              <div className="segmented listening-modes">
                <button className={listenMode === "radio0" ? "active radio0-active" : ""} onClick={() => setListenMode("radio0")}>R0 solo</button>
                <button className={listenMode === "stereo" ? "active" : ""} onClick={() => setListenMode("stereo")}>Stereo</button>
                <button className={listenMode === "mix" ? "active" : ""} onClick={() => setListenMode("mix")}>Mix</button>
                <button className={listenMode === "radio1" ? "active radio1-active" : ""} onClick={() => setListenMode("radio1")}>R1 solo</button>
              </div>
            </div>

            <div className="player-footer">
              <label>Speed<select value={speed} onChange={(event) => { const value = Number(event.target.value); setSpeed(value); if (audioRef.current) audioRef.current.playbackRate = value; }}><option value="0.75">0.75×</option><option value="1">1.00×</option><option value="1.25">1.25×</option><option value="1.5">1.50×</option><option value="2">2.00×</option></select></label>
              <span>44.1 kHz source · stereo</span>
            </div>
          </div>
        </aside>
      </div>

      <footer><strong>MB4X / WRTC 2026</strong><span>Log and synchronized stereo field recording</span><span>Times shown in UTC</span></footer>
    </main>
  );
}
