# Workflow: Sync Agenda

Refresh the running agenda mirror from Google Docs.

## Process

### 1. Read the agenda URL

Read `meetings/sources.txt` to find the agenda Google Doc URL (skip lines starting with `#`).

### 2. Download via gwt

```bash
gwt download "<url>" -f md -o meetings/agenda.md \
  --enable-frontmatter -m "type=running-agenda"
```

This overwrites the existing `meetings/agenda.md` with the latest content from Google Docs. The frontmatter includes the `source` URL and `synced_at` timestamp automatically.

### 3. Report changes

Run `git diff meetings/agenda.md` and summarize what changed since the last sync. If nothing changed, say so.

## Success Criteria

- [ ] `meetings/agenda.md` contains current content with frontmatter
- [ ] `synced_at` timestamp in frontmatter reflects the current sync time
- [ ] Changes (or lack thereof) reported to user
