import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { apolloClient } from '@/lib/utils/apollo-client';
import { HAS_DOCUMENT_ACTIVATIONS, SEARCH_DOCUMENTS_BY_FEATURES } from '@/lib/graphql/queries';
import type { DocumentActivationResult, MatchedFeatureInfo, DocumentActivationSearchResponse } from '@/lib/graphql/mutations';
import type { HighlightMap } from '@/lib/types/types';

type FeatureSearchStatus = 'idle' | 'searching' | 'error';

interface SaeInfo {
  modelId: string;
  saeId: string;
}

interface UseDocumentFeatureSearchReturn {
  highlightMap: HighlightMap | undefined;
  results: DocumentActivationResult[];
  matchedFeatures: MatchedFeatureInfo[];
  totalResults: number;
  matchedFeatureCount: number;
  status: FeatureSearchStatus;
  error: string | null;
  activeQuery: string | null;
  hasActivations: boolean | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useDocumentFeatureSearch(
  collectionName: string | null,
  saeInfo: SaeInfo | null,
): UseDocumentFeatureSearchReturn {
  const [results, setResults] = useState<DocumentActivationResult[]>([]);
  const [matchedFeatures, setMatchedFeatures] = useState<MatchedFeatureInfo[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [matchedFeatureCount, setMatchedFeatureCount] = useState(0);
  const [status, setStatus] = useState<FeatureSearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [hasActivations, setHasActivations] = useState<boolean | null>(null);
  const requestIdRef = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;

  // Check if document activations exist when collection/saeInfo changes
  useEffect(() => {
    if (!collectionName || !saeInfo) {
      setHasActivations(null);
      return;
    }

    let cancelled = false;
    apolloClient
      .query<{ hasDocumentActivations: boolean }>({
        query: HAS_DOCUMENT_ACTIVATIONS,
        variables: { collectionName },
        fetchPolicy: 'network-only',
      })
      .then(({ data }) => {
        if (!cancelled) {
          setHasActivations(data?.hasDocumentActivations ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasActivations(false);
        }
      });

    return () => { cancelled = true; };
  }, [collectionName, saeInfo?.modelId, saeInfo?.saeId]);

  // Build highlight map from results
  const highlightMap = useMemo((): HighlightMap | undefined => {
    if (results.length === 0) return undefined;

    const map: HighlightMap = new Map();
    const maxScore = results[0].score; // Results are sorted by score desc
    for (const r of results) {
      if (r.rowIndex != null && maxScore > 0) {
        map.set(r.rowIndex, r.score / maxScore);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [results]);

  const clear = useCallback(() => {
    setResults([]);
    setMatchedFeatures([]);
    setTotalResults(0);
    setMatchedFeatureCount(0);
    setStatus('idle');
    setError(null);
    setActiveQuery(null);
  }, []);

  // Reset on collection change
  useEffect(() => {
    clear();
  }, [collectionName, clear]);

  const search = useCallback(
    (query: string) => {
      if (!collectionName || !saeInfo) return;
      if (statusRef.current === 'searching') return;

      const currentRequestId = ++requestIdRef.current;

      const run = async () => {
        setStatus('searching');
        setError(null);

        try {
          const { data } = await apolloClient.query<{
            searchDocumentsByFeatures: DocumentActivationSearchResponse;
          }>({
            query: SEARCH_DOCUMENTS_BY_FEATURES,
            variables: {
              collectionName,
              query,
              modelId: saeInfo.modelId,
              saeId: saeInfo.saeId,
            },
            fetchPolicy: 'network-only',
          });

          if (requestIdRef.current !== currentRequestId) return;

          const response = data?.searchDocumentsByFeatures;
          if (!response || response.error) {
            setError(response?.error ?? 'No response from server');
            setStatus('error');
            return;
          }

          setResults(response.results);
          setMatchedFeatures(response.matchedFeatures ?? []);
          setTotalResults(response.totalResults);
          setMatchedFeatureCount(response.matchedFeatureCount);
          setActiveQuery(query);
          setStatus('idle');
        } catch (err) {
          if (requestIdRef.current !== currentRequestId) return;
          setError(err instanceof Error ? err.message : 'Feature search failed');
          setStatus('error');
        }
      };

      run();
    },
    [collectionName, saeInfo],
  );

  return {
    highlightMap,
    results,
    matchedFeatures,
    totalResults,
    matchedFeatureCount,
    status,
    error,
    activeQuery,
    hasActivations,
    search,
    clear,
  };
}
