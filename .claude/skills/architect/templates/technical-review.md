## Technical Design Review

**PR:** #{{pr-number}}
**Issue:** #{{issue-number}}
**FSD:** [`specifications/fsd/{{domain}}/{{feature}}.md`]({{link}})
**ADRs checked:** {{#N, #M, ...}}

---

### ADR Compliance

{{For each relevant ADR decision:}}

- [x] ADR #{{N}} D-{{X}} ({{decision summary}}) — **compliant** ({{evidence}})
- [ ] ADR #{{N}} D-{{X}} ({{decision summary}}) — **non-compliant** ({{what's wrong, where}})

### Structural Assessment

- **Module boundaries:** {{OK | concern: description}}
- **Data model:** {{OK | concern: mismatched type/field vs FSD spec}}
- **API surface:** {{OK | concern: signature mismatch}}
- **Error handling:** {{OK | concern: missing error case}}
- **Platform constraints:** {{OK | concern: violates documented constraint}}

### Architectural Drift

{{Changes that don't violate a specific ADR but introduce structural problems:}}

- {{Drift concern, or "None detected"}}

### Verdict: {{APPROVE | REQUEST CHANGES}}

### Feedback

{{If REQUEST CHANGES: specific items with file/line references.}}
{{If APPROVE: "None — implementation is architecturally sound."}}
