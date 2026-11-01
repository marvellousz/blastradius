import { invoke } from '@forge/bridge';
import ForgeReconciler, { Button, Code, Heading, SectionMessage, Stack, Text } from '@forge/react';
import React, { useEffect, useState } from 'react';

interface Connection {
  allowed: boolean;
  url?: string;
  hasToken?: boolean;
}

interface TokenResult {
  allowed: boolean;
  token?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toConnection = (value: unknown): Connection => ({
  allowed: isRecord(value) && value.allowed === true,
  url: isRecord(value) && typeof value.url === 'string' ? value.url : undefined,
  hasToken: isRecord(value) && value.hasToken === true,
});

const toTokenResult = (value: unknown): TokenResult => ({
  allowed: isRecord(value) && value.allowed === true,
  token: isRecord(value) && typeof value.token === 'string' ? value.token : undefined,
});

const App = () => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    invoke('getConnection')
      .then((value) => setConnection(toConnection(value)))
      .catch(() => setFailed(true));
  }, []);

  const createToken = () => {
    invoke('createToken')
      .then((value) => setToken(toTokenResult(value).token ?? null))
      .catch(() => setFailed(true));
  };

  if (failed) {
    return <SectionMessage appearance="error"><Text>Something went wrong. Reload to try again.</Text></SectionMessage>;
  }

  if (!connection) {
    return <Text>Loading...</Text>;
  }

  if (!connection.allowed) {
    return <SectionMessage appearance="warning"><Text>Only Jira admins can manage this connection.</Text></SectionMessage>;
  }

  return (
    <Stack space="space.200">
      <Heading size="medium">Connect BlastRadius in Bitbucket</Heading>
      <Text>
        Anyone who can read a connected repository can see the title, status, and a short excerpt of
        Jira and Confluence items referenced by its service map, even without access to those items.
      </Text>
      <Text>Connection URL</Text>
      <Code>{connection.url}</Code>
      {token ? (
        <>
          <Text>Connection token. Copy it now, because it will not be shown again.</Text>
          <Code>{token}</Code>
        </>
      ) : (
        <Button onClick={createToken}>
          {connection.hasToken ? 'Replace token, which disconnects the current one' : 'Create token'}
        </Button>
      )}
      <Text>In Bitbucket, paste both values into workspace settings, under BlastRadius.</Text>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
