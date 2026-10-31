# Seven-week roadmap

Planning baseline: October 31, 2026. Seven delivery weeks run November 1–December 18; week seven is shortened to the submission date. December 18 is the user-provided target, not independently verified competition guidance. Human lead owns product decisions and external approvals; engineering partner owns implementation and evidence of validation.

| Week | Dates | Deliverable | Exit gate |
| --- | --- | --- | --- |
| 1 | Nov 1–7 | Phase 0 baseline, dependency reproducibility, existing panel in Bitbucket | Build/lint pass; approved development deploy/install and recorded panel round trip. Start cross-product feasibility spike early. |
| 2 | Nov 8–14 | Approved incremental TypeScript/toolchain work, Bitbucket PR ingestion, test harness | Strict typecheck, bounded diff reads, permission/error tests; cross-product decision made by Nov 14. |
| 3 | Nov 15–21 | Explicit service model, deterministic impact traversal, KVS, queued jobs | Cycle-safe traversal; duplicate/retry/stale-event tests; persisted commit-specific status. |
| 4 | Nov 22–28 | Evidence-grounded structured AI assessment; approved enrichment adapter if feasible | Model/egress approval, schema/source validation, adversarial and unavailable-source tests; no fabricated claims. |
| 5 | Nov 29–Dec 5 | Interactive dependency visualization and review UX | Evidence drill-down, keyboard-accessible fallback list, loading/error/empty/stale states; representative large graph stays usable. |
| 6 | Dec 6–12 | End-to-end reliability, evaluation, optional Rovo spike | Curated PR evaluation and recovery tests; scope freeze Dec 12. Rovo/MCP only if core gates pass. |
| 7 | Dec 13–18 | Release candidate, install rehearsal, demo and submission | Approved deployment, fresh installation verification, documented limitations, recorded demo, eligibility/rules review, submission by target. |

## Scope controls

Cross-product access is the highest architectural risk. If no acceptable path is demonstrated in week two, human lead chooses reduced scope with visibly configured context or approves a separate access design. Do not silently promise live Jira/Confluence integration.

Prioritize panel reliability and factual evidence over number of integrations. Freeze optional features before compromising the final installation rehearsal. Maintain manual analysis as a fallback if automatic event handling is unreliable; label the behavior accurately. No deployment is implied by any roadmap entry: each external action requires approval.
