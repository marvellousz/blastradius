import FailureNotice from './FailureNotice';
import ImpactSection from './ImpactSection';
import { MAX_FILES, loadChangedFiles, type ChangedFile } from './changedFiles';
import { useLoader } from './useLoader';

const describeLines = ({ linesAdded, linesRemoved }: ChangedFile) =>
  linesAdded === null || linesRemoved === null
    ? 'line counts unknown'
    : `+${linesAdded} -${linesRemoved}`;

interface ChangedFilesProps {
  sourceCommit: string;
  destinationCommit: string;
}

function ChangedFiles({ sourceCommit, destinationCommit }: ChangedFilesProps) {
  const { data, failureKind, retry } = useLoader(loadChangedFiles);

  if (failureKind) {
    return (
      <section>
        <p>
          <strong>Changed files</strong>
        </p>
        <FailureNotice kind={failureKind} onRetry={retry} />
      </section>
    );
  }

  if (!data) {
    return <p>Loading changed files...</p>;
  }

  return (
    <>
      <ImpactSection
        sourceCommit={sourceCommit}
        destinationCommit={destinationCommit}
        files={data.files}
        filesTruncated={data.truncated}
      />
      <section>
        <p>
          <strong>Changed files ({data.truncated ? `first ${MAX_FILES}` : data.files.length})</strong>
        </p>
        {data.truncated && (
          <p role="status">
            This pull request has more files than BlastRadius can show, so this list is incomplete.
          </p>
        )}
        {data.files.length === 0 ? (
          <p>Bitbucket reported no changed files.</p>
        ) : (
          <ul>
            {data.files.map((file) => (
              <li key={`${file.status}:${file.previousPath ?? ''}:${file.path}`}>
                {file.previousPath ? `${file.previousPath} → ${file.path}` : file.path}
                {` (${file.status}, ${describeLines(file)})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default ChangedFiles;
