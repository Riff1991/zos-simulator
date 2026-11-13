#!/usr/bin/env bash
# Sestaví balíček pro Mac: dist/zos-simulator-mac-v<VERZE>.zip
# Spouštět z kořene repozitáře po `python3 build.py`.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="$(cat VERSION)"
NAME="zos-simulator-mac-v${VERSION}"
OUT="dist/${NAME}"
rm -rf "$OUT" "dist/${NAME}.zip"
mkdir -p "$OUT"
cp -R site "$OUT/site"
cp packaging/mac/Nainstalovat-ZOS.command packaging/mac/README-MAC.txt CHANGELOG.md VERSION "$OUT/"
chmod +x "$OUT/Nainstalovat-ZOS.command"
(cd dist && zip -qry "${NAME}.zip" "${NAME}")
rm -rf "$OUT"
echo "dist/${NAME}.zip"
