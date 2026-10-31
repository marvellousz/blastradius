import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

function App() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  // Incrementing this re-runs the effect below, which is how Retry works.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after unmount or after a newer attempt.
    let ignored = false;

    setData(null);
    setFailed(false);

    invoke('getText', { example: 'my-invoke-variable' })
      .then((result) => {
        if (!ignored) {
          setData(result);
        }
      })
      .catch(() => {
        if (!ignored) {
          setFailed(true);
        }
      });

    return () => {
      ignored = true;
    };
  }, [attempt]);

  if (failed) {
    return (
      <div role="alert">
        <p>BlastRadius could not load. This does not mean the pull request is low risk.</p>
        <button type="button" onClick={() => setAttempt(attempt + 1)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {data ? data : 'Loading...'}
    </div>
  );
}

export default App;
