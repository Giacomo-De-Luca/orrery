import { apolloClient } from '@/lib/utils/apollo-client';
import { MODEL_STATUS } from '@/lib/graphql/queries';
import { LOAD_MODEL, UNLOAD_MODEL } from '@/lib/graphql/mutations';

/**
 * Ensure the correct model is loaded. If a different model is loaded, unloads it first.
 * @param checkpoint - Full checkpoint string (e.g. "google/gemma-3-4b-it"). If omitted, loads the default.
 * @returns Error string or null on success.
 */
export async function ensureModelLoaded(checkpoint?: string): Promise<string | null> {
  const { data: statusData } = await apolloClient.query<{
    modelStatus: { loaded: boolean; modelName: string | null; device: string | null };
  }>({ query: MODEL_STATUS, fetchPolicy: 'network-only' });

  const currentModel = statusData?.modelStatus?.modelName;
  const isLoaded = statusData?.modelStatus?.loaded;

  // If correct model is already loaded, nothing to do
  if (isLoaded && (!checkpoint || currentModel === checkpoint)) return null;

  // If a different model is loaded, unload it first
  if (isLoaded && checkpoint && currentModel !== checkpoint) {
    await apolloClient.mutate({ mutation: UNLOAD_MODEL });
  }

  // Load the requested model
  const { data: loadData } = await apolloClient.mutate<{
    loadModel: { loaded: boolean; modelName: string | null; device: string | null };
  }>({
    mutation: LOAD_MODEL,
    variables: checkpoint ? { checkpoint } : undefined,
  });

  if (!loadData?.loadModel?.loaded) {
    return loadData?.loadModel?.modelName ?? 'Failed to load model';
  }
  return null;
}
