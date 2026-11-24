#!/usr/bin/env bash
# design/tokens.json is the master for every app's design values (DS 2.0 § 5.1); norviq-ios keeps
# a byte-identical copy at financeplan/Design/tokens.json and generates its colour sets from it.
# With $TOKENS_IOS_DIR set, the copy there must exist and match: a missing or differing copy fails.
# Without it, the default checkout ../norviq-ios/financeplan is compared when it has a copy; when
# that checkout or its copy is absent, the check skips with a notice. CI has no iOS checkout, so in CI the cross-repo comparison belongs to norviq-ios (its
# web-main drift guard, like scripts/check-vig-motion-drift.sh there). Merge order for a token
# change: this repo first, then copy the file to iOS.
set -euo pipefail

cd "$(dirname "$0")/.."

canonical="design/tokens.json"
ios_dir="${TOKENS_IOS_DIR:-}"
explicit=1
if [ -z "$ios_dir" ]; then
  explicit=0
  if [ ! -d ../norviq-ios/financeplan/financeplan ]; then
    echo "no norviq-ios checkout: skipping the tokens.json copy comparison"
    exit 0
  fi
  ios_dir="../norviq-ios/financeplan"
fi

copy="$ios_dir/financeplan/Design/tokens.json"
if [ ! -f "$copy" ]; then
  if [ "$explicit" = 1 ]; then
    echo "error: $copy is missing (TOKENS_IOS_DIR=$ios_dir). cp $canonical $copy" >&2
    exit 1
  fi
  echo "skip: $copy does not exist yet (iOS not on the tokens.json generator)"
  exit 0
fi
if ! cmp -s "$canonical" "$copy"; then
  echo "error: $copy differs from $canonical. cp $canonical $copy" >&2
  exit 1
fi
echo "ok: $copy == $canonical"
