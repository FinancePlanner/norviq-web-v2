#!/usr/bin/env bash
#
# Norviq MCP installer.
#
#   curl -fsSL https://norviq.org/install.sh | NORVIQ_TOKEN="nvq_pat_…" bash
#
# Registers Norviq's remote MCP server with whichever supported agents are
# installed on this machine. It writes config files and nothing else: no
# binary is downloaded, no package is installed, no service is started.
#
# The token is read from the environment only, never from a positional
# argument, because arguments are visible in shell history and in `ps` output.

set -euo pipefail

readonly DEFAULT_ENDPOINT="https://mcp.norviq.org/mcp"
ENDPOINT="${NORVIQ_ENDPOINT:-$DEFAULT_ENDPOINT}"
TOKEN="${NORVIQ_TOKEN:-}"

# Collected for the summary printed at the end, so the script never touches a
# file without saying so.
WROTE=()
SKIPPED=()

die() {
  printf 'norviq: %s\n' "$1" >&2
  exit 1
}

if [ -z "$TOKEN" ]; then
  die 'NORVIQ_TOKEN is not set.

Create a token at https://norviq.org/settings/api-access, then run:

  curl -fsSL https://norviq.org/install.sh | NORVIQ_TOKEN="nvq_pat_…" bash'
fi

case "$ENDPOINT" in
  https://*) ;;
  *) die "NORVIQ_ENDPOINT must be an https URL, got: $ENDPOINT" ;;
esac

# Back up before every write. Same suffix each time so repeat runs keep exactly
# one backup rather than accumulating a pile of them.
backup() {
  local file="$1"
  [ -f "$file" ] || return 0
  cp "$file" "$file.norviq.bak"
}

manual_json_snippet() {
  cat <<EOF

Add this to $1 by hand:

  "mcpServers": {
    "norviq": {
      "type": "http",
      "url": "$ENDPOINT",
      "headers": { "Authorization": "Bearer \$NORVIQ_TOKEN" }
    }
  }
EOF
}

# --- Claude Code -------------------------------------------------------------
# Prefer the CLI: it owns the config format and will keep working if that
# format changes. Fall back to editing ~/.claude.json directly.
install_claude_code() {
  if command -v claude >/dev/null 2>&1; then
    backup "$HOME/.claude.json"
    # --scope user is load-bearing: the default scope is the *current project*,
    # which would make Norviq available only in the directory this script
    # happened to run from.
    #
    # `claude mcp add` errors when the server already exists, so remove first.
    # The removal is expected to fail on a clean machine; that is not an error.
    claude mcp remove --scope user norviq >/dev/null 2>&1 || true
    if claude mcp add --scope user --transport http norviq "$ENDPOINT" \
        --header "Authorization: Bearer $TOKEN" >/dev/null 2>&1; then
      WROTE+=("claude mcp add --scope user norviq  (via claude CLI)")
      return 0
    fi
  fi

  local config="$HOME/.claude.json"
  [ -f "$config" ] || { SKIPPED+=("Claude Code not found"); return 0; }

  if ! command -v jq >/dev/null 2>&1; then
    SKIPPED+=("Claude Code — jq not installed")
    manual_json_snippet "$config"
    return 0
  fi

  backup "$config"
  local tmp
  tmp="$(mktemp)"
  # --arg keeps the token out of the jq program text, so it cannot be
  # reinterpreted as jq syntax.
  jq --arg url "$ENDPOINT" --arg auth "Bearer $TOKEN" \
    '.mcpServers.norviq = {type: "http", url: $url, headers: {Authorization: $auth}}' \
    "$config" > "$tmp" && mv "$tmp" "$config"
  WROTE+=("$config  + mcpServers.norviq")
}

# --- Codex -------------------------------------------------------------------
# Codex reads TOML. Rewrite any existing [mcp_servers.norviq] block rather than
# appending a duplicate, so re-running is idempotent.
install_codex() {
  local config="$HOME/.codex/config.toml"
  [ -f "$config" ] || { SKIPPED+=("Codex not found"); return 0; }

  backup "$config"
  local tmp
  tmp="$(mktemp)"
  # Drop any existing norviq block, then trim trailing blank lines so repeat
  # runs do not accumulate whitespace before the block we append.
  awk '
    /^\[mcp_servers\.norviq\]/ { skip = 1; next }
    /^\[/ { skip = 0 }
    !skip { print }
  ' "$config" | awk '
    /^[[:space:]]*$/ { blanks = blanks $0 "\n"; next }
    { printf "%s", blanks; blanks = ""; print }
  ' > "$tmp"

  {
    printf '\n[mcp_servers.norviq]\n'
    printf 'url = "%s"\n' "$ENDPOINT"
    printf 'http_headers = { Authorization = "Bearer %s" }\n' "$TOKEN"
  } >> "$tmp"

  mv "$tmp" "$config"
  WROTE+=("$config  + [mcp_servers.norviq]")
}

# --- Hermes ------------------------------------------------------------------
# Hermes edits are privileged and profile-specific, so print the command
# instead of running it. Piping a script into bash should not silently sudo.
install_hermes() {
  if ! command -v hermes >/dev/null 2>&1; then
    SKIPPED+=("Hermes not found")
    return 0
  fi
  cat <<EOF

Hermes found. Run this yourself (it needs sudo and your profile name):

  sudo hermes --profile mac-mcp mcp add norviq \\
    --url $ENDPOINT \\
    --auth header
  # Header: Authorization = Bearer \$NORVIQ_TOKEN
  sudo hermes --profile mac-mcp mcp test norviq
EOF
  SKIPPED+=("Hermes — command printed above, not run")
}

install_claude_code
install_codex
install_hermes

printf '\nnorviq: done.\n'
for line in "${WROTE[@]:-}"; do
  [ -n "$line" ] && printf '  wrote   %s\n' "$line"
done
for line in "${SKIPPED[@]:-}"; do
  [ -n "$line" ] && printf '  skipped %s\n' "$line"
done

if [ "${#WROTE[@]}" -eq 0 ]; then
  printf '\nNothing was changed. No supported agent was found on this machine.\n'
  exit 0
fi

printf '\nVerify with: claude mcp list\n'
printf 'Backups of every file changed are alongside them as *.norviq.bak\n'
