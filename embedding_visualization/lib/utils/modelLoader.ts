import { apolloClient } from '@/lib/utils/apollo-client';
import { MODEL_STATUS } from '@/lib/graphql/queries';
import { LOAD_MODEL } from '@/lib/graphql/mutations';

/** Ensure the Gemma model is loaded, loading it if necessary. Returns error string or null on success. */
export async function ensureModelLoaded(): Promise<string | null> {
  const { data: statusData } = await apolloClient.query<{
    modelStatus: { loaded: boolean; modelName: string | null; device: string | null };
  }>({ query: MODEL_STATUS, fetchPolicy: 'network-only' });

  if (statusData?.modelStatus?.loaded) return null;

  const { data: loadData } = await apolloClient.mutate<{
    loadModel: { loaded: boolean; modelName: string | null; device: string | null };
  }>({ mutation: LOAD_MODEL });

  if (!loadData?.loadModel?.loaded) {
    return loadData?.loadModel?.modelName ?? 'Failed to load model';
  }
  return null;
}
