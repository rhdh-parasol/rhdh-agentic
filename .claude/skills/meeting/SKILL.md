---
name: meeting
description: >
  Meeting operations: sync agenda mirror from Google Docs, process transcripts
  into TLDRs, extract action items. Use when the user invokes /meeting or asks
  about meeting notes, transcripts, summaries, or action items.
---

<essential_principles>

## How the Meeting Skill Works

This skill manages the wg-rhdh-agentic meeting lifecycle: syncing the shared
agenda from Google Docs, processing Google Meet transcripts (with Gemini
summaries) into curated TLDRs, and tracking action items across meetings.

### 1. gwt Is the Bridge

All Google Docs interaction uses the [`gwt` CLI](https://github.com/durandom/google-workspace-tools) (Google Workspace Tools).
No MCP servers or Google API credentials are needed beyond gwt's OAuth setup.
Install via `uv tool install git+https://github.com/durandom/google-workspace-tools.git` (requires >=0.4.0).
Use `gwt download` for single documents with explicit output paths.

### 2. Gemini Summaries Are a Starting Point

Google Meet auto-transcripts include Gemini-generated summaries. These are
useful but not gospel. Always verify claims against the raw transcript when
something seems off. Rewrite summaries for clarity — do not copy-paste.

### 3. Actions Must Have Owners

An action item without an owner is a wish. Extract owners from the transcript
("I will", "\<name\> will"). If no owner is identifiable, flag it explicitly
as **unassigned**.

### 4. Accuracy Over Invention

Do not invent facts, decisions, or action items. If something is ambiguous
in the transcript, note the ambiguity. Omit or generalize sensitive security
or customer details.

</essential_principles>

<intake>

**Determine the command from context:**

1. **Sync** — Refresh the agenda mirror from Google Docs
2. **Process** — Download and process a meeting transcript into a TLDR
3. **Status** — Show recent meetings and open action items

If the command isn't clear from the conversation, ask:
"Which command? (1) Sync agenda, (2) Process a transcript, (3) Show status."

**Wait for response before proceeding.**

</intake>

<routing>

| Signal | Workflow |
|--------|----------|
| "sync", "refresh", "update agenda" | `workflows/sync.md` |
| "process", "transcript", "TLDR", URL or file path | `workflows/process.md` |
| "status", "actions", "open items", "recent meetings" | `workflows/status.md` |

**After reading the workflow, follow it exactly.**

</routing>

<quick_reference>

## Key Paths

| Path | Purpose |
|------|---------|
| `meetings/sources.txt` | Agenda doc URL for gwt |
| `meetings/agenda.md` | Running agenda mirror (synced from Google Doc) |
| `meetings/log.md` | Accumulating meeting log (reverse-chronological) |
| `meetings/actions.md` | Open action items tracker |
| `meetings/transcripts/YYYY-MM-DD.md` | Raw Gemini transcript |
| `meetings/tldrs/YYYY-MM-DD.md` | Curated TLDR |

</quick_reference>

<workflows_index>

| Workflow | Purpose |
|----------|---------|
| `workflows/sync.md` | Refresh agenda mirror via gwt download |
| `workflows/process.md` | Transcript → TLDR + action items |
| `workflows/status.md` | Recent meetings + open actions dashboard |

</workflows_index>

<templates_index>

| Template | Used By | Purpose |
|----------|---------|---------|
| `templates/tldr.md` | Process | Per-meeting TLDR structure |
| `templates/log-entry.md` | Process | One-line entry for the running log |

</templates_index>
