# DevRel Workflow

A small, deterministic, local-only tool for turning an **already approved**
engineering milestone into reviewable public-content drafts (a development
log entry, a LinkedIn draft, and release notes).

Nothing in this folder publishes anything. It only writes Markdown files to
disk for a human to read, edit, and post manually.

## The workflow

```
Capture  ->  Validate  ->  Generate  ->  Human review  ->  Publish
```

1. **Capture** - After a milestone is done and approved in the normal
   engineering workflow (see the root `AGENTS.md`), copy
   `devrel/templates/milestone.yml` into `devrel/inbox/` as
   `milestone-<slug>.yml` and fill it in with verified facts only: what was
   implemented, what a user would notice, what commands were run and their
   real results, what's still missing, and any real screenshot/video paths.
   Do not write down anything you haven't checked (`git log`, `git status`,
   actual test/build output).

2. **Validate** - Run the validator against that file. It checks required
   fields, basic types, and that every screenshot/video path actually
   exists. It never modifies anything and exits non-zero on any problem.

   ```
   npm run devrel:validate -- devrel/inbox/milestone-<slug>.yml
   ```

3. **Generate** - Once validation passes, generate drafts. The generator
   re-validates internally and refuses to run on an invalid handoff.

   ```
   npm run devrel:generate -- devrel/inbox/milestone-<slug>.yml
   ```

   This writes three Markdown files (named `<milestone_id>.md`) into the
   folders configured in `devrel/config.yml`:

   - `devrel/development-logs/`
   - `devrel/linkedin/`
   - `devrel/release-notes/`

   Generation is deterministic: running it twice on the same handoff
   produces identical output. It only reorganizes facts already present in
   the handoff and `devrel/config.yml` - it never invents metrics, technical
   behavior, or outcomes, and it never removes a known limitation.

4. **Human review** - Every generated file starts with an HTML comment
   marking it as generated and unpublished. Read it, cut anything that
   doesn't sound right, fill in the actual portfolio URL if you use it, and
   check it against `devrel/config.yml`'s `claims_to_avoid` list (also
   echoed as a reviewer checklist inside the LinkedIn draft itself).

   **Known limitations must stay in the draft unless you, a human, decide to
   remove or reword them.** The tooling will not do this for you.

5. **Publish** - Manually, on whatever platform you choose. This tooling has
   no publishing integration and never will as part of this workflow.

## Creating a handoff

```
cp devrel/templates/milestone.yml devrel/inbox/milestone-my-feature.yml
# edit it with real facts
npm run devrel:validate -- devrel/inbox/milestone-my-feature.yml
npm run devrel:generate -- devrel/inbox/milestone-my-feature.yml
```

See `devrel/templates/milestone.yml` for the full field-by-field schema, and
`devrel/inbox/milestone-recurring-deliveries.yml` for a filled-in example.

## Important boundaries

- **Engineering decisions are approved in the engineering workflow, not by
  this tooling.** A handoff's `approved_technical_decisions` field records
  decisions that were already made and approved elsewhere (see the root
  `AGENTS.md` development workflow) - this tooling doesn't make, evaluate,
  or second-guess them.
- **Generated drafts are never published automatically.** There is no
  script here, and none should ever be added, that posts to LinkedIn,
  pushes a release, or otherwise publishes content on its own.
- **Nothing here invents facts.** If a field would require guessing (a
  metric that wasn't measured, a screenshot that doesn't exist, a commit
  that hasn't happened), leave it empty or don't claim it - the validator
  and generator are both built to refuse rather than fill gaps with
  plausible-sounding text.

## Generated-file policy

`devrel/templates/`, `devrel/config.yml`, `devrel/README.md`,
`scripts/devrel/`, and filled-in handoffs under `devrel/inbox/` are meant to
be tracked in git - they're the reusable tooling and source facts.

Generated drafts under `devrel/development-logs/`, `devrel/linkedin/`, and
`devrel/release-notes/` are **not** currently gitignored, and this tooling
does not add them to `.gitignore` on its own - that's a repo-wide policy
choice, not something a milestone script should decide unilaterally. If you
want generated drafts excluded from version control (e.g. because they'll
be hand-edited locally before every post and don't need a durable history),
add the folders to `.gitignore` yourself; if you'd rather keep a history of
what was drafted for each milestone, leave them tracked. Either is
reasonable - just make the choice deliberately.
