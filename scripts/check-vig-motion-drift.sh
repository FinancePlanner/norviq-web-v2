#!/usr/bin/env bash
# The 3D Vig motion data (BRD-001) is canonical here, in design/. This check fails if:
#   - design/vig-motion.fixtures.json is stale (not what scripts/brand/vig_motion_fixtures.py writes);
#   - an iOS checkout is present ($VIG_IOS_DIR, or ../norviq-ios/financeplan) and its copies differ
#     or are missing.
# CI has no iOS checkout, so there it only checks the fixtures; norviq-ios CI compares its copies
# against this repo's main and fails on drift. Merge order for a motion change: this repo first.
set -euo pipefail

cd "$(dirname "$0")/.."

python3 -I scripts/brand/vig_motion_fixtures.py --check

ios_dir="${VIG_IOS_DIR:-}"
if [ -z "$ios_dir" ] && [ -d ../norviq-ios/financeplan/financeplan ]; then
  ios_dir="../norviq-ios/financeplan"
fi
if [ -z "$ios_dir" ]; then
  echo "no norviq-ios checkout: copies are checked by norviq-ios CI"
  exit 0
fi

status=0
for pair in \
  "design/vig-motion.json:financeplan/Design/vig-motion.json" \
  "design/vig-motion.fixtures.json:financeplanTests/vig-motion.fixtures.json"; do
  canonical="${pair%%:*}"
  copy="$ios_dir/${pair##*:}"
  if [ ! -f "$copy" ]; then
    echo "error: $copy is missing. cp $canonical $copy" >&2
    status=1
  elif ! cmp -s "$canonical" "$copy"; then
    echo "error: $copy differs from $canonical. cp $canonical $copy" >&2
    status=1
  else
    echo "ok: $copy == $canonical"
  fi
done
exit $status
