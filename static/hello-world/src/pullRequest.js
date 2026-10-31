import { requestBitbucket, view } from '@forge/bridge';

// Failure categories the panel can explain. Each one keeps "we could not check"
// distinct from any statement about the pull request itself.
export const FAILURE = {
  CONTEXT: 'context',
  DENIED: 'denied',
  NOT_FOUND: 'not-found',
  RATE_LIMITED: 'rate-limited',
  UNAVAILABLE: 'unavailable',
  MALFORMED: 'malformed',
};

const BARE_UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const WRAPPED_UUID = /^\{[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\}$/i;
const SLUG = /^[A-Za-z0-9_-]+$/;
const PULL_REQUEST_ID = /^[1-9]\d*$/;

const failure = (kind) => Object.assign(new Error(kind), { kind });

const isText = (value) => typeof value === 'string' && value.length > 0;

// The REST API needs UUIDs in curly braces, and Forge's docs do not state whether
// workspaceId already has them, so accept both forms.
const toPathIdentifier = (value) => {
  const identifier = BARE_UUID.test(value) ? `{${value}}` : value;

  if (typeof identifier !== 'string' || !(WRAPPED_UUID.test(identifier) || SLUG.test(identifier))) {
    throw failure(FAILURE.CONTEXT);
  }

  return identifier;
};

// Context comes from the browser, so validate it before building a request path.
// The user-context request below is what enforces access, not these values.
const readLocation = (context) => {
  const pullRequestId = context?.extension?.pullRequest?.id;

  if (!PULL_REQUEST_ID.test(String(pullRequestId))) {
    throw failure(FAILURE.CONTEXT);
  }

  return {
    workspace: toPathIdentifier(context.workspaceId),
    repository: toPathIdentifier(context.extension.repository?.uuid),
    pullRequestId: Number(pullRequestId),
  };
};

const failureForStatus = (status) => {
  if (status === 401 || status === 403) {
    return FAILURE.DENIED;
  }
  if (status === 404) {
    return FAILURE.NOT_FOUND;
  }
  if (status === 429) {
    return FAILURE.RATE_LIMITED;
  }
  return FAILURE.UNAVAILABLE;
};

// Reject incomplete data rather than showing a partial pull request. The author
// is the exception: it stays null because a missing account is a real unknown.
const toSummary = (body, expectedId) => {
  const summary = {
    id: body?.id,
    title: body?.title,
    state: body?.state,
    author: isText(body?.author?.display_name) ? body.author.display_name : null,
    sourceBranch: body?.source?.branch?.name,
    destinationBranch: body?.destination?.branch?.name,
    sourceCommit: body?.source?.commit?.hash,
  };
  const required = [
    summary.title,
    summary.state,
    summary.sourceBranch,
    summary.destinationBranch,
    summary.sourceCommit,
  ];

  if (summary.id !== expectedId || !required.every(isText)) {
    throw failure(FAILURE.MALFORMED);
  }

  return summary;
};

/**
 * Loads the pull request shown in this panel as the current Bitbucket user.
 *
 * @returns {Promise<object>} Validated summary of the pull request.
 * @throws {Error} With a `kind` from FAILURE.
 */
export async function loadPullRequest() {
  const { workspace, repository, pullRequestId } = readLocation(await view.getContext());

  let response;
  try {
    response = await requestBitbucket(
      `/2.0/repositories/${workspace}/${repository}/pullrequests/${pullRequestId}`
    );
  } catch {
    throw failure(FAILURE.UNAVAILABLE);
  }

  if (!response.ok) {
    throw failure(failureForStatus(response.status));
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw failure(FAILURE.MALFORMED);
  }

  return toSummary(body, pullRequestId);
}
