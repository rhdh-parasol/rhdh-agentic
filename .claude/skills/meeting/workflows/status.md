# Workflow: Meeting Status

Show current meeting state: recent meetings, cross-meeting summary, and open action items.

## Input

```
/meeting status        → last 5 meetings (default)
/meeting status 3      → last 3 meetings
/meeting status 10     → last 10 meetings
```

The argument is an optional number controlling how many recent meetings to include. Default: **5**.

## Process

### 1. Recent Meetings

List files in `meetings/tldrs/` sorted by date (most recent first). For each of the last N meetings (N from input, default 5), read the TLDR and extract:

- Date
- Attendee count
- One-line summary (first bullet from Summary section)

### 2. Cross-Meeting Summary

Using the TLDRs read in step 1, synthesize a narrative summary that:

- Connects threads across meetings (e.g., a decision in one meeting leading to action in the next)
- Highlights the overall trajectory and momentum of the project during this window
- Calls out action items that were resolved during this period and what triggered their resolution
- Flags carried-forward items that remain open across multiple meetings (potential stalls)

Keep it to 1-2 paragraphs. This is synthesis, not concatenation — do not repeat individual meeting summaries.

### 3. Open Actions

Read `meetings/actions.md` and list all items under `## Open`, grouped by meeting date.

### 4. Agenda Status

Read `meetings/agenda.md` frontmatter to show when the agenda was last synced (`synced_at` field).

### 5. Present Dashboard

```
## Meeting Status

**Last sync:** YYYY-MM-DD HH:MM
**Covering:** N meetings (YYYY-MM-DD to YYYY-MM-DD)

### Project Pulse
<1-2 paragraph cross-meeting synthesis from step 2>

### Recent Meetings
| Date | Attendees | Summary |
|------|-----------|---------|
| ... | ... | ... |

### Open Actions (N)
- [ ] **Owner** -- action (from YYYY-MM-DD)
```

## Success Criteria

- [ ] Recent meetings listed with dates and summaries
- [ ] Cross-meeting synthesis captures trajectory and connections
- [ ] All open action items shown
- [ ] Last agenda sync time reported
