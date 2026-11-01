import { requestBitbucket, view } from '@forge/bridge';
import { isText, readField } from './validation';

// Failure categories the panel can explain. Each one keeps "we could not check"
// distinct from any statement about the pull request itself.
export const FAILURE = {
  CONTEXT: 'context',
  DENIED: 'denied',
  NOT_FOUND: 'not-found',
  RATE_LIMITED: 'rate-limited',
  UNAVAILABLE: 'unavailable',
  MALFORMED: 'malformed',
} as const;

export type FailureKind = (typeof FAILURE)[keyof typeof FAILURE];

export class PullRequestLoadError extends Error {
  readonly kind: FailureKind;

  constructor(kind: FailureKind) {
    super(kind);
    this.name = 'PullRequestLoadError';
    this.kind = kind;
  }
}

export interface PullRequestSummary {
  id: number;
  title: string;
  state: string;
  // Null means unknown: Bitbucket can omit the account for a removed user.
  author: string | null;
  sourceBranch: string;
  destinationBranch: string;
  sourceCommit: string;
}

interface PullRequestLocation {
  workspace: string;
  repository: string;
  pullRequestId: number;
}

const BARE_UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const WRAPPED_UUID = /^\{[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\}$/i;
const SLUG = /^[A-Za-z0-9_-]+$/;
const PULL_REQUEST_ID = /^[1-9]\d*$/;

// The REST API needs UUIDs in curly braces, and Forge's docs do not state whether
// workspaceId already has them, so accept both forms.
const toPathIdentifier = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new PullRequestLoadError(FAILURE.CONTEXT);
  }

  const identifier = BARE_UUID.test(value) ? `{${value}}` : value;

  if (!WRAPPED_UUID.test(identifier) && !SLUG.test(identifier)) {
    throw new PullRequestLoadError(FAILURE.CONTEXT);
  }

  return identifier;
};

// Context comes from the browser, so validate it before building a request path.
// The user-context request below is what enforces access, not these values.
const readLocation = (context: unknown): PullRequestLocation => {
  const pullRequestId = String(readField(context, 'extension', 'pullRequest', 'id'));

  if (!PULL_REQUEST_ID.test(pullRequestId)) {
    throw new PullRequestLoadError(FAILURE.CONTEXT);
  }

  return {
    workspace: toPathIdentifier(readField(context, 'workspaceId')),
    repository: toPathIdentifier(readField(context, 'extension', 'repository', 'uuid')),
    pullRequestId: Number(pullRequestId),
  };
};

const failureForStatus = (status: number): FailureKind => {
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
const toSummary = (body: unknown, expectedId: number): PullRequestSummary => {
  const title = readField(body, 'title');
  const state = readField(body, 'state');
  const author = readField(body, 'author', 'display_name');
  const sourceBranch = readField(body, 'source', 'branch', 'name');
  const destinationBranch = readField(body, 'destination', 'branch', 'name');
  const sourceCommit = readField(body, 'source', 'commit', 'hash');

  if (
    readField(body, 'id') !== expectedId ||
    !isText(title) ||
    !isText(state) ||
    !isText(sourceBranch) ||
    !isText(destinationBranch) ||
    !isText(sourceCommit)
  ) {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }

  return {
    id: expectedId,
    title,
    state,
    author: isText(author) ? author : null,
    sourceBranch,
    destinationBranch,
    sourceCommit,
  };
};

export const readPullRequestLocation = async (): Promise<PullRequestLocation> =>
  readLocation(await view.getContext());

export const pullRequestPath = ({ workspace, repository, pullRequestId }: PullRequestLocation) =>
  `/2.0/repositories/${workspace}/${repository}/pullrequests/${pullRequestId}`;

/**
 * Requests a Bitbucket path as the current user and returns the parsed body.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function requestJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await requestBitbucket(path);
  } catch {
    throw new PullRequestLoadError(FAILURE.UNAVAILABLE);
  }

  if (!response.ok) {
    throw new PullRequestLoadError(failureForStatus(response.status));
  }

  try {
    return await response.json();
  } catch {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }
}

/**
 * Loads the pull request shown in this panel as the current Bitbucket user.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function loadPullRequest(): Promise<PullRequestSummary> {
  const location = await readPullRequestLocation();

  return toSummary(await requestJson(pullRequestPath(location)), location.pullRequestId);
}
