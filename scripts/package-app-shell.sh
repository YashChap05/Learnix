#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/release"
PACKAGE_NAME="Learnix-App-Download.zip"

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_DIR/$PACKAGE_NAME"

cd "$ROOT_DIR"
zip -r "$OUTPUT_DIR/$PACKAGE_NAME" \
  package.json package-lock.json \
  src public electron scripts/package-app-shell.sh capacitor.config.ts docs/app-conversion-guide.md \
  -x "*/node_modules/*" "*/.git/*" "public/uploads/*" "release/*" >/dev/null

echo "Created $OUTPUT_DIR/$PACKAGE_NAME"
