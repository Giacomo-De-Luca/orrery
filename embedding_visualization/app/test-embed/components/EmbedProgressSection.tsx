'use client';

import type { EmbeddingJob } from '@/lib/graphql/mutations';
import { ProgressModal } from './EmbeddingProgressModal';
import { JobsPanel } from './JobsPanel';

interface EmbedProgressSectionProps {
  embedLoading: boolean;
  activeJobCollectionName?: string | null;
  llmResumeJobId: string | null;
  onResumeJob: (job: EmbeddingJob) => Promise<void>;
}

export function EmbedProgressSection({
  embedLoading,
  activeJobCollectionName,
  llmResumeJobId,
  onResumeJob,
}: EmbedProgressSectionProps) {
  return (
    <>
      {/* Progress Modal - shown during embedding */}
      {embedLoading && activeJobCollectionName && (
        <ProgressModal jobId={activeJobCollectionName} />
      )}

      {/* Progress Modal - shown during LLM labeling resume */}
      {llmResumeJobId && (
        <ProgressModal
          jobId={llmResumeJobId}
          title="Generating LLM Labels"
          subtitle="Each topic is labeled individually via LLM API calls."
          itemsLabel="topics"
        />
      )}

      {/* Interrupted Jobs Panel */}
      {!embedLoading && (
        <JobsPanel
          statusFilter="interrupted"
          onResumeJob={onResumeJob}
        />
      )}
    </>
  );
}
