// Tells React 18 that tests wrap updates in act(), which enables its act() checks.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
