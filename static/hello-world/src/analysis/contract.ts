import { isRecord, readField } from '../validation';
import type { Contract, Service } from './serviceMap';

// Pure logic with no Forge or React imports, so the backend can reuse it later.

const MAX_DEPTH = 12;
const MAX_FIELDS = 2000;
// These keywords change a schema's meaning in ways a property walk cannot see,
// so comparing past them could report a false "clear".
const UNSUPPORTED_KEYWORDS = ['$ref', 'allOf', 'anyOf', 'oneOf', 'not', 'if'];

interface SchemaField {
  type: string | null;
  required: boolean;
}

export type SchemaDocument =
  | { status: 'missing' }
  | { status: 'unreadable' }
  | { status: 'parsed'; value: unknown };

export type FieldChange =
  | { field: string; change: 'removed' }
  | { field: string; change: 'type-changed'; before: string | null; after: string | null }
  | { field: string; change: 'now-optional' }
  | { field: string; change: 'not-in-schema' };

// `breaking` and `review` come from a retrieved schema change. `clear` covers
// only the declared fields, and `unknown` means the comparison could not finish.
export type ContractStatus = 'breaking' | 'review' | 'unknown' | 'clear';

export interface ContractResult {
  consumer: Service;
  provider: Service;
  contract: Contract;
  status: ContractStatus;
  changes: FieldChange[];
  // Why a comparison could not finish, when status is `unknown`.
  reason: string | null;
}

const describeType = (type: unknown): string | null => {
  if (typeof type === 'string') {
    return type;
  }
  if (Array.isArray(type) && type.every((entry) => typeof entry === 'string')) {
    return [...type].sort().join(' | ');
  }
  return null;
};

const collectFields = (
  node: unknown,
  prefix: string,
  depth: number,
  fields: Map<string, SchemaField>
): boolean => {
  if (depth > MAX_DEPTH || UNSUPPORTED_KEYWORDS.some((key) => readField(node, key) !== undefined)) {
    return false;
  }

  // Array items share their parent's path, so `lines.sku` covers a list of objects.
  const items = readField(node, 'items');

  if (items !== undefined && !collectFields(items, prefix, depth + 1, fields)) {
    return false;
  }

  const properties = readField(node, 'properties');

  if (properties === undefined) {
    return true;
  }
  if (!isRecord(properties)) {
    return false;
  }

  const required = readField(node, 'required');

  for (const [name, child] of Object.entries(properties)) {
    const path = prefix ? `${prefix}.${name}` : name;

    if (fields.size >= MAX_FIELDS) {
      return false;
    }

    fields.set(path, {
      type: describeType(readField(child, 'type')),
      required: Array.isArray(required) && required.includes(name),
    });

    if (!collectFields(child, path, depth + 1, fields)) {
      return false;
    }
  }

  return true;
};

const readSchemaFields = (schema: unknown): Map<string, SchemaField> | null => {
  const fields = new Map<string, SchemaField>();

  return isRecord(schema) && collectFields(schema, '', 0, fields) ? fields : null;
};

const compareField = (
  field: string,
  before: SchemaField | undefined,
  after: SchemaField | undefined
): FieldChange | null => {
  if (!before) {
    return { field, change: 'not-in-schema' };
  }
  if (!after) {
    return { field, change: 'removed' };
  }
  if (before.type !== after.type) {
    return { field, change: 'type-changed', before: before.type, after: after.type };
  }
  if (before.required && !after.required) {
    return { field, change: 'now-optional' };
  }
  return null;
};

const statusFor = (changes: FieldChange[]): ContractStatus => {
  const kinds = changes.map(({ change }) => change);

  if (kinds.includes('removed') || kinds.includes('type-changed')) {
    return 'breaking';
  }
  if (kinds.includes('now-optional')) {
    return 'review';
  }
  return kinds.includes('not-in-schema') ? 'unknown' : 'clear';
};

interface ContractInput {
  consumer: Service;
  provider: Service;
  contract: Contract;
  // The schema a consumer relies on today, from the destination commit.
  before: SchemaDocument;
  // The schema this pull request proposes, from the source commit.
  after: SchemaDocument;
}

/**
 * Compares a provider schema across a pull request for the fields a consumer
 * declares. It only reports on those fields, so `clear` never means safe overall.
 */
export const compareContract = ({ consumer, provider, contract, before, after }: ContractInput): ContractResult => {
  const unknown = (reason: string): ContractResult => ({
    consumer, provider, contract, status: 'unknown', changes: [], reason,
  });

  if (before.status === 'missing') {
    return unknown('The contract file is not on the destination branch.');
  }
  if (before.status === 'unreadable' || after.status === 'unreadable') {
    return unknown('The contract file could not be read as JSON.');
  }

  const beforeFields = readSchemaFields(before.value);

  if (!beforeFields) {
    return unknown('The schema uses features BlastRadius cannot compare.');
  }

  const afterFields = after.status === 'parsed' ? readSchemaFields(after.value) : new Map();

  if (!afterFields) {
    return unknown('The schema uses features BlastRadius cannot compare.');
  }

  const changes = contract.fields
    .map((field) => compareField(field, beforeFields.get(field), afterFields.get(field)))
    .filter((change) => change !== null);

  return { consumer, provider, contract, status: statusFor(changes), changes, reason: null };
};
