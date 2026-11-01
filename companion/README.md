# BlastRadius Companion

Optional Forge app for Jira and Confluence. It lets the BlastRadius app on Bitbucket read the title, status, and a short excerpt of items that a repository's service map references. See [ADR-021 and ADR-022](../docs/DECISIONS.md).

Run `npm test` and `npm run typecheck` here. Install it on Jira first, then on Confluence on the same site. A Jira admin creates the connection token from the app's admin page, and a Bitbucket workspace owner pastes the URL and token into BlastRadius workspace settings.
