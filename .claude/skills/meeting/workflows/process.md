# Workflow: Process Transcript

Download a meeting transcript, generate a curated TLDR, and extract action items.

## Input

```
/meeting process <google-doc-url-or-local-path>
```

Accepts either:

- A Google Doc URL (downloads via gwt)
- A local file path (skips download, processes directly)

## Process

### 1. Fetch and Store Transcript

**If input is a URL:**

Download the transcript and store it locally with a dated filename:

```bash
gwt download "<url>" -f md -o meetings/transcripts/YYYY-MM-DD.md \
  --enable-frontmatter -m "type=meeting-transcript" -m "date=YYYY-MM-DD"
```

Determine the date from the transcript content (look for the date header near the top, e.g., "Apr 9, 2026"). Convert to ISO format for the filename.

If a file already exists for that date, append a suffix: `YYYY-MM-DD-2.md`.

**If input is a local path:**

Read the file directly. If it lacks frontmatter, note this but proceed. Extract the date from the content.

### 2. Refresh Agenda Mirror

Read `meetings/sources.txt` for the agenda URL, then:

```bash
gwt download "<agenda-url>" -f md -o meetings/agenda.md \
  --enable-frontmatter -m "type=running-agenda"
```

### 3. Parse the Transcript

Google Meet transcripts with Gemini notes follow this structure:

```
Notes
<date>
## <meeting title>
Invited [...]
Attachments [...]
Meeting records [...]

### Summary
<AI-generated thematic summary with sub-sections>

### Details
<Detailed bullet points with timestamp anchors>

### Suggested next steps
<Action items identified by Gemini>

Transcript
<date>
## <meeting title> - Transcript
### <timestamp>
<speaker>: <text>
```

Extract from each section:

- **Date** -- from the header
- **Attendees** -- from the "Invited" line (names only, strip email addresses)
- **Recording/Transcript links** -- from "Meeting records" and "Attachments"
- **Summary themes** -- from the "Summary" section sub-headings
- **Details with timestamps** -- from the "Details" section
- **Gemini-suggested next steps** -- from "Suggested next steps"
- **Raw transcript** -- from the "Transcript" section (use for verification and deeper extraction)

If the transcript format differs from expected (no Gemini summary, different layout), adapt gracefully and note what was different.

### 4. Analyze and Extract

**a) Summary:**
Rewrite Gemini's summary into 3-5 concise bullet points. These should be editorially curated -- not a copy-paste. Verify against the raw transcript when claims seem off.

**b) Decisions:**
Identify explicit decisions. Look for phrases like "we agreed", "let's do", "the decision is", "we'll go with", consensus moments. Classify each as:

- **Decided** -- clear agreement reached
- **Deferred** -- explicitly postponed ("let's revisit", "not yet", "next time")

**c) Action Items:**
Extract from two sources:

- Gemini's "Suggested next steps" section
- Explicit commitments in the raw transcript ("I will", "I'll take that", "\<name\> will")
- Assign owner where identifiable from context
- Mark as **unassigned** if no owner is identifiable

### 5. Write TLDR

Read `templates/tldr.md` for the output format.

Write the curated TLDR to `meetings/tldrs/YYYY-MM-DD.md`.

Include the Google Doc URL (if available) and the local transcript path as links.

### 6. Update Meeting Log

Read `meetings/log.md`.

Prepend a new entry (reverse-chronological order) after the `---` separator, using the format from `templates/log-entry.md`.

### 7. Update Actions Tracker

Read `meetings/actions.md`.

- Add new action items under the `## Open` section, prefixed with the meeting date
- If this meeting discussed or resolved prior actions (check the transcript for references to previous commitments), move them from `## Open` to `## Resolved` with the resolution date

### 8. Output Summary

Present a summary to the user:

```
Transcript: meetings/transcripts/YYYY-MM-DD.md
TLDR:       meetings/tldrs/YYYY-MM-DD.md
Actions:    N new, M resolved

### New Action Items
- [ ] **Owner** -- action

### Resolved Items
- [x] **Owner** -- action (from YYYY-MM-DD)
```

## Guidelines

- Do not invent facts. If a topic or decision is ambiguous in the transcript, note the ambiguity.
- Omit or generalize sensitive security or customer details.
- The Gemini summary is a starting point, not gospel -- verify claims against the raw transcript when they seem off.
- Do not reproduce large blocks of transcript text in the TLDR.

## Success Criteria

- [ ] Transcript stored at `meetings/transcripts/YYYY-MM-DD.md`
- [ ] Agenda mirror refreshed at `meetings/agenda.md`
- [ ] TLDR written to `meetings/tldrs/YYYY-MM-DD.md`
- [ ] Log entry prepended to `meetings/log.md`
- [ ] Actions updated in `meetings/actions.md`
- [ ] Output summary shown to user
