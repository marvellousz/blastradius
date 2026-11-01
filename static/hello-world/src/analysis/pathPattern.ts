// Pure logic with no Forge or React imports, so the backend can reuse it later.

const MAX_PATTERN_LENGTH = 200;

/**
 * Checks a repository path pattern. Patterns are relative, such as
 * `services/payment/**` or `docs/*.md`.
 */
export const isValidPathPattern = (pattern: string): boolean =>
  pattern.length > 0 &&
  pattern.length <= MAX_PATTERN_LENGTH &&
  !pattern.startsWith('/') &&
  !pattern.split('/').includes('..');

// Patterns come from repository content, so they must not be compiled to a
// regular expression: nested wildcards backtrack badly enough to freeze the
// reviewer's browser. This greedy scan retries only from the latest `*`.
const matchesSegment = (pattern: string, text: string): boolean => {
  let patternIndex = 0;
  let textIndex = 0;
  let starIndex = -1;
  let retryIndex = 0;

  while (textIndex < text.length) {
    if (pattern[patternIndex] === '*') {
      starIndex = patternIndex;
      retryIndex = textIndex;
      patternIndex += 1;
    } else if (pattern[patternIndex] === text[textIndex]) {
      patternIndex += 1;
      textIndex += 1;
    } else if (starIndex >= 0) {
      retryIndex += 1;
      patternIndex = starIndex + 1;
      textIndex = retryIndex;
    } else {
      return false;
    }
  }

  while (pattern[patternIndex] === '*') {
    patternIndex += 1;
  }

  return patternIndex === pattern.length;
};

/**
 * Tests a path against a valid pattern. `*` matches within one path segment,
 * and a `**` segment matches zero or more whole segments.
 */
export const matchesPathPattern = (pattern: string, path: string): boolean => {
  const segments = path.split('/');
  // reachable[i] means the pattern so far can consume exactly `i` segments.
  let reachable = [true, ...segments.map(() => false)];

  for (const part of pattern.split('/')) {
    if (part === '**') {
      let seen = false;
      reachable = reachable.map((value) => {
        seen = seen || value;
        return seen;
      });
    } else {
      const previous = reachable;
      reachable = [
        false,
        ...segments.map((segment, index) => previous[index] === true && matchesSegment(part, segment)),
      ];
    }
  }

  return reachable[segments.length] === true;
};
