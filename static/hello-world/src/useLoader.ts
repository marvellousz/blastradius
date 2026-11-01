import { useEffect, useState } from 'react';
import { FAILURE, PullRequestLoadError, type FailureKind } from './pullRequest';

/**
 * Runs an async load on mount, with Retry. `load` must be a stable function,
 * such as a module-level loader.
 */
export function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [failureKind, setFailureKind] = useState<FailureKind | null>(null);
  // Incrementing this re-runs the effect below, which is how Retry works.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after unmount or after a newer attempt.
    let ignored = false;

    setData(null);
    setFailureKind(null);

    load()
      .then((result) => {
        if (!ignored) {
          setData(result);
        }
      })
      .catch((error: unknown) => {
        if (!ignored) {
          setFailureKind(error instanceof PullRequestLoadError ? error.kind : FAILURE.UNAVAILABLE);
        }
      });

    return () => {
      ignored = true;
    };
  }, [attempt, load]);

  return { data, failureKind, retry: () => setAttempt(attempt + 1) };
}
