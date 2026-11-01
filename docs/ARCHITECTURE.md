# Architecture

Status: inspected baseline and proposed evolution, 2026-10-31. Proposed modules are not implemented or approved migrations.

## Existing app

`manifest.yml` declares `bitbucket:repoPullRequestOverviewPanel`, with resource `main` at `static/hello-world/build`, resolver function `resolver`, and handler `index.handler`. Runtime is `nodejs24.x`. An app ID exists; registration does not prove deployment or installation. Permissions are the `read:pullrequest:bitbucket` and `read:repository:bitbucket` scopes. No egress, triggers, consumers, or storage are declared.

`static/hello-world/src/index.tsx` mounts React 18 using `createRoot` and Atlaskit CSS reset. `App.tsx` calls `loadPullRequest` from `pullRequest.ts` on mount and renders Loading, a pull request summary, or a visible error with Retry. `pullRequest.ts` validates the panel context, calls Bridge `requestBitbucket` as the current user, and validates the response. `ChangedFiles.tsx` shows the bounded file list from `changedFiles.ts`, which follows Bitbucket's `next` links only after checking they stay on the Bitbucket API, and rejects the whole list if any entry is invalid. `ImpactSection.tsx` loads `blastradius.json` from the destination commit through `serviceMapLoader.ts`, so a pull request cannot edit the map to hide its own impact. `src/analysis/` holds pure logic with no Forge or React imports: map validation, path matching, and the reverse dependency traversal. `useLoader.ts` and `FailureNotice.tsx` hold the shared loading and failure behavior.

`ContractFindings.tsx` shows contract checks from `contractEvidence.ts`. A dependency can declare a JSON Schema file and the fields the consumer uses; when that file changes, `analysis/contract.ts` compares it at the destination and source commits for those fields only. Severity and confidence are reported separately. Removed fields and changed types are high severity, a field becoming optional is medium, a clear result covers only the declared fields, and schemas using `$ref`, `allOf`, `anyOf`, `oneOf`, `not`, or `if` stay unknown rather than risking a false clear.

Path patterns come from repository content, so they are matched with a small non-backtracking scanner, never compiled to a regular expression. A regex version froze on a crafted pattern, and capping wildcards did not prevent it. `src/index.ts` registers `getText` from `src/resolvers/getText.ts`, which returns “Hello, world!” and does not log the request; the UI no longer calls it (ADR-014).

Current flow: Bitbucket PR overview → Forge-hosted iframe → `view.getContext` → Bridge `requestBitbucket` as the current user → Bitbucket pull request endpoint → validated summary in the panel.

Two independent npm packages and lockfiles exist. Both use strict TypeScript and Vitest; the frontend builds with Vite into the existing `static/hello-world/build` resource path, and root ESLint covers both packages. Forge compiles `src` with TypeScript through the root `tsconfig.json` and type-checks during deployment, so that file must not set `noEmit`. There is no CI configuration. See VALIDATION.md for results.

## Proposed structure after approval

Keep the existing resource path during the first milestone; create directories as features require them, rather than scaffolding empty abstractions.

```text
src/
  index.ts                 # Forge exported handlers
  resolvers/               # Authorized UI entry points
  integrations/            # Bitbucket; later approved Jira/Confluence adapters
  analysis/                # Deterministic impact rules and model orchestration
  jobs/                    # Async consumers, idempotency, retries
  storage/                 # Forge KVS repository and schema versions
shared/                    # Runtime schemas and TypeScript contracts
static/hello-world/src/
  App.tsx
  features/                # PR summary, analysis status, evidence, graph
  components/
tests/                     # Backend unit and adapter contract tests
docs/
```

Frontend tests can live alongside frontend features. Resolve shared source bundling under the selected frontend toolchain before adopting a shared package. No monorepo migration is needed for the first panel.

## Proposed analysis flow

1. Authorized panel request or verified native Bitbucket event identifies workspace, repository, PR, and commit hashes.
2. Backend checks access, creates a versioned job record, and enqueues only identifiers through `@forge/events`.
3. Consumer fetches bounded, paginated code context and explicit service mappings. Jira/Confluence enrichment runs only after its access design is approved.
4. Deterministic dependency traversal identifies candidates. A later model proposes structured impact claims referencing only supplied source IDs.
5. Runtime validation checks schema, source membership, source versions, and claim grounding; invalid results fail visibly. Treat source text as untrusted input, never instructions.
6. Persist a versioned result in Forge KVS; frontend polls boundedly and renders summary/evidence. React Flow needs React 17 or newer, which the app now meets; adding it still needs library approval.

## Proposed data and trust boundaries

Use `@forge/kvs` from backend code, with `storage:app` only when implemented. KVS is an SDK API; do not invent `api.asApp().storage` methods. Data is installation-scoped, not automatically shared across product installations. Partition keys further by workspace/repository/PR, commit, and schema version.

Job states: queued, running, succeeded, failed; display stale independently when the PR commit changes. Store bounded evidence metadata, source identifiers/versions, relationships, reasons, timestamps, and model/schema versions. Prefer references to wholesale copies of code/docs. Proposed retention: 30 days for completed analysis, pending owner approval and a concrete cleanup design.

Use a deterministic idempotency key including repository, PR, source/destination commits, and analysis version. Account for at-least-once event delivery, races, retries, rate limits, and stale writes; choose a proven atomic coordination strategy before implementation. A read-then-write KVS check alone is insufficient concurrency control.

Frontend context and payloads are untrusted for authorization. Prefer user-context product reads; background app-context access needs explicit repository authorization and result visibility controls. Revalidate viewer access before returning stored sensitive evidence. Secret values remain backend-only; logs contain identifiers/status, not raw requests, diffs, credentials, or source text.

## Verified capabilities and gates

Research checked 2026-10-31; recheck before implementation because platform capabilities change.

| Area | Finding and implication | Source |
| --- | --- | --- |
| Panel | Existing module supports a static Custom UI resource and an expandable PR overview panel. Listed extension context is `type`, `repository.uuid`, `pullRequest.id`, and `location`. `workspaceId` comes from top-level `view.getContext()` and is documented as available in resolver context. Repository UUIDs are wrapped in `{}`. Context values are not all safe for authorization. | [Module reference](https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-repository-pull-request-overview-panel/) |
| Workspace | Forge apps are not supported on personal Bitbucket workspaces; use a shared team workspace. The documented Bitbucket install is the interactive `forge install` flow with a workspace URL. | [Bitbucket tutorial](https://developer.atlassian.com/platform/forge/build-a-pull-request-title-validator-with-custom-merge-checks/) |
| Bitbucket reads | Bridge `requestBitbucket` acts as current user. Backend `requestBitbucket` supports app/user contexts; use supported workspace/repository identifiers and endpoint scopes. Bitbucket's OpenAPI spec lists `read:pullrequest:bitbucket` and Forge OAuth support for the PR endpoints. The PR diff, patch, and diffstat endpoints are 302 redirects to repository endpoints that list `read:repository:bitbucket`, so check a redirect's target before relying on a listed scope. Backend routes expect `workspaceId`, not the slug. | [Bridge](https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/requestBitbucket/), [backend](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestbitbucket/) |
| PR events | Native Bitbucket PR events exist; validate created/updated payloads and source-commit changes before choosing subscriptions. No external webhook server assumed. | [Events](https://developer.atlassian.com/platform/forge/events-reference/bitbucket/) |
| Long jobs | Async consumers have a default 55-second timeout, configurable up to 900 seconds; consumer-only function configuration and quotas apply. Retries require idempotency. | [Async API](https://developer.atlassian.com/platform/forge/runtime-reference/async-events-api/), [limits](https://developer.atlassian.com/platform/forge/limits-async-events/) |
| Storage | `@forge/kvs` requires `storage:app`; storage has installation boundaries and quotas. | [KVS API](https://developer.atlassian.com/platform/forge/storage-reference/kvs-api/), [KVS](https://developer.atlassian.com/platform/forge/storage-reference/kvs/) |
| Cross-product | Current multi-app compatibility documentation supports only Jira and Confluence. Its Global Apps (EAP) section adds that “Confluence, Jira and Bitbucket connections will be supported in EAP”; that is future-tense EAP wording, not a usable capability, and needs checking in BR-010. Do not assume adding scopes enables Jira/Confluence from this installation. Authentication/access feasibility blocks live enrichments. | [App compatibility](https://developer.atlassian.com/platform/forge/app-compatibility/) |
| Distribution | Installation links need a production deployment and sharing enabled in the developer console; installers must be admins. The page does not state that Bitbucket apps are supported. Apps submitted for Marketplace listing cannot be shared by link. | [Distribute your apps](https://developer.atlassian.com/platform/forge/distribute-your-apps/) |
| Teamwork Graph | Preview API, read-only, needs app allowlisting, and is “only available for apps installed into Jira or Confluence”. Bitbucket has no listed scopes. A missing scope returns an empty success, not an error, so an empty result must not be read as no impact. | [Limitations](https://developer.atlassian.com/platform/teamwork-graph/limitations-and-considerations/), [scopes](https://developer.atlassian.com/platform/teamwork-graph/scopes/) |
| AI/Rovo/MCP | No provider, model access, Rovo license/module availability, or MCP runtime integration has been validated for this Bitbucket app. Requires a dedicated spike, data policy, cost review, and approval. | Pending investigation |

Potential cross-product alternatives for discussion: approved external OAuth access from Forge, a companion app, or explicitly configured/manual context for a reduced demo. None is selected; no external backend is introduced. Model provider/egress choice is also pending approval. Structured output schemas cannot by themselves establish factual correctness.

## Build and delivery

Install both npm dependency trees, build the frontend before Forge packaging, run meaningful tests and Forge lint, then request human approval for a concrete deployment. Keep app ID and manifest unchanged during Phase 0. Development is the default environment. Deployment and installation must be verified separately; the in-product smoke test is essential and cannot be replaced by a successful build.


## Phase 1A cross-product findings (2026-10-31)

These are official-documentation findings, not successful integration tests. No scopes or authentication code were added.

**Native access:** the current [compatibility reference](https://developer.atlassian.com/platform/forge/app-compatibility/) omits Bitbucket from supported multi-app combinations. Consequently there is no documented supported path for this Bitbucket-only installation to obtain native Jira/Confluence authentication simply by adding scopes or switching to asApp. User access to both products does not establish an app grant. No live cross-product request was attempted.

**Contexts:** supported [Jira](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestjira/) and [Confluence](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestconfluence/) backends offer asUser and asApp contexts. Prefer user-context access with user consent/permissions; app-context operations require permission checks protecting the requesting user's visibility. Bridge requests run as the interacting user. Offline impersonation requires explicitly enabled scopes and has restrictions; it is not a cross-product workaround. Confirm module-specific user-context support during the spike.

**Scopes:** choose from actual REST endpoints. Jira classic read:jira-work covers issue/project data ([reference](https://developer.atlassian.com/platform/forge/manifest-reference/scopes-product-jira/)); Confluence classic read:confluence-content.all covers detailed content, while summary scope does not grant arbitrary body reads ([reference](https://developer.atlassian.com/cloud/confluence/scopes-for-oauth-2-3LO-and-forge-apps/)). Some endpoints use granular scopes; finalize an endpoint/scope matrix before implementation. Scopes alone do not create product access.

| Option | Additional authorization | Assessment |
| --- | --- | --- |
| Bitbucket-only milestone | Existing app eventually deployed/installed with approval; future Bitbucket reads need endpoint scopes | Recommended first. Panel/resolver round trip, then authorized PR data and explicit configured context. Plain Jira/Confluence links do not imply API access. |
| Jira/Confluence companion | Separate approved Forge app installed/connected on the target site with supported compatibility | Native reads belong in that app context. Transferring evidence to Bitbucket needs a separately approved authenticated exchange; separate installation storage is not shared. |
| Developer-owned Atlassian 3LO integration | Separate OAuth registration, user consent, resource discovery, endpoint scopes, secure callback/token lifecycle and approved egress | No separate Forge installation is inherently required for REST access under 3LO, but this is additional authorization/configuration. Hosting it securely within project constraints remains unproven. |

[Atlassian 3LO](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) documents user-authorized REST access, accessible-resource discovery, cloud ID routing through api.atlassian.com/ex/jira/{cloudId} or /ex/confluence/{cloudId}, and offline_access for refresh tokens. These grants provide user authority, not app-user asApp authority. Background processing needs a deliberate access design. Use a developer-owned integration rather than requesting customer API tokens or personal OAuth registrations.

**Unconfirmed:** generic Forge [external authentication](https://developer.atlassian.com/platform/forge/runtime-reference/external-fetch-api/) does not establish Atlassian OAuth-client acceptance by withProvider. Do not present this as a supported plug-in configuration. Verify explicit provider support; if unavailable, any custom callback/token implementation requires architecture approval and review against [cloud app security requirements](https://developer.atlassian.com/platform/marketplace/security-requirements/). No external backend, OAuth flow, or API-token workaround is selected.

**BR-010 findings (2026-11-01):** official documentation only; no live cross-product request has been attempted.

- Bitbucket's OpenAPI spec has 176 paths and none expose Jira data. Pull request objects have no linked-issue field in the spec.
- Work item keys are linked through branch names, commit messages, and pull request titles. The key format is documented only in prose, and Bitbucket does not provide issue titles, status, or a Jira site lookup. Without Jira access, only the key text can be shown.
- `requestJira` and `requestConfluence` exist as fetch endpoints, but the docs do not say whether a Bitbucket-only installation can use them, or how it would identify a Jira site.
- Global Apps EAP: Bitbucket connections are future tense, EAP features are “not supported or recommended for production use”, are enabled on development environments where possible, and require the `global:ui` module. Sharing by installation link is not stated. Unsuitable for judging as documented.
- External OAuth: the providers documentation neither supports nor restricts Atlassian as a provider, and does not list which modules support consent.
- Companion app: web triggers are public URLs with no platform authentication, cannot use `asUser`, and need self-implemented authorization. No Forge app-to-app mechanism is documented, and calling another app's trigger is undocumented. Each app needs its own installation, and URLs are per installation.
- Native events `avi:bitbucket:created:pullrequest` and `avi:bitbucket:updated:pullrequest` exist under `read:pullrequest:bitbucket`. Updates carry old and new source commits when new commits arrive, which supports BR-014.

**BR-010 spike, first result (2026-11-01):** a separate Forge app, compatible with Jira (required) and Confluence (optional) and installed on both on one site, read a Jira work item with `read:jira-work` and a Confluence page body with `read:page:confluence`, using `asApp`, for a caller outside the site. Its web trigger refused a request without the token (401) and returned live data with it (200).

**BR-010 spike, second result (2026-11-01):** a second Forge app, installed on the `marvlock` Bitbucket workspace with no product scopes and `*.webtrigger.atlassian.app` declared for backend egress, called that web trigger with a token from encrypted environment variables and received the live Jira and Confluence data. Forge lint warns that this egress entry format is deprecated, so a real version needs the current format.

Proven: backend path from a Bitbucket installation to Jira and Confluence data on one site. Not proven: the same call from the BlastRadius panel's resolver, or production environments, sharing, and a judge's setup. Not solved: `asApp` ignores the viewer's Jira and Confluence permissions, so anyone who can see the panel could see what the companion returns. Each customer would also need to install a second app and connect the two.

Recommendation: finish the Bitbucket build/lint/panel milestone first. Keep live enrichment blocked until the lead chooses a proven companion or OAuth design. Without extra product installations or OAuth consent, a later demo can use authorized Bitbucket data and visibly labeled fixtures/manual mappings, but cannot claim fetched Jira/Confluence evidence. No demo features were added in Phase 1A.
