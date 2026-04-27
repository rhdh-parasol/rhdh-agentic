---
name: showboat
description: Convention for building a reproducible demo artifact co-located with each implementation spec, so acceptance has something concrete to read. The author builds the demo against a running instance during the implementation PR; the reviewer reads it during acceptance without re-executing. Triggers on "build demo", "acceptance demo", "showboat", or any spec-linked PR that needs a proof-of-work artifact.
---

<essential_principles>

## Scope

This skill encodes **repo-local conventions** for Showboat. It is
self-contained — it does not depend on any external recipe skill.

### What Showboat Is

Showboat is a CLI (`uvx showboat`) that builds Markdown "demo documents" that
interleave narrative, executable code blocks, and captured output. A demo
produced by Showboat is simultaneously a readable story and a reproducible
script. Think *lab notebook snapshot*: the author ran the commands, Showboat
captured their output verbatim, and the resulting file is committed as proof.

Core commands — **always run `showboat --help` for the authoritative
reference**, do not memorize flags:

- `showboat init <file> <title>` — start a new demo
- `showboat note <file> [text]` — append narrative text
- `showboat exec <file> <lang> [code]` — run a command and capture its output
- `showboat image <file> <path>` — embed an image
- `showboat pop <file>` — remove the last entry (use when a command errored)

Do not reproduce the full CLI reference here; `--help` is the single source
of truth and is written to be agent-readable.

### 1. One Demo Per Spec, Co-Located

Every implementation PR that closes a spec-linked issue commits a demo file
co-located with the spec it proves. The host skill (the agent persona that
invokes showboat) specifies the canonical demo path — follow that convention.
Side-by-side placement means a reviewer reads spec and proof in one directory.

### 2. Author Builds, Reviewer Reads

The author constructs the demo live against a running instance, captures real
output, commits the Markdown. **The reviewer does not re-execute.** They read
the file like a lab notebook during acceptance. Two reasons:

- **Environment independence** — the reviewer needs no runtime, no deploy
  step, no showboat install. They read markdown in the PR diff.
- **Determinism** — structured output typically contains timestamps and
  generated IDs that drift across runs. `showboat verify` would diff-fail
  on every re-run. We do not run verify on the critical path today.

### 3. Trust the Author at Commit Time

No automation re-executes the demo. The contract: **the author ran the
commands and committed the real captured output**. Hand-writing an output
block to hide a failure is a skill violation. If that trust ever needs
hardening, the path is a CI `showboat verify` job — which first requires
solving the determinism problem (output normalization or a reset subcommand
in the tool under test).

### 4. Demo Through the Project's Structured Surface

Prefer subcommands that emit structured output (JSONL or similar) over raw
database queries, raw runtime RPCs, or arbitrary shell. Structured output
is the stable substrate for demos and for any future `showboat verify`.

If you cannot demonstrate an acceptance criterion through the project's
instrumented CLI, that is a **missing subcommand in the project's
observability contract** — not a showboat problem. Stop, add the subcommand
in the same PR, then resume the demo.

### 5. One Section Per Acceptance Criterion

The narrative maps 1:1 to the spec's acceptance list. For every acceptance
criterion:

- One `showboat note` anchoring the criterion (heading + paraphrase)
- One or more `showboat exec` blocks producing evidence
- No criterion without evidence; no stray evidence without an anchor

This 1:1 mapping is what the reviewer reads. If a criterion can only be
validated by a unit test (no runtime surface), say so explicitly in a note
and link the test — do not silently skip it.

</essential_principles>

<intake>

Required inputs, supplied by the host skill:

- **Spec path** — the spec file whose acceptance criteria the demo will prove
- **Demo path** — the co-located output path convention (e.g. `<spec-dir>/<slug>.demo.md`)
- **Running instance** — the branch under review, deployed and reachable
- **Project CLI** — the instrumented subcommand surface the demo should use

If any is missing, stop and request it. Do not start a demo against stale code.

</intake>

<workflow>

1. **Discover.** Run `showboat --help`. This skill deliberately does not restate it.
2. **Deploy.** Ensure the current branch is live on a local instance (follow the project's deploy process).
3. **Init.** `showboat init <demo-path> "<spec title>"`.
4. **Anchor.** Add `showboat note` lines linking the spec path, the issue, and the PR.
5. **Baseline.** One `showboat exec` capturing the starting state via the project's status/inspect subcommand.
6. **Walk ACs.** For each acceptance criterion in the spec: a `note` with the AC heading, then `exec` block(s) triggering the behavior via the project's CLI, then an `exec` capturing evidence via a structured-output subcommand.
7. **Commit.** Add the demo file to the PR diff. Reference its path in the PR body per the host skill's template.

</workflow>

<success_criteria>

- [ ] File exists at the demo path specified by the host skill
- [ ] File opens with a link back to the spec and the issue/PR numbers
- [ ] Every acceptance criterion in the spec has a matching `note` + `exec` section
- [ ] Evidence commands use the project's structured-output subcommands wherever possible
- [ ] Output blocks are real captured output (no hand-edited content)
- [ ] PR body links to the demo file

</success_criteria>

<references_index>

| Reference | Purpose |
|-----------|---------|
| `showboat --help` | Authoritative CLI reference — run it, do not memorize flags |
| Host project's observability contract | The structured-output surface demos ride on — the host skill identifies the specific document |
| Host skill's implementation workflow | Where demo construction is sequenced — the host skill identifies the specific step |

</references_index>
