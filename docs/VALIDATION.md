# Phase 0 validation record

Date: 2026-10-31. No deployment, installation, product mutation, code migration, or manifest change was performed. Deployment/installation state remains unknown.

## Environment and inspection

- `pwd`: `/home/pranav/hackathons/blastradius` (used for Forge CLI work directory).
- Node `v24.22.2`, npm `11.19.1`, Forge CLI `15.0.0`.
- Read all tracked-style app source, manifests, README, AGENTS.md, public HTML, ignore files, and dependency/lockfile metadata. Did not inspect credentials or protected account files.
- `git status --short` failed: `fatal: not a git repository (or any of the parent directories): .git`. A protected `.git` directory is visible but Git metadata is unavailable here. No Git initialization was attempted.

## Checks performed

| Command/check | Result |
| --- | --- |
| Root `npm ls --depth=0` | Pass: resolver and ESLint dependencies present. This does not establish reproducible installation. |
| Frontend `npm ls --depth=0` | Fail (`ELSPROBLEMS`): all five direct dependencies missing: CSS reset, Forge Bridge, React, ReactDOM, react-scripts. |
| Root/frontend `npm run` | No root scripts. Frontend start/build/eject only. No test script or test files found; tests not run. |
| Frontend `npm run build` | Fail, exit 127: `sh: 1: react-scripts: not found`. No build resource generated. |
| Frontend `npm install` with temporary cache, lifecycle scripts/audit/funding disabled and bounded fetch | Fail: `EAI_AGAIN`, `getaddrinfo EAI_AGAIN registry.npmjs.org` fetching Forge Bridge. Peer-resolution warnings also occurred; no dependency compatibility conclusion can be drawn from this failed install. |
| `forge lint` | Fail, exit 1 before validation: `EROFS: read-only file system, open '/home/pranav/.config/@forge/cli-nodejs/config.json.tmp-…'`. |
| `forge lint --verbose` | Same configuration-write failure; also `fetch failed` contacting Atlassian GraphQL. No manifest-validation success claimed. |
| Lockfile root metadata comparison | Fail: root manifest resolver `2.0.2-next.0` versus lock `2.0.1`; frontend manifest Bridge `7.2.1-next.13` versus lock `5.2.0`; React/ReactDOM `^16` versus lock `^18.2.0`. |

The existing package files contain prerelease Forge dependencies. Registry availability, installability, advisories, and compatibility have not been verified. Resolve mismatches deliberately using npm when registry access returns; `npm ci` is not a justified reproducible path with the current mismatches.

## Next-milestone runbook

1. Review dependency reconciliation (BR-005), install with npm in both package directories, and inspect the resulting lockfile changes. Do not expose authentication configuration or run automatic force upgrades.
2. Build with `npm --prefix static/hello-world run build`; confirm `static/hello-world/build/index.html` exists.
3. Run `pwd` at app root, then `forge lint` where CLI configuration is writable and network access works. Use `--verbose` to troubleshoot failures, reviewing output for sensitive data before sharing.
4. Present successful checks and exact deployment target for human approval. Obtain Bitbucket workspace and confirm existing installation state; never infer installation from app registration.
5. Only after approval, deploy with `forge deploy --non-interactive --e development`. Check `forge install --help` for current Bitbucket workspace options, then use approved non-interactive install parameters. Do not substitute a Jira site URL for a Bitbucket workspace blindly.
6. In a real PR, expand the overview panel and verify frontend → resolver → greeting as author and reviewer. Record result, date, environment, and deployed version. Inspect redacted logs if needed.

No unit tests were added for documentation-only changes. Subsequent runtime changes need behavior tests, especially resolver rejection, authorization, stale results, retries, and source validation.


## Phase 1A — environment diagnosis (2026-10-31)

Build and dependency repair remain blocked. No source, manifest, dependency version, system networking, registry, or permission setting was changed. No deployment or app installation was performed. Local package installation attempts failed; no test framework or features were added.

| Area | Observed result | Interpretation |
| --- | --- | --- |
| Runtime | Node v24.22.2, npm 11.19.1, Forge 15.0.0; executables under the same NVM installation | No missing executable or mixed installation evidence. |
| OS | Linux 6.18.33.2-microsoft-standard-WSL2 | WSL2 confirmed; host networking failure not established. |
| npm | Registry https://registry.npmjs.org/; strict SSL enabled; cache /home/pranav/.npm | No registry change or TLS bypass applied. Full config withheld to protect credentials. |
| Proxy | Upper/lower-case HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, NO_PROXY unset; NODE_EXTRA_CA_CERTS unset | npm proxy, https-proxy, and cafile settings also report unset (values were not printed). Windows/VPN configuration was not examined; proxy involvement outside this session is not disproven. |
| DNS | getent hosts fails; Python getaddrinfo returns errno -3 for npm and Atlassian hosts | Name resolution unavailable in this session; npm reports EAI_AGAIN. |
| HTTPS | Python HTTPS and npm ping fail at name resolution | No TLS handshake reached; certificates and HTTP behavior remain untested. |
| WSL resolver | Auto-generated /etc/resolv.conf uses 10.255.255.254 | Inspected only; do not conclude host resolver is broken from sandbox results. |
| Network restrictions | ip route denied netlink access; direct socket creation returns EPERM | Session restrictions prevent reliable host-network diagnosis. Research browser access is a separate service. |
| Forge directory | Owned by pranav, mode 0755; parent .config mode 0750 | Normal ownership/modes; chmod/chown is not a justified repair. |
| Write probes | Forge config and npm cache return EROFS; /tmp succeeds | Read-only session filesystem restrictions, distinct from DNS/TLS. Successful probe removed. No credential/config contents read or copied. |

### Validation attempts

- Root dependency inspection passes; frontend still has all five direct dependencies missing. Root has no scripts; frontend has start/build/eject only. No tests configured or run.
- npm ping with writable temporary cache, zero retries and bounded timeout: EAI_AGAIN for registry.npmjs.org.
- Frontend npm install using /tmp/blastradius-npm-cache, --ignore-scripts --no-audit --no-fund and bounded fetch: EAI_AGAIN fetching Forge Bridge. Lifecycle scripts were disabled for diagnosis; this was not a verified complete installation.
- Existing npm cache contains entries, but root and frontend offline installs both fail with ENOTCACHED for resolver and Bridge respectively. Used the existing cache read-only and /tmp/blastradius-npm-logs for logs. No cache cleaning performed. Peer warnings are not evidence of successful compatibility resolution.
- Frontend build repeated: exit 127, `react-scripts: not found`. No successful build or generated resource verified.
- forge lint repeated from pwd-confirmed app root: exit 1, EROFS writing its CLI config temporary file. Verbose retry also reports failed Atlassian GraphQL fetches. Forge manifest validation did not complete.
- Limited backend ESLint check passed using installed ESLint with Node/ES2022 environment, module parsing, no-unused-vars and no-undef. An initial probe omitted Node globals and flagged console; correcting the check required no source edit. This is not a configured project lint suite.
- Manifest YAML parse and existing panel/resource assertions passed using already installed js-yaml. An initial probe for the uninstalled yaml package failed; no dependency was added. YAML parsing is not Forge schema validation.

The Phase 0 dependency mismatches remain unresolved: resolver 2.0.2-next.0 versus lock 2.0.1; Bridge 7.2.1-next.13 versus lock 5.2.0; React/ReactDOM ^16 versus lock ^18.2.0. No hand-edited lockfile or speculative version substitution was used to conceal them. Registry access or a complete trusted cache is required.

### Manual unblock actions

1. In a normal WSL terminal outside this restricted session, run node/npm version checks, `getent hosts registry.npmjs.org api.atlassian.com`, `npm ping`, and `curl -I --connect-timeout 10 --max-time 20 https://registry.npmjs.org/`. Share only redacted errors, never credential/config files.
2. If those work, enable network access and writable npm/Forge CLI state through the execution environment, or perform package/build/lint commands in that terminal. This session cannot elevate its sandbox permissions. No system-wide DNS change is justified by current evidence.
3. If normal WSL also fails, investigate host WSL/VPN/proxy/DNS separately before proposing an approved repair. Do not replace DNS servers, edit WSL/Windows settings, change registry, or disable TLS verification based on sandbox failures.
4. Once access returns, verify exact declared prerelease versions exist; use npm install in both package directories to reconcile lockfiles without unnecessary upgrades. Review the changes. If a version is unavailable, review the smallest supported adjustment. Do not use force/legacy-peer-deps to hide compatibility issues.
5. Build frontend, then run Forge lint at app root. Verify clean-install repeatability after reconciliation. Deployment and installation remain separately approval-gated.

Final document checks passed: balanced Markdown fences and resolving local links; both manifests and lockfiles remain parseable JSON. These checks do not resolve dependency inconsistencies.


## Phase 1A — repair in normal WSL (2026-10-31)

This section supersedes the Phase 1A diagnosis above. The DNS, socket, and `EROFS` failures did not reproduce outside the previous agent's session, so they are attributed to that session's sandbox. `git init` created the repository at this stage (baseline `dd8e460`); the earlier note about a visible `.git` directory no longer applies. No deployment or installation was performed.

### Environment

| Area | Observed result |
| --- | --- |
| Toolchain | Node v24.22.2, npm 11.19.1, Forge 15.0.0, all under NVM. Interactive WSL shell is zsh. |
| PATH caveat | Bash started through `wsl.exe` does not load NVM and can fall through to Windows npm. Pin NVM's `bin` directory first in that case. |
| Network | npm ping succeeds; registry HTTP 200; `api.atlassian.com` HTTP 301. |
| Writes | Workspace, npm cache, and Forge CLI configuration are writable. |
| Forge login | Works in the human lead's terminal through environment variables. Those variables are not visible to agent shells, so `forge` commands needing login run in that terminal. |
| Installation state | `forge install list` reports the app is not installed anywhere. |

### Dependency repair

The frontend conflict was real and independent of the stale lockfile: `react-scripts@5.0.1` has an optional TypeScript peer of `^3 || ^4`, and `@forge/bridge@7.x` has an optional peer of `>=5.0.0`. Candidates were compared on throwaway copies with full install, build, and `npm ci`:

| Bridge | TypeScript override | Install, build, `npm ci` | Production audit | Build size |
| --- | --- | --- | --- | --- |
| 7.2.1-next.13 | `^4.9.5` | Pass | 8 (5 high, 3 moderate) | 904K |
| 7.2.1 | `^4.9.5` | Pass | 8 (5 high, 3 moderate) | 904K |
| 7.2.1 | `^5.9.3` | Pass | 8 (5 high, 3 moderate) | 904K |
| 5.2.0 (selected) | None | Pass | 0 | 636K |

Bridge 7 findings were transitive, through `@atlaskit/adf-schema` and `@forge/manifest`. Bridge 5.2.0 contains `requestBitbucket`. See ADR-009 for the decision. Resolver moved from `2.0.2-next.0` to stable `2.0.2`.

### Results after repair

| Check | Result |
| --- | --- |
| Root `npm ci` | Pass. 101 packages; resolver 2.0.2. |
| Frontend `npm ci` | Pass. Bridge 5.2.0, React and ReactDOM 16.14.0, react-scripts 5.0.1, CSS reset 6.16.0. |
| Frontend build (`CI=true`) | Pass. `static/hello-world/build/index.html` generated. |
| Backend tests | Pass, 3 of 3. |
| Frontend tests | Pass, 5 of 5. |
| Mutation check on throwaway copies | Each break failed the expected tests: logging the request, removing the rejection state, removing the unmount guard, and disabling Retry. |
| Production audit | Root 0; frontend 0. |
| Full-tree audit | Root 9 moderate; frontend 73 (11 low, 49 moderate, 13 high). All are outside the production tree. Replacing react-scripts in BR-009 should address most of the frontend findings; this is unverified. |
| ESLint on `src` | Pass with the limited rule set (no configured project lint suite). |
| `forge lint` before the build | One error only: `valid-resource-required` for the missing `static/hello-world/build`. Do not use `forge lint --fix` for this. |
| `forge lint` after the build | Pass: `No issues found.` Run by the human lead from the app root on 2026-10-31. |

npm 11 reported that install scripts for dependencies such as `core-js` were not run. The build and tests pass without them.

Not verified: runtime behaviour in Bitbucket, including Bridge 5.2.0 alongside resolver 2.0.2, and Forge bundling of the new `src/resolvers/getText.js` import. Only the panel smoke test can confirm these. If Bridge 5.2.0 fails there, use Bridge 7.2.1 with the TypeScript `^5.9.3` override.

### Deployment runbook

This section replaces steps 3–6 of the Next-milestone runbook. Each command below requires explicit human approval.

Run from the repository root, in the terminal holding Forge credentials:

```zsh
pwd
npm ci
npm --prefix static/hello-world ci
npm --prefix static/hello-world run build
forge lint
forge deploy --non-interactive --environment development
forge install --environment development
```

At the install prompts, select Bitbucket and enter `https://bitbucket.org/<workspace-slug>/`. Atlassian's Bitbucket tutorial documents only this interactive path; `--site` with a Bitbucket workspace URL is not documented, so a non-interactive install is unverified.

Forge apps are not supported on personal workspaces, and installing to one gives an insufficient permissions error. Use a shared team workspace. The docs do not state which workspace role is required.

The manifest declares one panel, one resolver function, and one static resource, with no `permissions` block. The greeting round trip needs no scopes. Real PR data will need endpoint scopes, a major-version app upgrade review, and separate approval.

Smoke test: expand the panel in a real PR, confirm `Hello, world!` as both author and reviewer, then record workspace, app version, date, and result without secrets.

## First panel round trip (2026-10-31)

| Item | Result |
| --- | --- |
| Environment and version | development, app version 2.0.0 |
| Workspace and repository | `marvlock`, `blastradius-ai` (test repository only; the app code is not stored there) |
| Pull request | #1, `test-panel` → `main` |
| Install | Interactive `forge install --environment development`, selecting Bitbucket and the workspace URL |
| Author check | Pass: the Overview tab shows the `blastradius (default)` panel with `Hello, world!` |
| Reviewer check | **Pending.** Needs a second account in the workspace. |

This confirms in Bitbucket what the local checks could not: the workspace accepts the app, Forge bundled the `src/resolvers/getText.js` import, and Bridge 5.2.0 completes a round trip with resolver 2.0.2. The rejection and Retry state has been tested only locally, not in Bitbucket. Failure-free logs were not separately inspected.

## PR metadata panel (2026-10-31)

Built after approval of `read:pullrequest:bitbucket`. Bitbucket's published [OpenAPI spec](https://api.bitbucket.org/swagger.json) lists that scope and Forge OAuth support for the PR, diff, and diffstat GET endpoints. Atlassian's rendered scope pages could not be read by automated fetch.

| Check | Result |
| --- | --- |
| Frontend tests | Pass, 35 of 35, covering access denial, not found, rate limiting, server and network failures, malformed responses, invalid context, and the wrong pull request ID. |
| Backend tests | Pass, 3 of 3. |
| Frontend build (`CI=true`) | Pass. |
| Mutation check on throwaway copies | All 6 breaks were caught: ID check, context validation, denied mapping, required fields, UUID wrapping, and the low-risk wording. |
| Manifest | YAML parses, and the app ID is unchanged. |
| `forge lint` | Pass: 0 errors, 0 warnings, and 1 approval item for the major version change caused by the new scope. |
| Deploy | Plain deploy stopped on that approval; `--approve MAJOR_VERSION_RULE` deployed it to development. |
| Installation upgrade | Interactive `forge install --upgrade --environment development` on `marvlock`, moving from major version 2. The new version number was not captured. |
| Live panel | Pass as author on PR #1: real title, number and state, author, branches, and source commit `c927fcbd2098`. |

This confirms the context fields, the identifier format reaching Bitbucket, the scope, and the user-context read in the success case. The failure states have not been exercised in Bitbucket.

## Second user check (2026-11-01)

| Item | Result |
| --- | --- |
| Account | Second workspace member with Bitbucket User access. |
| Panel | Forge shows an "Allow access" consent prompt, not the app. |
| Consent | **Blocked.** Atlassian shows: "You don't have access to this app. This application is in development - only the owner of this application may grant it access to their account." |

The app is deployed to development with distribution status Not sharing. Atlassian's docs say such apps are for contributors only, but they do not mention this consent page, so neither adding a contributor nor enabling sharing is confirmed as the fix. This blocks the reviewer check, and judges would hit the same page unless the path through BR-021 resolves it. Every new user will also see the consent prompt once, so install instructions must cover it.

### Result after sharing

After a production deploy, a production install on `marvlock`, and enabling sharing in the developer console, the second account loads both the development and production panels with the correct PR data, including commit `c927fcbd2098`. It also sees the reviewer actions, so the reviewer check passes.

Production scopes at install: `read:pullrequest:bitbucket` only. The exact step that cleared the block was not isolated, and the development panel also recovered. This account belongs to the app owner's organization, so the result does not yet prove the judge path. BR-021 still needs an installation link install by an account outside this workspace.

## TypeScript and tooling migration (2026-11-01)

Replaced react-scripts with Vite 8, Vitest 5, and React 18.3, then converted both packages to strict TypeScript 5.9 (ADR-016). Results below are from a clean `npm ci` of both packages.

| Check | Result |
| --- | --- |
| Typecheck | Pass in both packages, with no `any`, type assertions, non-null assertions, or suppressions in frontend source. |
| Backend tests | Pass, 3 of 3, now through the exported handler. |
| Frontend tests | Pass, 36 of 36. |
| ESLint | Pass across both packages. A sample file confirmed it reports `any`, non-null assertions, and `@ts-ignore`. |
| Frontend build | Pass, 200K, down from 636K. No inline scripts or absolute asset paths. |
| Production audit | 0 in both packages. |
| Full-tree audit | Frontend 0, down from 73. Root 10 moderate, all from one `minimatch` advisory inside the ESLint tooling. It is dev-only, and npm's suggested fix is a downgrade to ESLint 4, so it was not applied. |
| Mutation checks | Caught the logging, stale response, failure message, ID, context, and denied mapping breaks. One survivor exposed that tests did not check each failure's own message; that was fixed and rechecked. |
| Vite build in Bitbucket | Pass: `forge lint` clean, version 3.1.0 deployed to development, and the panel rendered. The screenshot looks the same as the old build by design, and its order relative to the deploy was not recorded. |
| TypeScript backend in Forge | Pass: `forge lint` clean, and version 3.2.0 deployed to development, so Forge bundled and type-checked it. The panel no longer calls the resolver, so this proves the build, not a live invocation. No panel screenshot was taken after 3.2.0. |

Production still runs the React 16 build deployed on 2026-11-01. It is unchanged until the next production deploy, which needs approval.

## Changed files in the panel (2026-11-01)

Added the changed file list under the existing `read:pullrequest:bitbucket` scope, using the pull request diffstat endpoint. Limits agreed with the human lead: at most 200 files and 5 pages, with an explicit incomplete notice beyond that.

| Check | Result |
| --- | --- |
| Typecheck, ESLint, build | Pass. |
| Frontend tests | Pass, 65 of 65, covering pagination, both limits, renamed and removed files, unknown line counts, malformed entries, later-page failures, and unsafe `next` links. |
| Mutation check on throwaway copies | All 12 breaks were caught. |
| Development deploy | Pass: lint clean, version 3.3.0 deployed. |
| Live panel | **Fail for the file list.** PR details load, but Changed files shows the access denied failure on PR #1 as the owner. |

Likely cause, inferred and not observed directly: the pull request diffstat endpoint lists `read:pullrequest:bitbucket`, but it is a 302 redirect to the repository diffstat, which lists `read:repository:bitbucket`. The app does not hold that scope. The failure state and Retry rendered correctly in Bitbucket, and the PR details stayed visible, which is the first live check of a failure state.

The earlier statement that one scope covers the diff and diffstat endpoints was wrong for the same reason: it read each endpoint's scope without following the redirect.

After adding `read:repository:bitbucket` (ADR-017), a deploy, and an installation upgrade, the development panel shows `Changed files (1)` with `README.md (modified, +1 -1)` on PR #1. This confirms the cause, and that Bridge `requestBitbucket` follows the redirect. The real form of `next` is still unproven, because this PR has a single page; a Bitbucket `next` link that fails validation is reported as malformed, not followed. Production still has only `read:pullrequest:bitbucket`.

## Configured impact (2026-11-01)

Added the service map and reverse dependency traversal (ADR-018).

| Check | Result |
| --- | --- |
| Typecheck, ESLint, build | Pass in both packages. |
| Tests | Pass: frontend 159 of 159, backend 3 of 3, covering cycles, diamonds, transitive routes, renames, unmapped files, map validation, missing and oversized maps, and access failures. The Northstar demo map is validated by a test. |
| Mutation check on throwaway copies | All 17 breaks were caught. Removing cycle protection fails the run rather than failing one assertion. |
| Crafted pattern | The first regex matcher hung on `*a*a*a*a*a*a*a*a`. It was replaced with a non-backtracking scanner, and tests now bound the worst cases. |
| Live panel | Pass as author on PR #2 in development, removing `receiptUrl` from the demo payment response: Payment Service changed, with Billing Service, Mobile Checkout, and Partner API downstream, each with the correct owner and route. |

This confirms reading `/src/{commit}/blastradius.json` with the short commit hash from the pull request. Not verified live: the not-configured and invalid map states, unmapped files, and a pull request that edits the map on its source branch. These are covered by tests only.

## Contract evidence (2026-11-01)

Added declared consumer contracts, compared across the pull request's commits (ADR-020).

| Check | Result |
| --- | --- |
| Typecheck, ESLint, build | Pass. |
| Frontend tests | Pass, 209 of 209, covering removed fields, type changes, optional changes, nested and array fields, unsupported schemas, removed and unreadable files, and limits. |
| Mutation check on throwaway copies | All 14 breaks were caught. Two survived at first, exposing a depth test that passed for the wrong reason and untested path encoding. Both tests were fixed and rechecked. |
| Live panel | Pass as author on PR #2 in development: Mobile Checkout shows high severity and high confidence for the removed `receiptUrl`, with the schema file, both commits, and the configured check. Billing Service, which does not declare that field, is clear for its declared fields. |

Companion spike (BR-010), first test: on `marvlock-northstar`, a separate development app returned 401 without its token, and 200 with `KAN-4` and the Checkout API Contract page, including body text, with the token. Test data is fictional.

Second test: a separate app installed on `marvlock` in Bitbucket returned 401 without its own token. With it, the app called the companion's web trigger from Forge and returned `reachedCompanion: true`, status 200, and the same live data. Both apps are throwaway development apps, called by `curl`, not by the BlastRadius panel. The first web trigger URL appeared in a pasted terminal log, so it should be deleted when the spike is cleaned up.

Limits: only top-level `properties`, nested objects, and array `items` are compared. A contract is checked only when its own file changes, and only declared fields are compared, so a clear result does not mean no impact. Schema files must use JSON Schema, and the check does not run the consumer's code.
