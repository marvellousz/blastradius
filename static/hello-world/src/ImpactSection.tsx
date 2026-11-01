import { useCallback, useMemo } from 'react';
import FailureNotice from './FailureNotice';
import { computeImpact, type ChangedPath } from './analysis/impact';
import type { Service, ServiceMap } from './analysis/serviceMap';
import { SERVICE_MAP_FILE, loadServiceMap } from './serviceMapLoader';
import { useLoader } from './useLoader';

const NOT_LOW_RISK = 'This does not mean the pull request is low risk.';
const MAX_UNMAPPED_SHOWN = 20;

const describeOwner = (service: Service) => service.owner ?? 'owner not configured';

interface ImpactDetailsProps {
  map: ServiceMap;
  files: ChangedPath[];
  filesTruncated: boolean;
}

function ImpactDetails({ map, files, filesTruncated }: ImpactDetailsProps) {
  const { changed, affected, unmapped } = useMemo(() => computeImpact(map, files), [map, files]);

  return (
    <>
      <p>From the configured service map. These are relationships to review, not proven impact.</p>
      {filesTruncated && (
        <p role="status">
          The changed file list is incomplete, so this result may miss affected services.
        </p>
      )}
      {changed.length === 0 ? (
        <p>No changed files match a configured service. {NOT_LOW_RISK}</p>
      ) : (
        <>
          <p>Changed services</p>
          <ul>
            {changed.map(({ service, files: serviceFiles }) => (
              <li key={service.id}>
                {service.name} ({describeOwner(service)}, {serviceFiles.length} changed{' '}
                {serviceFiles.length === 1 ? 'file' : 'files'})
              </li>
            ))}
          </ul>
          {affected.length === 0 ? (
            <p>No downstream services are configured for these changes.</p>
          ) : (
            <>
              <p>Downstream services</p>
              <ul>
                {affected.map(({ service, route }) => (
                  <li key={service.id}>
                    {service.name} ({describeOwner(service)}):{' '}
                    {route.map((step) => step.name).join(' → ')}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {unmapped.length > 0 && (
        <>
          <p>Not in the map, so impact is unknown ({unmapped.length})</p>
          <ul>
            {unmapped.slice(0, MAX_UNMAPPED_SHOWN).map((path) => <li key={path}>{path}</li>)}
          </ul>
          {unmapped.length > MAX_UNMAPPED_SHOWN && (
            <p>And {unmapped.length - MAX_UNMAPPED_SHOWN} more.</p>
          )}
        </>
      )}
    </>
  );
}

interface ImpactSectionProps {
  destinationCommit: string;
  files: ChangedPath[];
  filesTruncated: boolean;
}

function ImpactSection({ destinationCommit, files, filesTruncated }: ImpactSectionProps) {
  const load = useCallback(() => loadServiceMap(destinationCommit), [destinationCommit]);
  const { data, failureKind, retry } = useLoader(load);

  let content;

  if (failureKind) {
    content = <FailureNotice kind={failureKind} onRetry={retry} />;
  } else if (!data) {
    content = <p>Loading service map...</p>;
  } else if (data.status === 'not-configured') {
    content = (
      <p>
        No {SERVICE_MAP_FILE} was found on the destination branch, so impact is not configured.{' '}
        {NOT_LOW_RISK}
      </p>
    );
  } else if (data.status === 'invalid') {
    content = (
      <div role="alert">
        <p>{SERVICE_MAP_FILE} could not be used, so impact is unknown. {NOT_LOW_RISK}</p>
        <ul>
          {data.problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      </div>
    );
  } else {
    content = <ImpactDetails map={data.map} files={files} filesTruncated={filesTruncated} />;
  }

  return (
    <section>
      <p>
        <strong>Configured impact</strong>
      </p>
      {content}
    </section>
  );
}

export default ImpactSection;
