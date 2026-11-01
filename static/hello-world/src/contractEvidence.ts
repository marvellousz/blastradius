import { compareContract, type ContractResult, type SchemaDocument } from './analysis/contract';
import type { ChangedPath } from './analysis/impact';
import type { ServiceMap } from './analysis/serviceMap';
import { readRepositoryFile } from './repositoryFile';

// Each contract file costs two Bitbucket requests, so keep the panel responsive.
export const MAX_CONTRACT_FILES = 10;

export interface ContractEvidence {
  results: ContractResult[];
  // True when more contract files changed than were compared.
  truncated: boolean;
}

const STATUS_ORDER: ContractResult['status'][] = ['breaking', 'review', 'unknown', 'clear'];

const readSchema = async (commit: string, path: string): Promise<SchemaDocument> => {
  const file = await readRepositoryFile(commit, path);

  if (file.status === 'missing') {
    return { status: 'missing' };
  }
  if (file.status === 'too-large') {
    return { status: 'unreadable' };
  }

  try {
    return { status: 'parsed', value: JSON.parse(file.text) };
  } catch {
    return { status: 'unreadable' };
  }
};

/**
 * Compares declared contracts whose schema file this pull request changed.
 * Schemas are read at both commits as the current user.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function loadContractEvidence(
  map: ServiceMap,
  files: ChangedPath[],
  sourceCommit: string,
  destinationCommit: string
): Promise<ContractEvidence> {
  const servicesById = new Map(map.services.map((service) => [service.id, service]));
  const changedPaths = new Set(files.flatMap(({ path, previousPath }) =>
    previousPath ? [path, previousPath] : [path]
  ));
  const declared = map.dependencies.flatMap(({ from, to, contract }) => {
    const consumer = servicesById.get(from);
    const provider = servicesById.get(to);

    return consumer && provider && contract && changedPaths.has(contract.file)
      ? [{ consumer, provider, contract }]
      : [];
  });
  const uniqueFiles = [...new Set(declared.map(({ contract }) => contract.file))];
  const comparedFiles = uniqueFiles.slice(0, MAX_CONTRACT_FILES);
  const schemas = new Map(await Promise.all(comparedFiles.map(async (file) => [
    file,
    {
      before: await readSchema(destinationCommit, file),
      after: await readSchema(sourceCommit, file),
    },
  ] as const)));

  const results = declared.flatMap(({ consumer, provider, contract }) => {
    const schema = schemas.get(contract.file);

    return schema ? [compareContract({ consumer, provider, contract, ...schema })] : [];
  });

  return {
    results: results.sort(
      (left, right) => STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status)
    ),
    truncated: uniqueFiles.length > comparedFiles.length,
  };
}
