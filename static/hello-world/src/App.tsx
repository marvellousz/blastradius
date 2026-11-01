import { useEffect, useState } from 'react';
import {
  FAILURE,
  PullRequestLoadError,
  loadPullRequest,
  type FailureKind,
  type PullRequestSummary,
} from './pullRequest';

const FAILURE_MESSAGES: Record<FailureKind, string> = {
  [FAILURE.CONTEXT]: 'BlastRadius could not identify this pull request.',
  [FAILURE.DENIED]: 'BlastRadius does not have access to this pull request for your account.',
  [FAILURE.NOT_FOUND]: 'Bitbucket could not find this pull request, or your account cannot view it.',
  [FAILURE.RATE_LIMITED]: 'Bitbucket is limiting requests right now.',
  [FAILURE.UNAVAILABLE]: 'BlastRadius could not reach Bitbucket.',
  [FAILURE.MALFORMED]: 'Bitbucket returned a response BlastRadius could not read.',
};

function App() {
  const [pullRequest, setPullRequest] = useState<PullRequestSummary | null>(null);
  const [failureKind, setFailureKind] = useState<FailureKind | null>(null);
  // Incrementing this re-runs the effect below, which is how Retry works.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after unmount or after a newer attempt.
    let ignored = false;

    setPullRequest(null);
    setFailureKind(null);

    loadPullRequest()
      .then((result) => {
        if (!ignored) {
          setPullRequest(result);
        }
      })
      .catch((error: unknown) => {
        if (!ignored) {
          setFailureKind(error instanceof PullRequestLoadError ? error.kind : FAILURE.UNAVAILABLE);
        }
      });

    return () => {
      ignored = true;
    };
  }, [attempt]);

  if (failureKind) {
    return (
      <div role="alert">
        <p>{FAILURE_MESSAGES[failureKind]} This does not mean the pull request is low risk.</p>
        <button type="button" onClick={() => setAttempt(attempt + 1)}>
          Retry
        </button>
      </div>
    );
  }

  if (!pullRequest) {
    return <div>Loading pull request...</div>;
  }

  return (
    <div>
      <p>
        <strong>{pullRequest.title}</strong>
      </p>
      <ul>
        <li>Pull request #{pullRequest.id} ({pullRequest.state})</li>
        <li>Author: {pullRequest.author ?? 'Unknown'}</li>
        <li>Branches: {pullRequest.sourceBranch} → {pullRequest.destinationBranch}</li>
        <li>Source commit: {pullRequest.sourceCommit}</li>
      </ul>
      <p>BlastRadius has not analyzed this pull request yet.</p>
    </div>
  );
}

export default App;
