# Decision log

Statuses: accepted = explicit user direction or existing baseline; proposed = needs review before implementation; open = investigation required. Documentation of a proposal does not authorize migration.

| ID | Status | Decision | Rationale / consequence |
| --- | --- | --- | --- |
| ADR-001 | Accepted | Preserve the existing Forge app, app ID, Bitbucket overview module, and Custom UI starter. | User explicitly forbids recreation or unnecessary rewrites. Older UI Kit-only creation guidance does not apply to this existing app. |
| ADR-002 | Accepted direction; migration pending | Prefer strict TypeScript and React Custom UI for new product work. | User preference overrides older JavaScript/UI Kit defaults; no conversion in Phase 0. |
| ADR-003 | Proposed | Incrementally separate resolver, integration, job, analysis, storage, and runtime contract responsibilities. | Maintain small reviewable changes and testable business logic; avoid framework scaffolding now. |
| ADR-004 | Proposed | Use Forge-hosted compute and KVS with async events for analysis. | Avoid external backend/database; approve scopes, retention, concurrency strategy, and job contracts before implementation. |
| ADR-005 | Open — high priority | Determine live Jira/Confluence authentication from a Bitbucket app. | Current multi-app compatibility documentation omits Bitbucket. Requires feasibility evidence and human choice; scopes alone are not a solution. |
| ADR-006 | Proposed | Use React Flow after a compatible React/toolchain migration. | Current React 16 starter needs compatibility review before adding visualization dependencies. No graph library installed yet. |
| ADR-007 | Accepted principle; implementation pending | Every asserted AI impact requires validated evidence; unknown/failed results stay explicit. | No fabricated identifiers, source links, integrations, test outcomes, or certainty. Model choice and egress remain open. |
| ADR-008 | Accepted | Human approval precedes deployment, installation, and external writes. | Phase 0 is local only; read-only capability research and local checks are authorized. |
| ADR-009 | Open | Reconcile prerelease manifest dependencies with existing stable-version lockfiles. | Root resolver and frontend Bridge/React declarations disagree with lockfile roots. Do not silently upgrade; inspect availability and resolve deliberately with npm, then review lockfile changes. |

## Development instruction review

Existing AGENTS.md remains intact apart from a project-specific addendum. Preserve least privilege, user-context preference, valid app-root CLI usage, manifest linting, clear code comments, package-manager installs, and Forge-hosted simplicity.

The addendum records current user overrides and working practices. Legacy UI Kit restrictions apply only to UI Kit surfaces; DOM and ordinary React components are valid in this app's Custom UI iframe. The older storage wording must not be interpreted as an invented `.asApp()` storage API. No platform-specific CLI installation syntax should be copied without checking Bitbucket workspace options.


## Phase 1A update — 2026-10-31

- ADR-009 remains open: normal and offline npm resolution cannot complete in this restricted session. Preserve dependency declarations and lockfiles until package availability can be verified; do not conceal mismatches by hand-editing locks.
- ADR-010 (accepted within Phase 1A scope): distinguish environment failures from source failures. EAI_AGAIN is a DNS symptom here; EROFS and EPERM independently demonstrate filesystem/network restrictions. Do not change host DNS, WSL, registry, TLS verification, or permissions without an evidence-backed proposal and approval. See [validation](VALIDATION.md).
- ADR-005 remains open; recommendation refined: prioritize the existing Bitbucket panel. Native multi-app compatibility does not document Bitbucket-to-Jira/Confluence access. Adding scopes, switching to asApp, or assuming user access is insufficient. See [official compatibility documentation](https://developer.atlassian.com/platform/forge/app-compatibility/).
- ADR-011 (proposed, not approved): evaluate either an installed Jira/Confluence companion plus authenticated exchange, or a developer-owned Atlassian 3LO integration. 3LO is documented for user-authorized REST access, but Forge withProvider support for Atlassian OAuth and the callback/token-hosting design remain unconfirmed. Separate OAuth consent is additional setup even without a Forge product installation. No authentication or external backend implementation is authorized. See [architecture options](ARCHITECTURE.md) and [official 3LO documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).
- Documentation correction: the architecture capability table now avoids the previous cached Preview/product-list description and records the relevant confirmed limitation: Bitbucket is absent from current documented multi-app combinations. This changes no runtime behavior.
