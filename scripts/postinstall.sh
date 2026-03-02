#!/bin/sh
# Downloads static ffmpeg + ffprobe binaries for amd64 and arm64.
# Runs automatically via npm postinstall. Skips already-downloaded binaries.
# Source: https://github.com/BtbN/FFmpeg-Builds/releases (GPL static builds)

set -e

FFMPEG_MAJOR="7.1"
BASE_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest"

# Read DATA_DIR from .env if available (without sourcing the entire file for safety)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "$DATA_DIR" ] && [ -f "$PROJECT_DIR/.env" ]; then
  DATA_DIR="$(sed -n 's/^DATA_DIR=\([^# ]*\).*/\1/p' "$PROJECT_DIR/.env")"
fi

if [ -z "$DATA_DIR" ]; then
  echo "ERROR: DATA_DIR is not set. Set it in .env or as an environment variable."
  exit 1
fi
mkdir -p "$DATA_DIR"
BINS_DIR="$DATA_DIR/bins"

download_arch() {
  arch=$1
  target_dir="$BINS_DIR/$arch"

  # Skip if both binaries already exist
  if [ -f "$target_dir/ffmpeg" ] && [ -f "$target_dir/ffprobe" ]; then
    echo "ffmpeg/ffprobe already present for $arch — skipping"
    return
  fi

  case "$arch" in
    amd64) platform="linux64" ;;
    arm64) platform="linuxarm64" ;;
    *) echo "Unknown arch: $arch"; return 1 ;;
  esac

  archive="ffmpeg-n${FFMPEG_MAJOR}-latest-${platform}-gpl-${FFMPEG_MAJOR}.tar.xz"
  url="$BASE_URL/$archive"
  tmp="$(mktemp -d)"

  echo "Downloading ffmpeg $FFMPEG_MAJOR for $arch..."
  curl -fSL "$url" -o "$tmp/$archive"

  echo "Extracting..."
  mkdir -p "$target_dir"
  tar -xf "$tmp/$archive" -C "$tmp"

  # The archive extracts to a directory matching the archive name (minus .tar.xz)
  extracted_dir="$tmp/$(basename "$archive" .tar.xz)"
  cp "$extracted_dir/bin/ffmpeg" "$target_dir/ffmpeg"
  cp "$extracted_dir/bin/ffprobe" "$target_dir/ffprobe"
  chmod +x "$target_dir/ffmpeg" "$target_dir/ffprobe"

  rm -rf "$tmp"
  echo "Installed ffmpeg + ffprobe for $arch → $target_dir"
}

download_arch amd64
download_arch arm64
