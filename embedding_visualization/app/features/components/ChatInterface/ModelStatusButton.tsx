'use client';

import { memo, useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Button } from '@/lib/ui-primitives/button';
import { cn } from '@/lib/utils/utils';
import { MODEL_STATUS } from '@/lib/graphql/queries';
import { LOAD_MODEL, UNLOAD_MODEL } from '@/lib/graphql/mutations';

interface ModelStatusButtonProps {
  modelId: string | null;
}

function PureModelStatusButton({ modelId }: ModelStatusButtonProps) {
  const [transitioning, setTransitioning] = useState(false);

  const { data, refetch } = useQuery<{
    modelStatus: { loaded: boolean; modelName: string | null; device: string | null };
  }>(MODEL_STATUS, {
    pollInterval: 5000,
    fetchPolicy: 'network-only',
  });

  const [loadModel] = useMutation(LOAD_MODEL);
  const [unloadModel] = useMutation(UNLOAD_MODEL);

  const loaded = data?.modelStatus?.loaded ?? false;
  const modelName = data?.modelStatus?.modelName ?? null;
  const checkpoint = modelId ? `google/${modelId}` : null;
  const isCorrectModel = loaded && modelName === checkpoint;

  const dotColorClass = transitioning
    ? 'bg-amber-400 animate-pulse'
    : isCorrectModel
      ? 'bg-blue-500'
      : 'bg-red-500';

  const handleToggle = useCallback(async () => {
    if (!checkpoint || transitioning) return;
    setTransitioning(true);
    try {
      if (isCorrectModel) {
        await unloadModel();
      } else {
        // If a different model is loaded, unload first
        if (loaded) {
          await unloadModel();
        }
        await loadModel({ variables: { checkpoint } });
      }
    } finally {
      await refetch();
      setTransitioning(false);
    }
  }, [checkpoint, transitioning, isCorrectModel, loaded, loadModel, unloadModel, refetch]);

  return (
    <Button
      className="h-7 max-w-[200px] justify-start gap-1.5 rounded-lg px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      variant="ghost"
      onClick={handleToggle}
      disabled={transitioning || !modelId}
    >
      <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColorClass)} />
      <span className="truncate">{modelId ?? 'No model'}</span>
    </Button>
  );
}

export const ModelStatusButton = memo(PureModelStatusButton);
