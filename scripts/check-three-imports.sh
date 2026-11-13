#!/usr/bin/env bash
# BRD-001: three.js is imported in exactly one module, src/lib/vig3d/scene.ts, which is itself
# only ever loaded with a dynamic import. Anything else would pull three into a route or SSR.
set -euo pipefail
cd "$(dirname "$0")/.."
allowed="src/lib/vig3d/scene.ts"
hits=$(git grep -lE "(from|import)\s*\(?\s*['\"]three(/[^'\"]*)?['\"]" -- src | grep -vxF "$allowed" || true)
if [ -n "$hits" ]; then
  echo "error: three.js may only be imported by $allowed. Also imported by:" >&2
  echo "$hits" >&2
  exit 1
fi
static=$(git grep -lE "^\s*import\s[^(]*['\"][^'\"]*vig3d/scene(\.js)?['\"]" -- src | grep -v '\.test\.' || true)
if [ -n "$static" ]; then
  echo "error: $allowed must be loaded with a dynamic import(). Static imports in:" >&2
  echo "$static" >&2
  exit 1
fi
echo "three.js: imported only by $allowed, loaded dynamically"
