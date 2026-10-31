# Development tasks

Updated 2026-10-31. Priorities: P0 milestone-critical, P1 submission enhancement, P2 optional. Status: done, ready, blocked, proposed. Engineering partner implements; human lead approves architectural decisions and external actions.

| ID | Priority | Status | Task | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| BR-001 | P0 | done | Inspect starter and instructions | None | All app source/configuration read; frontend/backend/module and permission baseline documented. |
| BR-002 | P0 | done | Establish product and planning documentation | BR-001 | PRD, architecture, seven-week roadmap, tasks, decisions, and validation evidence linked. |
| BR-003 | P0 | done | Review development instructions | BR-001 | Preserve existing rules; add explicit project overrides and workflow requirements. |
| BR-004 | P0 | done | Attempt safe baseline checks | BR-001 | Dependency inspection, build and Forge lint attempted; failures and missing tests accurately recorded. Passing checks remain pending below. |
| BR-005 | P0 | blocked | Reconcile dependencies and lockfiles | Registry access; dependency-version review | Both npm packages have synchronized manifests/lockfiles; clean install succeeds; review prerelease availability and audit findings without automatic major upgrades. |
| BR-006 | P0 | blocked | Verify build and Forge manifest | BR-005; writable CLI config and network | Frontend build generates declared resource; Forge lint passes; record actual output. |
| BR-007 | P0 | proposed | Remove full invocation logging; handle frontend rejection | Scope review | No whole request logs; invoke failure produces visible retryable error; meaningful success/rejection tests. |
| BR-008 | P0 | blocked | Deploy/install development panel and smoke test | BR-006; explicit human approval; target workspace | Confirm prior installation state; approved deploy/install; author/reviewer verify greeting round trip in real PR; record version and result. |
| BR-009 | P0 | proposed | Incremental strict TypeScript and test/toolchain plan | BR-008; migration approval | Choose compatible React/build tooling; strict typecheck; backend and UI tests run; no blanket any or error suppressions. |
| BR-010 | P0 | proposed | Cross-product feasibility spike | Architecture review | Prove authorized read path or document unsupported behavior; human chooses approach by Nov 14; no credential workarounds or external writes. |
| BR-011 | P0 | proposed | Read bounded PR metadata and changes | BR-009; approved minimal scopes | Validated context, pagination, size limits, authorization and rate-limit tests; no raw source logs. |
| BR-012 | P0 | proposed | Define explicit service/owner relationships and traversal | BR-009; data model approval | Validated configured mappings, cycle-safe transitive traversal, tests for missing/unknown mappings. |
| BR-013 | P0 | proposed | Persist analyses and process async jobs | BR-011, BR-012; storage scope approval | Versioned commit-specific records; proven concurrency/idempotency; stale/duplicate/retry and failure recovery tests; retention policy. |
| BR-014 | P1 | proposed | Subscribe to PR creation/code updates | BR-013 | Confirm native event payloads and actor/access semantics; duplicate/unrelated update handling tested. |
| BR-015 | P1 | proposed | Read Jira/Confluence evidence | BR-010, BR-011; selected access design approval | Authorized read-only adapters, source versions, access denial and revoked-access tests; no implicit cross-install storage sharing. |
| BR-016 | P0 | proposed | Structured evidence-grounded AI assessment | BR-013; model/data/egress approval | Schema and source validation, bounded input, prompt-injection resistance tests, unknowns and invalid-output handling; evaluation results recorded. |
| BR-017 | P0 | proposed | Dependency graph and evidence UX | BR-009, BR-012, BR-013; library approval | Compatible React Flow, source drill-down, accessible list fallback, stale/error/empty/loading states. |
| BR-018 | P2 | proposed | Rovo/MCP feasibility and optional experience | BR-010, BR-016; scope approval | Verify module/runtime/license support; build only if core release gates remain satisfied. |
| BR-019 | P0 | proposed | Reliability evaluation and submission rehearsal | BR-008, BR-016, BR-017 | PRD evaluation set run, limitations reported, fresh install verified with approval, demo and submission materials ready by Dec 18. |

Next actionable runtime work: BR-005 and BR-006 in an environment with npm/Atlassian connectivity and writable Forge CLI configuration. No deployment approval is requested until a concrete build and lint result are available.


## Phase 1A status

BR-005 and BR-006 remain blocked following repeated checks on 2026-10-31: DNS/socket access, read-only CLI state, and insufficient offline cache prevent dependency reconciliation and Forge validation. Limited backend lint and YAML parsing pass; frontend build and Forge lint do not. See VALIDATION.md for exact results and manual unblock actions. BR-010 has a documented options assessment in ARCHITECTURE.md, but authentication feasibility remains unproven and no integration decision is approved.
