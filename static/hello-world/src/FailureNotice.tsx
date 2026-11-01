import { FAILURE, type FailureKind } from './pullRequest';

const FAILURE_MESSAGES: Record<FailureKind, string> = {
  [FAILURE.CONTEXT]: 'BlastRadius could not identify this pull request.',
  [FAILURE.DENIED]: 'Bitbucket denied access. Your account or the BlastRadius app may not have permission.',
  [FAILURE.NOT_FOUND]: 'Bitbucket could not find this pull request, or your account cannot view it.',
  [FAILURE.RATE_LIMITED]: 'Bitbucket is limiting requests right now.',
  [FAILURE.UNAVAILABLE]: 'BlastRadius could not reach Bitbucket.',
  [FAILURE.MALFORMED]: 'Bitbucket returned a response BlastRadius could not read.',
};

interface FailureNoticeProps {
  kind: FailureKind;
  onRetry: () => void;
}

function FailureNotice({ kind, onRetry }: FailureNoticeProps) {
  return (
    <div role="alert">
      <p>{FAILURE_MESSAGES[kind]} This does not mean the pull request is low risk.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export default FailureNotice;
