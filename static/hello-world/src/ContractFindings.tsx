import FailureNotice from './FailureNotice';
import type { ContractResult, FieldChange } from './analysis/contract';
import { MAX_CONTRACT_FILES, type ContractEvidence } from './contractEvidence';
import type { FailureKind } from './pullRequest';

// Severity is how much a change could hurt. Confidence is how directly the
// evidence shows it. They are reported separately so neither hides the other.
const VERDICTS: Record<ContractResult['status'], string> = {
  breaking: 'Severity: High. Confidence: High.',
  review: 'Severity: Medium. Confidence: High.',
  unknown: 'Severity: Unknown. Confidence: Unknown.',
  clear: 'No declared field changed.',
};

const describeChange = (change: FieldChange) => {
  switch (change.change) {
    case 'removed':
      return `${change.field} was removed`;
    case 'type-changed':
      return `${change.field} changed type from ${change.before ?? 'unknown'} to ${change.after ?? 'unknown'}`;
    case 'now-optional':
      return `${change.field} is no longer required`;
    case 'not-in-schema':
      return `${change.field} is declared but not in the destination schema`;
  }
};

interface ContractResultItemProps {
  result: ContractResult;
  commits: string;
}

function ContractResultItem({ result, commits }: ContractResultItemProps) {
  const { consumer, provider, contract, status, changes, reason } = result;

  return (
    <li>
      <p>
        <strong>{consumer.name} on {provider.name}.</strong> {VERDICTS[status]}
      </p>
      {changes.length > 0 && (
        <ul>
          {changes.map((change) => <li key={change.field}>{describeChange(change)}</li>)}
        </ul>
      )}
      {reason && <p>{reason}</p>}
      {status === 'clear' && (
        <p>This covers only the declared fields, and does not rule out other impact.</p>
      )}
      <p>
        Evidence: {contract.file} compared at {commits}, for fields declared in the service map.
      </p>
      {contract.verification && status !== 'clear' && (
        <p>Configured check: {contract.verification}</p>
      )}
    </li>
  );
}

interface ContractFindingsProps {
  evidence: ContractEvidence | null;
  failureKind: FailureKind | null;
  onRetry: () => void;
  commits: string;
}

function ContractFindings({ evidence, failureKind, onRetry, commits }: ContractFindingsProps) {
  if (failureKind) {
    return (
      <>
        <p>Contract checks</p>
        <FailureNotice kind={failureKind} onRetry={onRetry} />
      </>
    );
  }

  if (!evidence) {
    return <p>Checking contracts...</p>;
  }

  if (evidence.results.length === 0) {
    return <p>No declared contract files changed.</p>;
  }

  return (
    <>
      <p>Contract checks</p>
      {evidence.truncated && (
        <p role="status">
          More than {MAX_CONTRACT_FILES} contract files changed, so some were not compared.
        </p>
      )}
      <ul>
        {evidence.results.map((result) => (
          <ContractResultItem
            key={`${result.consumer.id}:${result.provider.id}:${result.contract.file}`}
            result={result}
            commits={commits}
          />
        ))}
      </ul>
    </>
  );
}

export default ContractFindings;
