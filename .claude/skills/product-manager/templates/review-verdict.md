## Product Review: {{Feature Name}}

**FSD:** [`specifications/fsd/{{domain}}/{{feature}}.md`]({{link}})
**PR:** #{{pr-number}}
**Issue:** #{{issue-number}}

---

## Verdict: {{ACCEPT | REJECT}}

## Criteria Check

{{List every acceptance criterion from the FSD}}

- [x] {{Criterion 1}} — **MET** (evidence: {{file/function/test}})
- [ ] {{Criterion 2}} — **NOT MET** (reason: {{specific gap}})

## Scope Check

{{List any changes in the PR not covered by the FSD}}

- Scope drift: {{none detected | list of unasked-for changes with file paths}}

## Edge Cases

{{From the FSD's edge cases or validation section}}

- [x] {{Edge case 1}} — tested ({{test name/file}})
- [ ] {{Edge case 2}} — not tested

## Test Coverage

- CI status: {{passing | failing}}
- FSD validation scenarios covered: {{X of Y}}

## Feedback

{{If REJECT: specific, actionable feedback for the developer. Reference exact criteria not met.}}
{{If ACCEPT: "None — all criteria met."}}
