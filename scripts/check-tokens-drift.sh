#!/usr/bin/env bash
# design/tokens.json is the master for every app's design values (DS 2.0 § 5.1); norviq-ios keeps
# a byte-identical copy at financeplan/Design/tokens.json and generates its colour sets from it.
# This check fails if an iOS checkout is present ($TOKENS_IOS_DIR, or ../norviq-ios/financeplan)
# and its copy differs. It skips, with a notice, when there is no checkout or the checkout has no
# copy yet. CI has no iOS checkout, so in CI the cross-repo comparison belongs to norviq-ios (its
# web-main drift guard, like scripts/check-vig-motion-drift.sh there). Merge order for a token
# change: this repo first, then copy the file to iOS.
set -euo pipefail

cd "$(dirname "$0")/.."

canonical="design/tokens.json"
ios_dir="${TOKENS_IOS_DIR:-}"
if [ -z "$ios_dir" ] && [ -d ../norviq-ios/financeplan/financeplan ]; then
  ios_dir="../norviq-ios/financeplan"
fi
if [ -z "$ios_dir" ]; then
  echo "no norviq-ios checkout: skipping the tokens.json copy comparison"
  exit 0
fi

copy="$ios_dir/financeplan/Design/tokens.json"
if [ ! -f "$copy" ]; then
  echo "skip: $copy does not exist yet (iOS not on the tokens.json generator)"
  exit 0
fi
if ! cmp -s "$canonical" "$copy"; then
  echo "error: $copy differs from $canonical. cp $canonical $copy" >&2
  exit 1
fi
echo "ok: $copy == $canonical"
