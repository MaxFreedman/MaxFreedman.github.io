#!/usr/bin/env python3
"""Estimate second-level QSO cue points from stereo receiver activity.

The Cabrillo file records only whole minutes. This script decodes the compact
stereo MP3s, measures half-second activity on each radio channel, and assigns
the contacts logged in each radio/minute to chronological activity-weighted
positions. The result is an estimate with an explicit confidence label, not a
claim that the original log contained seconds.
"""

from __future__ import annotations

import json
import math
import os
import struct
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "public" / "data" / "contacts.json"
MANIFEST_PATH = ROOT / "public" / "data" / "manifest.json"
CACHE_PATH = ROOT / ".analysis" / "audio-features-v1.npz"
SUMMARY_PATH = ROOT / "public" / "data" / "audio-analysis.json"
LAME = Path("/opt/homebrew/bin/lame")
WINDOW_SECONDS = 0.5
CACHE_VERSION = 1


def epoch(timestamp: str) -> float:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp()


def iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def decode_file_features(audio_path: Path, start_time: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    process = subprocess.Popen(
        [str(LAME), "--decode", "--silent", str(audio_path), "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    assert process.stdout is not None
    header = process.stdout.read(44)
    if len(header) != 44 or header[:4] != b"RIFF" or header[8:12] != b"WAVE":
        process.kill()
        raise RuntimeError(f"Unexpected decoder output for {audio_path.name}")

    channels = struct.unpack_from("<H", header, 22)[0]
    sample_rate = struct.unpack_from("<I", header, 24)[0]
    bits_per_sample = struct.unpack_from("<H", header, 34)[0]
    if channels != 2 or bits_per_sample != 16:
        process.kill()
        raise RuntimeError(f"Expected 16-bit stereo PCM, got {channels} channels / {bits_per_sample} bits")

    frames_per_window = round(sample_rate * WINDOW_SECONDS)
    bytes_per_window = frames_per_window * channels * 2
    times: list[float] = []
    levels: list[np.ndarray] = []
    crest_factors: list[np.ndarray] = []
    window_index = 0

    while True:
        raw = process.stdout.read(bytes_per_window)
        if not raw:
            break
        usable = len(raw) - (len(raw) % (channels * 2))
        if usable == 0:
            break
        samples = np.frombuffer(raw[:usable], dtype="<i2").reshape(-1, channels).astype(np.float32)
        rms = np.sqrt(np.mean(samples * samples, axis=0) + 1.0)
        peak = np.max(np.abs(samples), axis=0) + 1.0
        levels.append((20.0 * np.log10(rms)).astype(np.float32))
        crest_factors.append((peak / rms).astype(np.float32))
        center = start_time + window_index * WINDOW_SECONDS + (samples.shape[0] / sample_rate) / 2
        times.append(center)
        window_index += 1
        if len(raw) < bytes_per_window:
            break

    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"Decoder failed for {audio_path.name} with status {return_code}")
    return np.asarray(times, dtype=np.float64), np.asarray(levels, dtype=np.float32), np.asarray(crest_factors, dtype=np.float32)


def load_or_extract_features(manifest: dict) -> tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
    audio_paths = [ROOT / "public" / chunk["file"].lstrip("/") for chunk in manifest["chunks"]]
    mtimes = np.asarray([path.stat().st_mtime_ns for path in audio_paths], dtype=np.int64)
    if CACHE_PATH.exists():
        with np.load(CACHE_PATH) as cache:
            if (
                int(cache["version"][0]) == CACHE_VERSION
                and np.array_equal(cache["mtimes"], mtimes)
            ):
                return cache["times"], cache["levels"], cache["crest"], True

    all_times: list[np.ndarray] = []
    all_levels: list[np.ndarray] = []
    all_crest: list[np.ndarray] = []
    for chunk, audio_path in zip(manifest["chunks"], audio_paths, strict=True):
        print(f"[{chunk['id']}/8] Measuring {audio_path.name}", flush=True)
        times, levels, crest = decode_file_features(audio_path, epoch(chunk["start"]))
        all_times.append(times)
        all_levels.append(levels)
        all_crest.append(crest)

    times = np.concatenate(all_times)
    levels = np.concatenate(all_levels)
    crest = np.concatenate(all_crest)
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        CACHE_PATH,
        version=np.asarray([CACHE_VERSION], dtype=np.int16),
        mtimes=mtimes,
        times=times,
        levels=levels,
        crest=crest,
    )
    return times, levels, crest, False


def smooth(values: np.ndarray, width: int) -> np.ndarray:
    if len(values) < 2 or width <= 1:
        return values
    width = min(width, len(values))
    kernel = np.ones(width, dtype=np.float32) / width
    return np.convolve(values, kernel, mode="same")


def weighted_quantile_time(times: np.ndarray, weights: np.ndarray, quantile: float) -> float:
    total = float(np.sum(weights))
    if total <= 1e-8:
        return float(times[min(len(times) - 1, round(quantile * (len(times) - 1)))])
    cumulative = np.cumsum(weights)
    index = int(np.searchsorted(cumulative, quantile * total, side="left"))
    return float(times[min(index, len(times) - 1)])


def confidence_for(levels: np.ndarray, contact_count: int) -> tuple[float, str]:
    if len(levels) < 4:
        return 0.2, "low"
    dynamic_range = float(np.percentile(levels, 90) - np.percentile(levels, 20))
    score = 0.32 + min(0.43, dynamic_range / 18.0 * 0.43)
    score += 0.08 if contact_count <= 2 else 0.0
    score -= max(0, contact_count - 5) * 0.035
    score = min(0.92, max(0.2, score))
    label = "high" if score >= 0.72 else "medium" if score >= 0.48 else "low"
    return score, label


def channel_correlation(contacts: list[dict], manifest: dict, times: np.ndarray, levels: np.ndarray) -> dict:
    start = epoch(manifest["contestStart"])
    minute_count = round((epoch(manifest["contestEnd"]) - start) / 60)
    qso_counts = np.zeros((minute_count, 2), dtype=np.float32)
    audio_energy = np.zeros((minute_count, 2), dtype=np.float32)

    for contact in contacts:
        minute = int((epoch(contact["timestamp"]) - start) // 60)
        if 0 <= minute < minute_count:
            qso_counts[minute, int(contact["radio"])] += 1

    feature_minutes = ((times - start) // 60).astype(np.int32)
    for minute in range(minute_count):
        mask = feature_minutes == minute
        if np.any(mask):
            audio_energy[minute] = np.mean(levels[mask], axis=0)

    correlations = np.zeros((2, 2), dtype=np.float32)
    for radio in range(2):
        for channel in range(2):
            valid = np.isfinite(audio_energy[:, channel])
            if np.std(qso_counts[valid, radio]) > 0 and np.std(audio_energy[valid, channel]) > 0:
                correlations[radio, channel] = np.corrcoef(qso_counts[valid, radio], audio_energy[valid, channel])[0, 1]

    direct = float(correlations[0, 0] + correlations[1, 1])
    swapped = float(correlations[0, 1] + correlations[1, 0])
    return {
        "matrix": [[round(float(value), 4) for value in row] for row in correlations],
        "directScore": round(direct, 4),
        "swappedScore": round(swapped, 4),
        "suggestedMap": "direct" if direct >= swapped else "swapped",
        "strength": round(abs(direct - swapped), 4),
    }


def place_contacts(
    contacts: list[dict],
    manifest: dict,
    times: np.ndarray,
    levels: np.ndarray,
    crest: np.ndarray,
    channel_indices: dict[int, int],
) -> dict:
    groups: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for contact in contacts:
        groups[(contact["timestamp"], int(contact["radio"]))].append(contact)

    label_counts = defaultdict(int)
    mode_counts = defaultdict(int)
    offsets: list[float] = []

    for (minute_timestamp, radio), group in groups.items():
        minute_start = epoch(minute_timestamp)
        left = int(np.searchsorted(times, minute_start, side="left"))
        right = int(np.searchsorted(times, minute_start + 60, side="left"))
        if right - left < 4:
            for contact in group:
                contact["analysisConfidence"] = "unavailable"
            continue

        minute_times = times[left:right]
        channel = channel_indices[radio]
        minute_levels = levels[left:right, channel]
        minute_crest = crest[left:right, channel]
        dominant_mode = max({contact["mode"] for contact in group}, key=lambda mode: sum(c["mode"] == mode for c in group))
        smoothed = smooth(minute_levels, 2 if dominant_mode == "CW" else 4)
        baseline = float(np.percentile(smoothed, 18))
        activity = np.maximum(smoothed - baseline, 0.0)
        # Crest factor mildly favors intentional tones/voice over steady receiver noise.
        crest_weight = np.clip((minute_crest - 1.0) / 3.0, 0.65, 1.35)
        weights = np.power(activity + 0.08, 1.7) * crest_weight
        confidence, label = confidence_for(smoothed, len(group))

        previous = minute_start
        for index, contact in enumerate(group):
            quantile = (index + 0.5) / len(group)
            estimate = weighted_quantile_time(minute_times, weights, quantile)
            # Snap gently to the strongest nearby half-second without disturbing order.
            center_index = int(np.argmin(np.abs(minute_times - estimate)))
            radius = 3 if contact["mode"] == "CW" else 5
            local_left = max(0, center_index - radius)
            local_right = min(len(minute_times), center_index + radius + 1)
            local_index = local_left + int(np.argmax(weights[local_left:local_right]))
            estimate = float(minute_times[local_index])
            estimate = max(estimate, previous + 1.0)
            estimate = min(estimate, minute_start + 59.5)
            previous = estimate

            pre_roll = 4.0 if contact["mode"] == "CW" else 7.0
            cue_time = max(minute_start, estimate - pre_roll)
            contact["estimatedTimestamp"] = iso(estimate)
            contact["cueTimestamp"] = iso(cue_time)
            contact["estimatedSecond"] = round(estimate - minute_start, 1)
            contact["analysisConfidence"] = label
            contact["analysisScore"] = round(confidence, 2)
            contact["analysisMethod"] = "channel activity weighted within Cabrillo minute"
            offsets.append(estimate - minute_start)
            label_counts[label] += 1
            mode_counts[contact["mode"]] += 1

    return {
        "windowSeconds": WINDOW_SECONDS,
        "estimatedContacts": sum(label_counts.values()),
        "confidence": dict(label_counts),
        "byMode": dict(mode_counts),
        "medianEstimatedSecond": round(float(np.median(offsets)), 1) if offsets else None,
    }


def main() -> None:
    if not LAME.exists():
        raise SystemExit(f"lame decoder not found at {LAME}")
    contact_data = json.loads(DATA_PATH.read_text())
    manifest = json.loads(MANIFEST_PATH.read_text())
    contacts = contact_data["contacts"]
    times, levels, crest, cached = load_or_extract_features(manifest)
    print(f"Loaded {len(times):,} half-second stereo measurements" + (" from cache" if cached else ""), flush=True)

    channel_result = channel_correlation(contacts, manifest, times, levels)
    use_swapped_map = channel_result["suggestedMap"] == "swapped" and channel_result["strength"] >= 0.05
    channel_indices = {0: 1, 1: 0} if use_swapped_map else {0: 0, 1: 1}
    applied_channel_map = {"0": "right", "1": "left"} if use_swapped_map else {"0": "left", "1": "right"}
    placement_result = place_contacts(contacts, manifest, times, levels, crest, channel_indices)
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "stereo MP3 activity envelope",
        "channelCorrelation": channel_result,
        "appliedChannelMap": applied_channel_map,
        **placement_result,
        "limitations": [
            "Cabrillo timestamps contain minutes but no seconds.",
            "Estimates use channel activity and chronological log order; they do not decode Morse or speech.",
            "Cue timestamps include 4 seconds of CW pre-roll or 7 seconds of SSB pre-roll.",
        ],
    }
    contact_data["analysis"] = summary
    manifest["channelMap"] = applied_channel_map
    manifest["channelMapSource"] = "audio activity correlation"
    DATA_PATH.write_text(json.dumps(contact_data, separators=(",", ":")))
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    main()
