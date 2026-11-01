import { useMemo } from 'react';
import { findReferences } from './analysis/references';
import type { PullRequestSummary } from './pullRequest';

interface FoundReferencesProps {
  pullRequest: PullRequestSummary;
}

function FoundReferences({ pullRequest }: FoundReferencesProps) {
  const { keys, confluenceLinks } = useMemo(() => findReferences(pullRequest), [pullRequest]);

  if (keys.length === 0 && confluenceLinks.length === 0) {
    return null;
  }

  return (
    <section>
      <p>
        <strong>References in this pull request</strong>
      </p>
      <p>Found in the pull request text. These were not checked in Jira or Confluence.</p>
      <ul>
        {keys.map(({ key, sources }) => <li key={key}>{key} (from {sources.join(', ')})</li>)}
        {confluenceLinks.map((link) => (
          <li key={link}>
            <a href={link} target="_blank" rel="noreferrer">{link}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default FoundReferences;
