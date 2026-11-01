import { invoke } from '@forge/bridge';
import { useState, type FormEvent } from 'react';
import { readField } from './validation';
import { useLoader } from './useLoader';

const loadStatus = async () => {
  const status = await invoke('getConnectionStatus');

  return {
    allowed: readField(status, 'allowed') === true,
    connected: readField(status, 'connected') === true,
  };
};

const SAVE_MESSAGES: Record<string, string> = {
  saved: 'Connected to the BlastRadius Companion app.',
  invalid: 'Check the URL and token. They should be copied exactly from the Companion page in Jira.',
  unreachable: 'The Companion app did not accept this URL and token.',
  forbidden: 'Only workspace owners can change this connection.',
  cleared: 'Disconnected.',
};

function ConnectionSettings() {
  const { data, failureKind, retry } = useLoader(loadStatus);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const finish = (result: unknown) => {
    setMessage(SAVE_MESSAGES[String(readField(result, 'result'))] ?? 'Something went wrong. Try again.');
    setToken('');
    retry();
  };

  const fail = () => setMessage('Something went wrong. Try again.');

  const save = (event: FormEvent) => {
    event.preventDefault();
    invoke('saveConnection', { url: url.trim(), token: token.trim() }).then(finish).catch(fail);
  };

  const disconnect = () => {
    invoke('clearConnection').then(finish).catch(fail);
  };

  if (failureKind) {
    return <p role="alert">BlastRadius could not load this page. Reload to try again.</p>;
  }

  if (!data) {
    return <p>Loading...</p>;
  }

  if (!data.allowed) {
    return <p role="alert">Only workspace owners can manage this connection.</p>;
  }

  return (
    <section>
      <h2>Jira and Confluence connection</h2>
      <p>
        Optional. Without it, BlastRadius still works from repository evidence. To connect, install the
        BlastRadius Companion app on your Jira site, then copy its URL and token from there.
      </p>
      <p>
        Anyone who can read a repository in this workspace can see the title, status, and a short excerpt
        of items its service map references, even without access to those items in Jira or Confluence.
      </p>
      <p role="status">{message ?? (data.connected ? 'Connected.' : 'Not connected.')}</p>
      <form onSubmit={save}>
        <p>
          <label>
            Connection URL
            <br />
            <input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} size={60} />
          </label>
        </p>
        <p>
          <label>
            Connection token
            <br />
            <input
              type="password"
              required
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              size={60}
            />
          </label>
        </p>
        <button type="submit">Save connection</button>{' '}
        {data.connected && <button type="button" onClick={disconnect}>Disconnect</button>}
      </form>
    </section>
  );
}

export default ConnectionSettings;
