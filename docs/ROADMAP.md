# Seven-week roadmap

Planning baseline: October 31, 2026, aligned to the human lead's project handoff. Target submission is December 18; December 19–22 are reserved for contingencies before the December 22, 12:00 PM PST deadline. Competition dates are as provided by the product owner and not independently verified. Human lead owns product decisions and external approvals; engineering partner owns implementation and evidence of validation.

| Week | Dates | Deliverable | Exit gate |
| --- | --- | --- | --- |
| 1 | Oct 31–Nov 6 | Dependencies, build, and lint repaired; PR metadata retrieved; starter panel improved; minimal tests | A real Bitbucket PR displays a functional BlastRadius panel with real PR data. Requires a shared team workspace, test repository and PR, approved permissions, and approved development deployment. |
| 2 | Nov 7–13 | Changed files and diffs, Jira issue references, cross-product validation, permitted context retrieval, normalized evidence references | The app displays real PR changes and available supporting engineering context. Cross-product decision made by Nov 14. |
| 3 | Nov 14–20 | Graph entities, explicit dependency manifest, known relationships, traversal, interactive visualization | A changed service produces an explainable graph of known downstream dependencies. Traversal is cycle-safe. |
| 4 | Nov 21–27 | Structured LLM analysis, evidence reference validation, transparent severity scoring, facts separated from hypotheses, test recommendations, background processing | The app identifies a real dependency risk using valid supporting evidence. Requires model and egress approval; no fabricated claims. |
| 5 | Nov 28–Dec 4 | Reanalysis, report persistence, stale reports, human-approved remediation, Rovo where supported, MCP bonus eligibility check | A developer can investigate a risk and take a safe corrective action. |
| 6 | Dec 5–11 | UI polish; loading, empty, and error states; permission boundaries; rate limits and API failures; fresh installation; demo scenarios | A new user can install and use the application reliably. |
| 7 | Dec 12–18 | Demo dataset, technical documentation, recorded demo, verified installation, Devpost submission | Approved deployment, fresh installation verified, documented limitations, eligibility and rules reviewed, submitted by target. |

## Open sequencing risks

Week 1 real PR data needs the `read:pullrequest:bitbucket` scope, a deploy, and an installation upgrade. By ADR-013, PR metadata comes first in the current JavaScript setup, and the strict TypeScript and toolchain work (BR-009) follows early in week 2. React Flow in week 3 depends on BR-009, because the app is on React 16 and react-scripts.

## Scope controls

Cross-product access is the highest architectural risk. If no acceptable path is demonstrated in week two, human lead chooses reduced scope with visibly configured context or approves a separate access design. Do not silently promise live Jira/Confluence integration.

Prioritize panel reliability and factual evidence over number of integrations. Freeze optional features before compromising the final installation rehearsal. Maintain manual analysis as a fallback if automatic event handling is unreliable; label the behavior accurately. No deployment is implied by any roadmap entry: each external action requires approval.
