import { matchesPathPattern } from './pathPattern';
import type { Service, ServiceMap } from './serviceMap';

// Pure logic with no Forge or React imports, so the backend can reuse it later.

export interface ChangedPath {
  path: string;
  previousPath: string | null;
}

export interface ChangedService {
  service: Service;
  files: string[];
}

export interface AffectedService {
  service: Service;
  // Shortest configured route, from this service to the changed service.
  route: Service[];
}

export interface ImpactResult {
  changed: ChangedService[];
  // Services downstream of a change, nearest first.
  affected: AffectedService[];
  // Changed files no service claims. Their impact is unknown, not none.
  unmapped: string[];
}

const byName = (left: Service, right: Service) => left.name.localeCompare(right.name);

/**
 * Finds the services a change touches, then walks dependencies in reverse to
 * reach everything downstream. Every result comes from the configured map, so
 * it is a relationship to review, not proven impact.
 */
export const computeImpact = (map: ServiceMap, files: ChangedPath[]): ImpactResult => {
  const filesByService = new Map<string, string[]>();
  const unmapped: string[] = [];

  for (const file of files) {
    // A rename can move a file out of a service, so both paths count.
    const paths = file.previousPath ? [file.path, file.previousPath] : [file.path];
    const owners = map.services.filter((service) =>
      service.paths.some((pattern) => paths.some((path) => matchesPathPattern(pattern, path)))
    );

    if (owners.length === 0) {
      unmapped.push(file.path);
    }
    for (const service of owners) {
      filesByService.set(service.id, [...(filesByService.get(service.id) ?? []), file.path]);
    }
  }

  const servicesById = new Map(map.services.map((service) => [service.id, service]));
  const dependentsById = new Map<string, Service[]>();

  for (const { from, to } of map.dependencies) {
    const dependent = servicesById.get(from);

    if (dependent) {
      dependentsById.set(to, [...(dependentsById.get(to) ?? []), dependent]);
    }
  }

  const changed = map.services
    .filter((service) => filesByService.has(service.id))
    .sort(byName)
    .map((service) => ({ service, files: filesByService.get(service.id) ?? [] }));

  // Breadth-first, so each service keeps its shortest route. Visiting each
  // service once is what makes dependency cycles safe.
  const visited = new Set(changed.map(({ service }) => service.id));
  const affected: AffectedService[] = [];
  let frontier = changed.map(({ service }) => ({ service, route: [service] }));

  while (frontier.length > 0) {
    const next: typeof frontier = [];

    for (const { service, route } of frontier) {
      for (const dependent of dependentsById.get(service.id) ?? []) {
        if (!visited.has(dependent.id)) {
          visited.add(dependent.id);
          next.push({ service: dependent, route: [dependent, ...route] });
        }
      }
    }

    next.sort((left, right) => byName(left.service, right.service));
    affected.push(...next);
    frontier = next;
  }

  return { changed, affected, unmapped };
};
