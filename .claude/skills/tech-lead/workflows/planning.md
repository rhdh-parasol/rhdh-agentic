# Workflow: Planning — PRD to Epics

<required_reading>
Read these files before proceeding:

1. `templates/epic.md` — individual epic template
2. `templates/planning-summary.md` — planning overview template
</required_reading>

## Step 1: Read the PRD

1. Locate the PRD in `specifications/prd/`
2. Read the full PRD — understand the product's mission, goals, and success outcomes
3. Note the capability areas and product direction

## Step 2: Read Related Specifications

1. Check `specifications/fsd/` for existing FSDs related to this PRD
2. Check `specifications/adr/` for existing ADRs that constrain implementation
3. Note which capability areas have specs and which do not

## Step 3: Identify Capability Areas

From the PRD, identify the major capability areas that need implementation:

- Group related features that would naturally be built together
- Separate concerns that can be worked on independently
- Identify foundational work that other areas depend on

## Step 4: Flag Missing Specifications

For each capability area, determine if implementation can proceed:

- **Ready** — PRD provides enough context, or FSDs/ADRs already exist
- **Needs FSD** — the feature is complex enough to require a functional spec
- **Needs ADR** — there is an architectural decision that must be settled first

List missing specifications as prerequisites in the planning summary.

## Step 5: Decompose into Epics

For each capability area, create one or more epics. Each epic must be:

- **Self-contained** — a developer agent can implement it by reading only the epic
- **Bounded** — implementable in 1-3 agent sessions (context windows)
- **Independent** — minimal dependencies on other epics (or dependencies explicit)
- **Verifiable** — has acceptance criteria checkable by tests or review

If a capability area is too large for one epic, split it along natural seams.
If it is too small, merge with a related area.

## Step 6: Order by Dependency

1. Build the dependency graph — which epics must complete first?
2. Verify the graph is a DAG (no circular dependencies)
3. Identify parallelizable epics (no mutual dependencies)
4. Foundational epics first, then features that build on them

## Step 7: Write Epic Files

For each epic:

1. Read `templates/epic.md`
2. Fill every section — especially the Context section (front-load relevant
   information so the developer agent's context window is used efficiently)
3. Save to `specifications/epics/<prd-slug>/<epic-slug>.md`

## Step 8: Write Planning Summary

1. Read `templates/planning-summary.md`
2. Fill the epic inventory table with dependency information
3. Describe the dependency graph — what can run in parallel, what is sequential
4. List prerequisite specifications (missing FSDs/ADRs)
5. Save to `specifications/epics/<prd-slug>/README.md`

## Step 9: Commit

```bash
mkdir -p specifications/epics/<prd-slug>/
git add specifications/epics/<prd-slug>/
git commit -m "epics: plan implementation for <PRD name>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 10: Wait for Human Review

- **Approved**: Epics become the implementation plan
- **Revision needed**: Re-enter at Step 3 or Step 5 depending on feedback

<success_criteria>

- [ ] Every PRD capability area is covered by at least one epic
- [ ] Each epic is scoped for 1-3 agent sessions
- [ ] Each epic has all template sections filled (Goal, Context, Scope, Acceptance Criteria, Dependencies, Technical Notes)
- [ ] No circular dependencies between epics
- [ ] Dependencies on unwritten FSDs/ADRs are flagged in the planning summary
- [ ] Planning summary has complete epic inventory with dependency graph
- [ ] All epic files committed to the current branch
</success_criteria>
