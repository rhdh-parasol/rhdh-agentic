# Capability spec — read-mostly canon

Workflow and validator: [`../README.md`](../README.md), [`../schemas/rhdh-spec-driven/schema.yaml`](../schemas/rhdh-spec-driven/schema.yaml).

## Don't hand-edit `spec.md`

`spec.md` is synced output of `openspec archive <change-name>`. Direct edits get clobbered by the next archive and skip validator review. Open a change instead — even a small one. Delta shapes (`ADDED` / `MODIFIED` / `REMOVED Requirements`) are defined in the schema.

## Tense

Files here describe the system **as it is today**. Present tense. Git is the history — no `Change Log` tables, no inline "Update 2026-Q3:" notes.

## File shape

- **`spec.md`** — required. Validator-parsed contract. *Synced; do not hand-edit.*
- **`architecture.md`** — optional. Present-tense schemas / invariants / internal interfaces. *Hand-edited*, usually as part of a change's tasks. Opens with a short prose forward-pointer naming the primary binding ADR(s) — e.g. *"This doc is the live shape of the X capability; the binding decisions are recorded in [ADR-NNNN](...)."* Cite further ADRs inline where their rationale is load-bearing for a specific section. No header-block list of "Binding ADRs:" — that pattern was retired (rots faster than prose; duplicates inline citations). Closes the loop with the ADR forward pointer (see [`../../specifications/adr/`](../../specifications/adr/)).
- **`demo.md`** — optional. Worked example for acceptance review, hand-edited via the `showboat` skill.

## What does NOT live here

| Content | Goes to |
|---|---|
| Decisions, rationale, alternatives | `specifications/adr/` |
| Future product intent | `specifications/prd/` |
| In-flight proposals / delta specs | `openspec/changes/<change-name>/` |
| Historical FSDs | `specifications/fsd/` (legacy) |

## What earns a `<capability>/` directory

Vertical features with persistent contracts and cross-cutting contracts (observability, client protocol). Pure platform/runtime/policy decisions stay ADR-only. When in doubt, stay out — ADRs are cheaper than a mutable surface that has to be maintained forever.
