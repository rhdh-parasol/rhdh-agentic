# Workflow: PRD Review — Architectural Readiness Assessment

<required_reading>
Read these files before proceeding:

1. `templates/prd-review.md` — the review template to fill
2. The PRD document under review
</required_reading>

## Step 1: Locate the PRD

1. If the user provided a PR number: `gh pr view <N> --json files` to find the PRD file, then fetch its content
2. If the user pointed to a file path: read it directly
3. If the PRD is in `specifications/prd/`: read it from there

## Step 2: Read Context

1. Check for a prior review — search for an existing PRD review (in issue comments, PR comments, or `specifications/`) to avoid duplicating work. If one exists, summarize what changed since the last review and focus the new review on those changes
2. Read existing ADRs in `specifications/adr/` — prior decisions constrain what new ADRs are needed
3. Read existing FSDs in `specifications/fsd/` — understand what specs have already been written

## Step 3: Assess Architectural Sufficiency

Read the PRD and assess whether it provides enough product context for the architect to begin ADR work. Focus on:

1. **Product intent** — Is the problem and mission clear enough to evaluate architectural alternatives against?
2. **Constraints** — Are non-negotiable product constraints stated (e.g., auth model, deployment target)?
3. **Boundaries** — Does the PRD say what it does NOT decide, so the architect knows what's theirs to resolve?

Ambiguity in the PRD is acceptable — PRDs are high-level documents. Only flag gaps that would force the architect to make **product decisions** disguised as technical ones.

## Step 4: Identify Blocking Gaps

A gap is blocking only if the architect cannot make a sound decision without the missing information. List what the PRD should clarify — be specific (not "add more detail" but "state whether the CLI must work offline or can assume always-online connectivity").

Most PRD ambiguity is fine. The architect's job is to resolve technical ambiguity; the PRD only needs to resolve **product** ambiguity.

## Step 5: Surface Assumptions

Identify product ambiguities that are **not blocking** but that the architect will resolve with a reasonable default during ADR work. For each, state:

1. The assumption the architect will make
2. The risk if that assumption turns out to be wrong

This gives the product owner a chance to correct assumptions before they get baked into ADRs.

## Step 6: Write the Review

1. Read `templates/prd-review.md`
2. Fill every section
3. Present the review to the user — do NOT commit to a file unless instructed

<success_criteria>

- [ ] PRD assessed for architectural sufficiency
- [ ] Blocking gaps identified (or explicitly stated as none)
- [ ] Assumptions surfaced for product owner to confirm or correct
- [ ] Verdict is READY or NOT READY
</success_criteria>
