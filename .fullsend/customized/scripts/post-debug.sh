#!/usr/bin/env bash
# post-debug.sh — Post debug agent diagnostics as an issue comment.
#
# Runs on the trusted runner after sandbox cleanup. The agent's transcript
# is in output.jsonl — we extract the final assistant message (the summary)
# and post it as a comment on the triggering issue.
#
# SECURITY: Agent output is untrusted. We:
#   - Extract text via jq (no shell eval of agent strings)
#   - Truncate to a safe length (prevent comment-bomb)
#   - Post via --body-file - (no shell interpolation)
#   - Validate ISSUE_NUMBER is numeric
#   - Validate REPO_FULL_NAME matches owner/repo pattern

set -euo pipefail

# --- Validate inputs ---

if [[ ! "${ISSUE_NUMBER:-}" =~ ^[0-9]+$ ]]; then
  echo "ISSUE_NUMBER is not set or not numeric: '${ISSUE_NUMBER:-}'"
  echo "Skipping comment post (no issue to comment on)."
  exit 0
fi

if [[ ! "${REPO_FULL_NAME:-}" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$ ]]; then
  echo "REPO_FULL_NAME is not set or invalid: '${REPO_FULL_NAME:-}'"
  exit 1
fi

# --- Find the output file ---

OUTPUT_FILE=""
for dir in iteration-*/; do
  if [[ -f "${dir}/output.jsonl" ]]; then
    OUTPUT_FILE="${dir}/output.jsonl"
  fi
done

if [[ -z "${OUTPUT_FILE}" ]]; then
  echo "WARNING: output.jsonl not found — agent may have crashed before producing output"
  BODY="⚠️ Debug agent produced no output. Check the [workflow run](${RUN_URL:-}) for logs."
  printf '%s' "${BODY}" | gh issue comment "${ISSUE_NUMBER}" --repo "${REPO_FULL_NAME}" --body-file -
  exit 0
fi

echo "Reading agent output from: ${OUTPUT_FILE}"

# --- Extract the last assistant text block ---
#
# The agent's final message is the diagnostic summary. We extract all
# assistant text blocks and take the last one. jq handles the JSON
# parsing — no shell eval of agent strings.

SUMMARY=$(jq -r '
  select(.type == "assistant")
  | .message.content[]?
  | select(.type == "text")
  | .text
' "${OUTPUT_FILE}" | tail -n 200)

if [[ -z "${SUMMARY}" ]]; then
  echo "WARNING: No assistant text found in output.jsonl"
  SUMMARY="⚠️ Debug agent ran but produced no text output."
fi

# Truncate to 60000 chars (GitHub comment limit is 65536).
SUMMARY="${SUMMARY:0:60000}"

# --- Build and post the comment ---

COMMENT="<!-- fullsend:debug-agent -->
## 🔍 Sandbox Diagnostics

${SUMMARY}

---
<sub>Posted by debug agent · [Run logs](${RUN_URL:-})</sub>"

printf '%s' "${COMMENT}" | gh issue comment "${ISSUE_NUMBER}" --repo "${REPO_FULL_NAME}" --body-file -

echo "Debug results posted to ${REPO_FULL_NAME}#${ISSUE_NUMBER}"
