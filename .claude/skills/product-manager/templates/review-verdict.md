## Product Review: {{Feature Name}}

**PRD:** [`specifications/prd/{{product-name}}.md`]({{link}})
**PR:** #{{pr-number}}

---

## Verdict: {{ACCEPT | REJECT}}

## PRD Goals Check

{{List every relevant PRD goal or user story this PR addresses}}

- [x] {{Goal/User Story 1}} — **MET** (evidence: {{file/function/behavior}})
- [ ] {{Goal/User Story 2}} — **NOT MET** (reason: {{specific gap}})

## Product Scope Check

{{List any changes in the PR not serving a PRD goal}}

- Scope drift: {{none detected | list of changes outside product direction}}

## User-Facing Quality

- Target user benefit: {{does this deliver value to the PRD's target user?}}
- Error handling: {{are user-visible errors reasonable?}}
- CI status: {{passing | failing}}

## Feedback

{{If REJECT: specific, actionable feedback for the developer. Reference exact PRD goals not met.}}
{{If ACCEPT: "None — all product goals met."}}
