import { isText, readField } from '../validation';
import { isValidPathPattern } from './pathPattern';

// Pure logic with no Forge or React imports, so the backend can reuse it later.

export const MAX_SERVICES = 500;
export const MAX_DEPENDENCIES = 2000;
const MAX_PATHS_PER_SERVICE = 50;
const MAX_TEXT_LENGTH = 200;
const MAX_CONTRACT_FIELDS = 100;
// Listing every problem in a broken map would swamp the panel.
const MAX_PROBLEMS = 5;

const SERVICE_ID = /^[a-z0-9][a-z0-9-]*$/;
const FIELD_PATH = /^[A-Za-z0-9_$-]+(\.[A-Za-z0-9_$-]+)*$/;

export interface Service {
  id: string;
  name: string;
  // Null means the map does not name an owner, which stays visibly unknown.
  owner: string | null;
  paths: string[];
}

// What a consumer declares it relies on in a provider's JSON Schema file.
export interface Contract {
  file: string;
  // Dotted field paths, such as `customer.id`.
  fields: string[];
  // A team-written check to run, shown as configured text.
  verification: string | null;
}

export interface Dependency {
  // `from` depends on `to`, so a change to `to` can affect `from`.
  from: string;
  to: string;
  type: 'depends_on';
  note: string | null;
  contract: Contract | null;
}

export interface ServiceMap {
  version: 1;
  services: Service[];
  dependencies: Dependency[];
}

export type ServiceMapParseResult =
  | { valid: true; map: ServiceMap }
  | { valid: false; problems: string[] };

const isBoundedText = (value: unknown): value is string =>
  isText(value) && value.length <= MAX_TEXT_LENGTH;

const readOptionalText = (source: unknown, field: string, label: string, problems: string[]) => {
  const value = readField(source, field);

  if (value === undefined || value === null) {
    return null;
  }
  if (!isBoundedText(value)) {
    problems.push(`${label} has an invalid ${field}.`);
    return null;
  }
  return value;
};

const parseService = (source: unknown, index: number, problems: string[]): Service | null => {
  const label = `Service ${index + 1}`;
  const id = readField(source, 'id');
  const name = readField(source, 'name');
  const paths = readField(source, 'paths');
  const owner = readOptionalText(source, 'owner', label, problems);

  if (typeof id !== 'string' || !SERVICE_ID.test(id) || id.length > MAX_TEXT_LENGTH) {
    problems.push(`${label} has an invalid id.`);
    return null;
  }
  if (!isBoundedText(name)) {
    problems.push(`Service "${id}" has an invalid name.`);
    return null;
  }
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_PATHS_PER_SERVICE) {
    problems.push(`Service "${id}" needs between 1 and ${MAX_PATHS_PER_SERVICE} paths.`);
    return null;
  }

  const validPaths = paths.filter(
    (path): path is string => typeof path === 'string' && isValidPathPattern(path)
  );

  if (validPaths.length !== paths.length) {
    problems.push(`Service "${id}" has an invalid path pattern.`);
    return null;
  }

  return { id, name, owner, paths: validPaths };
};

const parseContract = (source: unknown, label: string, problems: string[]): Contract | null => {
  const contract = readField(source, 'contract');

  if (contract === undefined || contract === null) {
    return null;
  }

  const file = readField(contract, 'file');
  const fields = readField(contract, 'fields');
  const verification = readOptionalText(contract, 'verification', `${label} contract`, problems);

  if (typeof file !== 'string' || file.includes('*') || !isValidPathPattern(file)) {
    problems.push(`${label} contract has an invalid file.`);
    return null;
  }
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > MAX_CONTRACT_FIELDS) {
    problems.push(`${label} contract needs between 1 and ${MAX_CONTRACT_FIELDS} fields.`);
    return null;
  }

  const validFields = fields.filter(
    (field): field is string => typeof field === 'string' && FIELD_PATH.test(field) && field.length <= MAX_TEXT_LENGTH
  );

  if (validFields.length !== fields.length) {
    problems.push(`${label} contract has an invalid field.`);
    return null;
  }

  return { file, fields: validFields, verification };
};

const parseDependency = (
  source: unknown,
  index: number,
  knownIds: Set<string>,
  problems: string[]
): Dependency | null => {
  const label = `Dependency ${index + 1}`;
  const from = readField(source, 'from');
  const to = readField(source, 'to');
  const note = readOptionalText(source, 'note', label, problems);
  const contract = parseContract(source, label, problems);

  if (readField(source, 'type') !== 'depends_on') {
    problems.push(`${label} must have the type "depends_on".`);
    return null;
  }
  if (typeof from !== 'string' || !knownIds.has(from)) {
    problems.push(`${label} has an unknown "from" service.`);
    return null;
  }
  if (typeof to !== 'string' || !knownIds.has(to)) {
    problems.push(`${label} has an unknown "to" service.`);
    return null;
  }
  if (from === to) {
    problems.push(`${label} cannot depend on itself.`);
    return null;
  }

  return { from, to, type: 'depends_on', note, contract };
};

/**
 * Validates a parsed `blastradius.json`. Any problem rejects the whole map,
 * because a partly applied map could silently hide an affected service.
 */
export const parseServiceMap = (source: unknown): ServiceMapParseResult => {
  const problems: string[] = [];
  const rawServices = readField(source, 'services');
  const rawDependencies = readField(source, 'dependencies');

  if (readField(source, 'version') !== 1) {
    problems.push('The map must have "version": 1.');
  }
  if (!Array.isArray(rawServices) || rawServices.length > MAX_SERVICES) {
    problems.push(`"services" must be a list of at most ${MAX_SERVICES} services.`);
  }
  if (!Array.isArray(rawDependencies) || rawDependencies.length > MAX_DEPENDENCIES) {
    problems.push(`"dependencies" must be a list of at most ${MAX_DEPENDENCIES} dependencies.`);
  }
  if (!Array.isArray(rawServices) || !Array.isArray(rawDependencies) || problems.length > 0) {
    return { valid: false, problems };
  }

  const services = rawServices
    .map((service, index) => parseService(service, index, problems))
    .filter((service) => service !== null);
  const ids = services.map((service) => service.id);
  const knownIds = new Set(ids);

  if (knownIds.size !== ids.length) {
    problems.push('Service ids must be unique.');
  }

  // Skip dependency checks after a service error, which would only add noise.
  const dependencies = problems.length > 0
    ? []
    : rawDependencies
      .map((dependency, index) => parseDependency(dependency, index, knownIds, problems))
      .filter((dependency) => dependency !== null);

  return problems.length > 0
    ? { valid: false, problems: problems.slice(0, MAX_PROBLEMS) }
    : { valid: true, map: { version: 1, services, dependencies } };
};
