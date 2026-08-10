#!/bin/zsh
set -euo pipefail

project_dir="${0:A:h:h}"
download_dir="${1:-/Users/maxfreedman/Downloads}"
output_dir="$project_dir/public/audio"
mkdir -p "$output_dir"

zips=(001 005 003 002 006 007 004 003)

for index in {1..8}; do
  padded=$(printf '%02d' "$index")
  zip_suffix="${zips[$index]}"
  archive="$download_dir/Audio-20260810T040159Z-1-$zip_suffix.zip"
  entry="Audio/ZOOM0002_Tr12-$(printf '%04d' "$index").WAV"
  output="$output_dir/recording-$padded.mp3"

  if [[ -s "$output" ]]; then
    echo "[$index/8] recording-$padded.mp3 already exists"
    continue
  fi

  echo "[$index/8] Compressing $entry"
  unzip -p "$archive" "$entry" | /opt/homebrew/bin/lame --silent -h --resample 22.05 -b 48 -m s - "$output"
done

echo "Audio preparation complete."
