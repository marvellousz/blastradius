# BlastRadius AI — product requirements

Status: proposed product baseline, 2026-10-31, aligned to the human lead's project handoff. Competition: Atlassian Codegeist 2026, Apps for Software Teams category. Target submission: December 18, 2026. Official deadline: December 22, 2026, 12:00 PM PST, with December 19–22 reserved for contingencies. Competition details are as provided by the product owner; rules, deadline, and eligibility have not been independently verified.

## Vision and users

Help engineers answer “what could this pull request break, and who should review it?” inside Bitbucket. Combine changed code with explicit service relationships and accessible Jira/Confluence evidence. Show reasoning and uncertainty so reviewers can make informed decisions.

Primary users: PR authors and reviewers. Secondary users: service owners, technical leads, and requirement owners. Initial deployment serves one customer workspace and an explicitly approved associated Atlassian site.

## User journey

1. Open the BlastRadius panel on a Bitbucket PR.
2. Start or view an analysis for the current commit; eventually refresh automatically on relevant PR events.
3. Review affected services, APIs, requirements, owner teams, risk reasons, and source links.
4. Explore dependency paths and validate evidence before acting.
5. Recognize stale, incomplete, unavailable, or failed results and retry safely.

## Requirements

| ID | Priority | Requirement and acceptance |
| --- | --- | --- |
| FR-01 | P0 | Existing panel renders in Bitbucket and completes a frontend-to-resolver round trip. |
| FR-02 | P0 | Fetch PR metadata and paginated changes with least privilege; display truncation and access failures. |
| FR-03 | P0 | Maintain explicit service, API, ownership, and dependency mappings; inferred edges remain visibly distinct. |
| FR-04 | P0 | Persist commit-specific analysis status; duplicate events do not overwrite newer results. |
| FR-05 | P0 | Produce schema-validated assessments with validated source references for every asserted impact. Unknowns remain unknown. |
| FR-06 | P0 | Show risk summary, dependency paths, evidence, and stale/error/empty states. |
| FR-07 | P1 | Read linked Jira requirements/dependencies and Confluence documentation using an approved, proven authentication design. |
| FR-08 | P0 | Automatically queue analysis on PR creation/code updates after event semantics are verified; manual reanalysis remains available. |
| FR-09 | P2 | Rovo agent and MCP experience, conditional on supported access and available time. |
| FR-10 | P0 | Create Jira verification or remediation tasks from findings, only after explicit human confirmation. Conditional on the cross-product access decision. |

## MVP and exclusions

Submission MVP: installable Bitbucket panel, bounded PR ingestion, explicit dependency map, asynchronous analysis with validated evidence, interactive graph, reliable status/retry experience, documented setup, and reproducible demo. Jira/Confluence enrichments are desired but gated by cross-product feasibility; product owner must approve a reduced scope if unavailable. Manual mappings must be labeled as configured context, never represented as fetched integration evidence.

Phase 0 implements documentation and validation only. No LLM, dependency graph, new product integrations, external backend/database, deployment, installation, or runtime migration. Future MVP excludes autonomous merges or code fixes, blocking merge checks, comments or tickets created without human confirmation, whole-enterprise code indexing, and unsupported claims of exhaustive impact detection.

## Quality and success criteria

- Next milestone: author and reviewer can open the installed development panel and observe the resolver greeting; record workspace, app version, date, and result without secrets.
- Every asserted impact has at least one validated accessible source; invalid references are rejected or surfaced as unavailable.
- Curated evaluation set: at least 10 PR scenarios covering direct impact, transitive impact, no mapped impact, missing permission, stale commits, and failures. Target at least 80% expected affected-service recall; report precision and limitations too. These are proposed targets, not achieved results.
- Proposed performance budgets on a bounded demo dataset: panel shell within 3 seconds; queued analysis within 2 minutes for at least 90% of runs. Agree input limits before measurement.
- No unauthorized cross-repository disclosure, secrets in logs, fabricated evidence, or UI state that mistakes “analysis failed” for “low risk”.
- Submission demo and installation instructions reproduce successfully on the approved workspace before December 18.
