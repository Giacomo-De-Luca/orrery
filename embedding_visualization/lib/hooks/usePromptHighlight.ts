import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { apolloClient } from '@/lib/utils/apollo-client';
import { RUN_PROMPT_HIGHLIGHT } from '@/lib/graphql/mutations';
import type { PromptHighlightResult } from '@/lib/graphql/mutations';
import { SAE_FEATURE_INDEX_FIELD, parseSaeId } from '@/lib/utils/saeCollections';
import { ensureModelLoaded } from '@/lib/utils/modelLoader';
import type { HighlightMap } from '@/lib/types/types';

type PromptHighlightStatus = 'idle' | 'loading_model' | 'running' | 'error';

export const MAX_HIGHLIGHTED_FEATURES = 20;

interface SaeInfo {
  modelId: string;
  saeId: string;
}

interface UsePromptHighlightReturn {
  highlightMap: HighlightMap | undefined;
  status: PromptHighlightStatus;
  error: string | null;
  activePrompt: string | null;
  submit: (prompt: string) => void;
  clear: () => void;
}

export function usePromptHighlight(
  saeInfo: SaeInfo | null,
  itemMetadata: Record<string, unknown>[],
): UsePromptHighlightReturn {
  const [highlightMap, setHighlightMap] = useState<HighlightMap | undefined>(undefined);
  const [status, setStatus] = useState<PromptHighlightStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Build featureIndex -> pointIndex lookup once when metadata changes
  const featureIndexToPointIndex = useMemo(() => {
    if (!itemMetadata || itemMetadata.length === 0) return null;
    const map = new Map<number, number>();
    for (let i = 0; i < itemMetadata.length; i++) {
      const idx = itemMetadata[i]?.[SAE_FEATURE_INDEX_FIELD];
      if (idx !== undefined && idx !== null) {
        map.set(Number(idx), i);
      }
    }
    return map.size > 0 ? map : null;
  }, [itemMetadata]);

  const clear = useCallback(() => {
    setHighlightMap(undefined);
    setStatus('idle');
    setError(null);
    setActivePrompt(null);
  }, []);

  // Reset when collection changes
  useEffect(() => {
    clear();
  }, [saeInfo?.modelId, saeInfo?.saeId, clear]);

  const submit = useCallback(
    (prompt: string) => {
      if (!saeInfo || !featureIndexToPointIndex) return;
      if (statusRef.current === 'loading_model' || statusRef.current === 'running') return;

      const currentRequestId = ++requestIdRef.current;

      const run = async () => {
        setStatus('loading_model');
        setError(null);

        // Load model if needed
        try {
          const loadError = await ensureModelLoaded();
          if (requestIdRef.current !== currentRequestId) return;
          if (loadError) {
            setError(loadError);
            setStatus('error');
            return;
          }
        } catch (err) {
          if (requestIdRef.current !== currentRequestId) return;
          setError(err instanceof Error ? err.message : 'Failed to load model');
          setStatus('error');
          return;
        }

        // Run prompt highlight
        setStatus('running');
        try {
          const parsed = parseSaeId(saeInfo.saeId);
          const { data } = await apolloClient.mutate<{
            runPromptHighlight: PromptHighlightResult;
          }>({
            mutation: RUN_PROMPT_HIGHLIGHT,
            variables: {
              input: {
                prompt,
                layer: parsed.layerIndex,
                width: parsed.width,
                hookType: parsed.hookType,
              },
            },
          });

          if (requestIdRef.current !== currentRequestId) return;

          const result = data?.runPromptHighlight;
          if (result?.error) {
            setError(result.error);
            setStatus('error');
            return;
          }

          const features = result?.features;
          if (!features || features.length === 0) {
            setHighlightMap(undefined);
            setActivePrompt(prompt);
            setStatus('idle');
            return;
          }

          // Sort by activation descending, take top N
          const sorted = [...features].sort((a, b) => b.activation - a.activation);
          const top = sorted.slice(0, MAX_HIGHLIGHTED_FEATURES);

          // Normalize to 0-1 and build HighlightMap
          const maxAct = top[0].activation;
          const map: HighlightMap = new Map();
          for (const feat of top) {
            const pointIndex = featureIndexToPointIndex.get(feat.featureIndex);
            if (pointIndex !== undefined) {
              map.set(pointIndex, maxAct > 0 ? feat.activation / maxAct : 1);
            }
          }

          setHighlightMap(map.size > 0 ? map : undefined);
          setActivePrompt(prompt);
          setStatus('idle');
        } catch (err) {
          if (requestIdRef.current !== currentRequestId) return;
          setError(err instanceof Error ? err.message : 'SAE inference failed');
          setStatus('error');
        }
      };

      run();
    },
    [saeInfo, featureIndexToPointIndex],
  );

  return { highlightMap, status, error, activePrompt, submit, clear };
}
