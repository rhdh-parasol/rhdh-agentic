#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$SCRIPT_DIR"
REPO_ROOT="$SCRIPT_DIR/../.."
DATE=$(date +%Y-%m-%d)
RECORDING_DIR="$REPO_ROOT/demo/recordings/$DATE/catalog-agent"
SESSION_ID=""

mkdir -p "$RECORDING_DIR/turns"

# ── Helpers ──────────────────────────────────────────────────────────

log() { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
err() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

run_turn() {
  local turn_num="$1"
  local prompt="$2"
  local resume_flag=""

  if [[ -n "$SESSION_ID" ]]; then
    resume_flag="--resume $SESSION_ID"
  fi

  log "Turn $turn_num"
  printf '  Prompt: %s\n' "$prompt"

  local result
  result=$(cd "$DEMO_DIR" && claude -p "$prompt" \
    --output-format json \
    --dangerously-skip-permissions \
    $resume_flag 2>/dev/null)

  if [[ -z "$SESSION_ID" ]]; then
    SESSION_ID=$(echo "$result" | jq -r '.session_id')
    log "Session: $SESSION_ID"
  fi

  echo "$result" | jq -r '.result' > "$RECORDING_DIR/turns/turn-${turn_num}.txt"
  printf '  ✓ Saved to recordings/%s/catalog-agent/turns/turn-%s.txt\n' "$DATE" "$turn_num"
}

# ── Pre-flight ───────────────────────────────────────────────────────

if ! command -v claude &>/dev/null; then
  err "claude CLI not found — install Claude Code first"
fi

if ! curl -sf http://localhost:7007/.backstage/health/v1/readiness >/dev/null 2>&1; then
  err "Backstage not reachable at http://localhost:7007 — start RHDH first"
fi

log "Starting catalog-agent demo ($(date))"

# ── Turns ────────────────────────────────────────────────────────────

run_turn 1 \
  "I just joined the Claims team at Parasol Insurance. I need to build a payment reconciliation service. What domains and systems exist in our catalog? Where does my service fit?"

run_turn 2 \
  "Are there any governance rules or technology requirements for payment-related services? Check the domain handbooks."

run_turn 3 \
  "What existing services and APIs should my reconciliation service integrate with?"

run_turn 4 \
  "Which software template should I use? Show me what parameters it needs."

run_turn 5 \
  "Give me a Technology Decision Summary — every choice, which catalog source informed it, and any cross-domain conflicts."

# ── Post-run: find session JSONL and render transcript ───────────────

log "Rendering transcript"

PROJECTS_DIR="$HOME/.claude/projects"
SESSION_FILE=$(find "$PROJECTS_DIR" -name "${SESSION_ID}.jsonl" -type f 2>/dev/null | head -1)

if [[ -z "$SESSION_FILE" ]]; then
  err "Session file not found for $SESSION_ID — check ~/.claude/projects/"
fi

cp "$SESSION_FILE" "$RECORDING_DIR/session.jsonl"
log "Session archived to demo/recordings/$DATE/catalog-agent/session.jsonl"

# ── Render transcript into demo-transcripts submodule ────────────────

SUBMODULE_DIR="$REPO_ROOT/docs/demo-transcripts"
if [[ -d "$SUBMODULE_DIR/.git" ]] || [[ -f "$SUBMODULE_DIR/.git" ]]; then
  DEST="$SUBMODULE_DIR/$DATE/catalog-agent"
  mkdir -p "$DEST"
  if command -v uvx &>/dev/null; then
    uvx claude-code-transcripts json "$SESSION_FILE" -o "$DEST"
    log "Transcript rendered to docs/demo-transcripts/$DATE/catalog-agent/"
    printf '  Remember to commit the submodule update\n'
  else
    printf '  ⚠ uvx not found — skipping HTML render\n'
    printf '  Manual: uvx claude-code-transcripts json %s -o %s\n' "$SESSION_FILE" "$DEST"
  fi
else
  printf '  ℹ demo-transcripts submodule not found — skipping transcript render\n'
fi

log "Demo complete — session $SESSION_ID"
