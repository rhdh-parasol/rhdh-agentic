# Workflow: Meeting Status

Show current meeting state: recent meetings and open action items.

## Process

### 1. Recent Meetings

List files in `meetings/tldrs/` sorted by date (most recent first). For each of the last 5 meetings, read the TLDR and extract:

- Date
- Attendee count
- One-line summary (first bullet from Summary section)

### 2. Open Actions

Read `meetings/actions.md` and list all items under `## Open`, grouped by meeting date.

### 3. Agenda Status

Read `meetings/agenda.md` frontmatter to show when the agenda was last synced (`synced_at` field).

### 4. Present Dashboard

```
## Meeting Status

**Last sync:** YYYY-MM-DD HH:MM

### Recent Meetings
| Date | Attendees | Summary |
|------|-----------|---------|
| ... | ... | ... |

### Open Actions (N)
- [ ] **Owner** -- action (from YYYY-MM-DD)
```

## Success Criteria

- [ ] Recent meetings listed with dates and summaries
- [ ] All open action items shown
- [ ] Last agenda sync time reported
