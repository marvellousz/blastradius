import ChangedFiles from './ChangedFiles';
import FailureNotice from './FailureNotice';
import { loadPullRequest } from './pullRequest';
import { useLoader } from './useLoader';

function App() {
  const { data: pullRequest, failureKind, retry } = useLoader(loadPullRequest);

  if (failureKind) {
    return <FailureNotice kind={failureKind} onRetry={retry} />;
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
      <ChangedFiles />
    </div>
  );
}

export default App;
