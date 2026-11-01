import { invoke } from '@forge/bridge';
import { parseLiveContext, type LiveContext } from './analysis/liveContext';

/** Loads live Jira and Confluence data. Any failure reads as unavailable. */
export async function loadLiveContext(): Promise<LiveContext> {
  try {
    return parseLiveContext(await invoke('getLiveContext'));
  } catch {
    return { status: 'unavailable' };
  }
}
