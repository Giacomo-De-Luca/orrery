import { apolloClient } from '@/lib/utils/apollo-client';
import { MODEL_STATUS } from '@/lib/graphql/queries';
import { LOAD_MODEL, UNLOAD_MODEL } from '@/lib/graphql/mutations';

/**
 * Construct the HuggingFace checkpoint string from a Neuronpedia-style model ID.
 *
 * The backend's `_normalize_checkpoint` appends the variant suffix (e.g. `-pt`)
 * when missing. We must match that here so `ensureModelLoaded` comparisons work.
 *
 * Examples:
 *   "gemma-3-4b-it"  → "google/gemma-3-4b-it"   (already has variant)
 *   "gemma-3-1b"     → "google/gemma-3-1b-pt"    (base model, needs -pt)
 */
export function modelIdToCheckpoint(modelId: string): string {
  // Strip any org prefix that might already be present
  const name = modelId.includes('/') ? modelId.split('/').pop()! : modelId;
  // Parse: strip "gemma-3-" prefix, then split on first "-" for size/variant
  const stripped = name.startsWith('gemma-3-') ? name.slice('gemma-3-'.length) : name;
  const dashIdx = stripped.indexOf('-');
  const variant = dashIdx >= 0 ? stripped.slice(dashIdx + 1) : 'pt';
  const size = dashIdx >= 0 ? stripped.slice(0, dashIdx) : stripped;
  const canonical = variant ? `gemma-3-${size}-${variant}` : `gemma-3-${size}-pt`;
  return `google/${canonical}`;
}

/**
 * Check if a loaded model name matches a requested checkpoint.
 * Handles normalization differences (e.g. backend may store "google/gemma-3-1b-pt"
 * while frontend sends "google/gemma-3-1b").
 */
export function isModelMatch(loadedName: string | null | undefined, checkpoint: string): boolean {
  if (!loadedName) return false;
  if (loadedName === checkpoint) return true;
  // Normalize both sides and compare
  const loadedBase = loadedName.includes('/') ? loadedName.split('/').pop()! : loadedName;
  const checkBase = checkpoint.includes('/') ? checkpoint.split('/').pop()! : checkpoint;
  return loadedBase === checkBase;
}

/**
 * Ensure the correct model is loaded. If a different model is loaded, unloads it first.
 * @param checkpoint - Full checkpoint string (e.g. "google/gemma-3-4b-it"). If omitted, loads the default.
 * @returns Error string or null on success.
 */
export async function ensureModelLoaded(checkpoint?: string): Promise<string | null> {
  const effectiveCheckpoint = checkpoint ?? 'google/gemma-3-4b-it';

  const { data: statusData } = await apolloClient.query<{
    modelStatus: { loaded: boolean; modelName: string | null; device: string | null };
  }>({ query: MODEL_STATUS, fetchPolicy: 'network-only' });

  const currentModel = statusData?.modelStatus?.modelName;
  const isLoaded = statusData?.modelStatus?.loaded;

  // If correct model is already loaded, nothing to do
  if (isLoaded && isModelMatch(currentModel, effectiveCheckpoint)) return null;

  // If a different model is loaded, unload it first
  if (isLoaded) {
    await apolloClient.mutate({ mutation: UNLOAD_MODEL });
  }

  // Load the requested model
  const { data: loadData } = await apolloClient.mutate<{
    loadModel: { loaded: boolean; modelName: string | null; device: string | null };
  }>({
    mutation: LOAD_MODEL,
    variables: { checkpoint: effectiveCheckpoint },
  });

  if (!loadData?.loadModel?.loaded) {
    return loadData?.loadModel?.modelName ?? 'Failed to load model';
  }
  return null;
}
