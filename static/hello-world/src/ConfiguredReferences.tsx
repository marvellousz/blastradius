import type { ConfiguredReference, Service } from './analysis/serviceMap';

const referenceId = (reference: ConfiguredReference) =>
  reference.type === 'jira' ? reference.key : reference.url;

interface ConfiguredReferencesProps {
  services: Service[];
}

function ConfiguredReferences({ services }: ConfiguredReferencesProps) {
  const entries = new Map(services.flatMap(({ name, references }) =>
    references.map((reference) => [referenceId(reference), { reference, name }] as const)
  ));

  if (entries.size === 0) {
    return null;
  }

  return (
    <>
      <p>Configured references</p>
      <p>Listed in the service map. These titles were not fetched from Jira or Confluence.</p>
      <ul>
        {[...entries].map(([id, { reference, name }]) => (
          <li key={id}>
            {reference.type === 'jira' ? (
              <>{reference.key}{reference.title && `: ${reference.title}`}</>
            ) : (
              <a href={reference.url} target="_blank" rel="noreferrer">
                {reference.title ?? reference.url}
              </a>
            )}
            {` (${name})`}
          </li>
        ))}
      </ul>
    </>
  );
}

export default ConfiguredReferences;
