# Development tasks

Updated 2026-10-31. Priorities: P0 milestone-critical, P1 submission enhancement, P2 optional. Status: done, ready, blocked, proposed. Engineering partner implements; human lead approves architectural decisions and external actions.

| ID | Priority | Status | Task | Dependencies | Acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| BR-001 | P0 | done | Inspect starter and instructions | None | All app source/configuration read; frontend/backend/module and permission baseline documented. |
| BR-002 | P0 | done | Establish product and planning documentation | BR-001 | PRD, architecture, seven-week roadmap, tasks, decisions, and validation evidence linked. |
| BR-003 | P0 | done | Review development instructions | BR-001 | Preserve existing rules; add explicit project overrides and workflow requirements. |
| BR-004 | P0 | done | Attempt safe baseline checks | BR-001 | Dependency inspection, build and Forge lint attempted; failures and missing tests accurately recorded. Passing checks remain pending below. |
| BR-005 | P0 | done | Reconcile dependencies and lockfiles | Registry access; dependency-version review | Both npm packages have synchronized manifests/lockfiles; clean install succeeds; review prerelease availability and audit findings without automatic major upgrades. |
| BR-006 | P0 | done | Verify build and Forge manifest | BR-005; writable CLI config and network | Frontend build generates declared resource; Forge lint passes; record actual output. |
| BR-007 | P0 | done | Remove full invocation logging; handle frontend rejection | Scope review | No whole request logs; invoke failure produces visible retryable error; meaningful success/rejection tests. |
| BR-008 | P0 | done | Deploy/install development panel and smoke test | BR-006; explicit human approval; shared team workspace; second-user consent fix | Deployed and installed; author and a second account with reviewer actions verified live PR data in a real PR (see VALIDATION.md). |
| BR-009 | P0 | done | Incremental strict TypeScript and test/toolchain plan | BR-008; migration approval | Tooling chosen (ADR-016); strict typecheck, backend and UI tests, and lint pass; no blanket any or error suppressions; Forge lint and development deploy pass. |
| BR-010 | P0 | done | Cross-product feasibility spike (a Bitbucket-installed app received live Jira and Confluence data through a companion app; adoption decision in ADR-021) | Architecture review | Prove authorized read path or document unsupported behavior; human chooses approach by Nov 14; no credential workarounds or external writes. |
| BR-011 | P0 | ready | Read bounded PR metadata and changes (metadata live; changed file list live in development as author; full diff text deferred to analysis work) | Approved `read:pullrequest:bitbucket` scope; BR-009 before the changes and diff portion (ADR-013) | Validated context, pagination, size limits, authorization and rate-limit tests; no raw source logs. |
| BR-012 | P0 | done | Define explicit service/owner relationships and traversal (live in development) | BR-009; data model approval (ADR-018) | Validated configured mappings, cycle-safe transitive traversal, tests for missing/unknown mappings. |
| BR-013 | P0 | proposed | Persist analyses and process async jobs | BR-011, BR-012; storage scope approval | Versioned commit-specific records; proven concurrency/idempotency; stale/duplicate/retry and failure recovery tests; retention policy. |
| BR-014 | P0 | proposed | Subscribe to PR creation/code updates | BR-013 | Confirm native event payloads and actor/access semantics; duplicate/unrelated update handling tested. |
| BR-015 | P1 | ready | Read Jira/Confluence evidence (live in development through the companion; revoked-access cases remain) | BR-010, BR-011; selected access design approval | Authorized read-only adapters, source versions, access denial and revoked-access tests; no implicit cross-install storage sharing. |
| BR-016 | P0 | proposed | Structured evidence-grounded AI assessment | BR-013; model/data/egress approval | Schema and source validation, bounded input, prompt-injection resistance tests, unknowns and invalid-output handling; evaluation results recorded. |
| BR-017 | P0 | ready | Dependency graph and evidence UX (first graph live in development; dark mode and evidence drill-down remaining) | BR-009, BR-012; library approved (ADR-006) | Compatible React Flow, source drill-down, accessible list fallback, stale/error/empty/loading states. |
| BR-018 | P2 | proposed | Rovo/MCP feasibility and optional experience | BR-010, BR-016; scope approval | Verify module/runtime/license support; build only if core release gates remain satisfied. |
| BR-019 | P0 | proposed | Reliability evaluation and submission rehearsal | BR-008, BR-016, BR-017 | PRD evaluation set run, limitations reported, fresh install verified with approval, demo and submission materials ready by Dec 18. |
| BR-020 | P0 | proposed | Human-approved Jira remediation task | BR-010, BR-015; write scope and access design approval | Explicit confirmation before every issue creation; denied-access and duplicate-submission tests. Blocked if the cross-product decision rules out Jira writes. |
| BR-021 | P0 | proposed | Prove the judge installation path | BR-011; explicit approval for production deployment and sharing | Production deploy; sharing enabled in the developer console; installation link installs on a second team workspace; a non-contributor can grant consent and see the panel; result recorded. If Bitbucket links are unsupported, escalate to the human lead and Devpost immediately. |
| BR-023 | P0 | done | Contract evidence from declared schemas | BR-012; ADR-020 | Live in development: a removed declared field is high severity, and a consumer not using it stays clear. |
| BR-024 | P1 | done | Jira and Confluence references at the found and configured levels | ADR-019 | Live in development. Keys and links from pull request text, and map references, labelled so they cannot read as fetched evidence. |
| BR-022 | P0 | proposed | Replace the distribution privacy link with a real policy | Human lead review of the `docs/PRIVACY.md` draft | The developer console privacy field links to a live policy, not the marvlock.com homepage, before any judge link is shared. Personal data declaration rechecked whenever the app starts storing data. |

Next actionable runtime work: BR-016 AI assessment needs a model and data decision. BR-021 must still prove the judge path, now with the companion. The companion connection (ADR-022) and BR-015 reads are live in development. The human lead deferred the remaining BR-021 step, an installation link install from outside the `marvlock` workspace, to later in the project on 2026-11-01. It must still pass before submission. A scope change needs `forge deploy --approve MAJOR_VERSION_RULE` followed by an installation upgrade.


## Phase 1A status

Superseded later on 2026-10-31: the DNS, socket, and read-only failures were attributed to the previous agent's sandbox. BR-005, BR-006, and BR-007 are done. See VALIDATION.md for exact results. BR-010 has a documented options assessment in ARCHITECTURE.md, but authentication feasibility remains unproven and no integration decision is approved.
