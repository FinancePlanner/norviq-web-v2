#!/usr/bin/env bash
# Lays the built 3D Vig out as cdn.norviq.org serves it (BRD-001, cdn/README.md).
#   scripts/brand/vig_cdn_layout.sh <version>
# Copies scripts/brand/out/vig-3d/{vig.glb,vig-model.json,vig-poster.png,Vig.usdz} to
# scripts/brand/out/cdn/vig/v<version>/ and cdn/_headers to the set's root. Never overwrites
# an existing version: a new cut is a new path. Vig.usdz is for iOS Beta builds, which fetch
# it with norviq-ios scripts/fetch-vig-model.sh (sha256-pinned) instead of keeping it in git.
set -euo pipefail
cd "$(dirname "$0")/../.."

version="${1:-}"
[[ "$version" =~ ^[1-9][0-9]*$ ]] || { echo "usage: $0 <version number>" >&2; exit 2; }

src=scripts/brand/out/vig-3d
dest="scripts/brand/out/cdn/vig/v$version"
for f in vig.glb vig-model.json vig-poster.png Vig.usdz; do
	[[ -f "$src/$f" ]] || { echo "vig-cdn: $src/$f is missing; run vig_3d.py first" >&2; exit 1; }
done
if [[ -e "$dest" ]]; then
	echo "vig-cdn: $dest exists; a new cut needs a new version" >&2
	exit 1
fi

mkdir -p "$dest"
cp "$src/vig.glb" "$src/vig-model.json" "$src/vig-poster.png" "$src/Vig.usdz" "$dest/"
cp cdn/_headers scripts/brand/out/cdn/_headers
echo "vig-cdn: laid out $dest"
ls -l "$dest"
