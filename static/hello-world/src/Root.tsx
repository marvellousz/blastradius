import { view } from '@forge/bridge';
import App from './App';
import ConnectionSettings from './ConnectionSettings';
import { useLoader } from './useLoader';
import { readField } from './validation';

const SETTINGS_MODULE = 'bitbucket:workspaceSettingsMenuPage';

const loadModuleType = async () => readField(await view.getContext(), 'extension', 'type');

/** Both Bitbucket modules share one resource, so this picks the right screen. */
function Root() {
  const { data, failureKind } = useLoader(loadModuleType);

  if (!data && !failureKind) {
    return <div>Loading...</div>;
  }

  return data === SETTINGS_MODULE ? <ConnectionSettings /> : <App />;
}

export default Root;
