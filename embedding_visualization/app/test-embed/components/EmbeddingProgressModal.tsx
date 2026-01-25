'use client';

import { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client/react';
import { Card, CardContent } from '@/lib/ui-primitives/card';
import { Progress } from '@/lib/ui-primitives/progress';
import { Badge } from '@/lib/ui-primitives/badge';
import { Spinner } from '@/lib/ui-primitives/spinner';
import { EMBEDDING_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/queries';
import type { JobProgress } from '@/lib/graphql/mutations';

interface EmbeddingProgressModalProps {
  /** The collection name (job ID) to subscribe to */
  collectionName: string;
  additionalMessage?: string;
}

interface SubscriptionData {
  embeddingProgress: JobProgress;
}

/**
 * Modal overlay displaying real-time embedding progress.
 * Uses the same card-style layout as JobsPanel for consistency.
 * Subscribes to GraphQL progress updates via WebSocket.
 */
export function EmbeddingProgressModal({
  collectionName,
}: EmbeddingProgressModalProps) {
  const [progress, setProgress] = useState<JobProgress | null>(null);

  const { data, error: subscriptionError } = useSubscription<SubscriptionData>(
    EMBEDDING_PROGRESS_SUBSCRIPTION,
    {
      variables: { jobId: collectionName },
      skip: !collectionName,
    }
  );

  // Update progress when subscription data arrives
  useEffect(() => {
    if (data?.embeddingProgress) {
      setProgress(data.embeddingProgress);
    }
  }, [data]);

  // Handle subscription errors
  useEffect(() => {
    if (subscriptionError) {
      console.error('Progress subscription error:', subscriptionError);
    }
  }, [subscriptionError]);

  const percentComplete = progress && progress.totalItems > 0
    ? Math.round((progress.itemsProcessed / progress.totalItems) * 100)
    : 0;

  const hasProgress = progress && progress.totalItems > 0;

  const statusColor = {
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  }[progress?.status || 'running'];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-[650px]">
        <CardContent className="pt-6 space-y-4">
          {/* Header with collection name and status */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium font-mono text-sm">{collectionName}</span>
                <Badge variant="outline" className="text-xs">
                  <span className={`w-2 h-2 rounded-full ${statusColor} mr-1`} />
                  {progress?.status || 'initializing'}
                </Badge>
              </div>
            </div>
            {(!progress || progress.status === 'running') && (
              <Spinner className="h-5 w-5" />
            )}
          </div>

          {/* Status message */}
          {progress?.message && (
            <p className="text-sm text-muted-foreground">
              {progress.message}
            </p>
          )}

          {/* Progress bar and stats */}
          {hasProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percentComplete}%</span>
              </div>
              <Progress value={percentComplete} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {progress.itemsProcessed.toLocaleString()} / {progress.totalItems.toLocaleString()} items
                </span>
                {progress.totalBatches > 0 && (
                  <span>
                    Batch {progress.currentBatch} / {progress.totalBatches}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Initial state (no progress yet) */}
          {!hasProgress && !subscriptionError && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {progress?.message || 'Initializing embedding job...'}
              </p>
            </div>
          )}

          {/* Error state */}
          {subscriptionError && (
            <div className="text-center py-4">
              <p className="text-sm text-destructive">
                Connection error. Progress updates may be delayed.
              </p>
            </div>
          )}

          {/* Helpful note */}
          <p className="text-xs text-muted-foreground text-center">
            This may take several minutes for large datasets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
