import ExternalLink from './ExternalLink';
import type { LiveContext } from './analysis/liveContext';
import { confluencePageId } from './analysis/references';
import type { ConfiguredReference, Service } from './analysis/serviceMap';
import { loadLiveContext } from './liveContextLoader';
import { useLoader } from './useLoader';

const referenceId = (reference: ConfiguredReference) =>
  reference.type === 'jira' ? reference.key : reference.url;

interface ReferenceItemProps {
  reference: ConfiguredReference;
  service: string;
  live: LiveContext | null;
}

function ReferenceItem({ reference, service, live }: ReferenceItemProps) {
  const liveItems = live?.status === 'ok' ? live : null;

  if (reference.type === 'jira') {
    const item = liveItems?.jira.find(({ key }) => key === reference.key);

    if (item?.title) {
      return <li>Live: {item.key}: {item.title} ({item.status ?? 'status unknown'}) ({service})</li>;
    }

    return (
      <li>
        {reference.key}{reference.title && `: ${reference.title}`}
        {` (${service})`}{item && '. The connected app could not read this item.'}
      </li>
    );
  }

  const id = confluencePageId(reference.url);
  const page = liveItems?.confluence.find((candidate) => candidate.id === id);

  return (
    <li>
      {page?.title && 'Live: '}
      <ExternalLink href={reference.url}>{page?.title ?? reference.title ?? reference.url}</ExternalLink>
      {page?.version != null && `, version ${page.version}`}
      {` (${service})`}
      {page && !page.title && '. The connected app could not read this page.'}
      {page?.excerpt && <p>{page.excerpt}</p>}
    </li>
  );
}

const describeSource = (live: LiveContext | null) => {
  if (live?.status === 'ok') {
    return 'Items marked Live were read by the connected app, not with your own access. Others are listed in the service map and were not fetched.';
  }
  if (live?.status === 'unavailable') {
    return 'Live data is unavailable right now. These are listed in the service map and were not fetched.';
  }
  return 'Listed in the service map. These titles were not fetched from Jira or Confluence.';
};

interface ConfiguredReferencesProps {
  services: Service[];
}

function ConfiguredReferences({ services }: ConfiguredReferencesProps) {
  const { data: live } = useLoader(loadLiveContext);
  const entries = new Map(services.flatMap(({ name, references }) =>
    references.map((reference) => [referenceId(reference), { reference, name }] as const)
  ));

  if (entries.size === 0) {
    return null;
  }

  return (
    <>
      <p>References</p>
      <p>{describeSource(live)}</p>
      <ul>
        {[...entries].map(([id, { reference, name }]) => (
          <ReferenceItem key={id} reference={reference} service={name} live={live} />
        ))}
      </ul>
    </>
  );
}

export default ConfiguredReferences;
