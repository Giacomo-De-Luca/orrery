import type { ReactNode } from 'react';
import { StatusLayout } from './StatusLayout';

type ErrorType = 'collections' | 'data' | 'no-collections';
type ErrorVariant = 'error' | 'warning';

interface ErrorConfig {
  variant: ErrorVariant;
  title: string;
  message?: string;
  hint?: ReactNode;
}

interface ErrorScreenProps {
  type?: ErrorType;
  error?: Error;
  title?: string;
  message?: string;
  hint?: ReactNode;
  variant?: ErrorVariant;
}

const ERROR_CONFIG: Record<ErrorType, ErrorConfig> = {
  collections: {
    variant: 'error',
    title: 'Error Loading Collections',
    hint: 'Make sure the collections.json file exists in public/data/',
    message: undefined,
  },
  data: {
    variant: 'error',
    title: 'Error Loading Data',
    hint: (
      <>
        Make sure you have run the projection computation script:
        <code className="block mt-2 bg-white p-2 rounded border">
          uv run python interpretability/compute_projections.py
        </code>
      </>
    ),
    message: undefined,
  },
  'no-collections': {
    variant: 'warning',
    title: 'No Collections Available',
    message: 'No embedding collections found.',
    hint: (
      <>
        Run the projection computation script to create a collection:
        <code className="block mt-2 bg-white p-2 rounded border">
          uv run python interpretability/compute_projections.py
        </code>
      </>
    ),
  },
};

export function ErrorScreen({ type, error, title, message, hint, variant }: ErrorScreenProps) {
  const config = type ? ERROR_CONFIG[type] : undefined;
  const resolvedVariant: ErrorVariant = variant || config?.variant || 'error';
  const resolvedTitle = title || config?.title || 'Something went wrong';
  const resolvedMessage = message || error?.message || config?.message || '';
  const resolvedHint = hint ?? config?.hint;

  const colorClasses = resolvedVariant === 'error'
    ? {
        container: 'bg-red-50 border-red-200',
        title: 'text-red-800',
        message: 'text-red-600',
      }
    : {
        container: 'bg-yellow-50 border-yellow-200',
        title: 'text-yellow-800',
        message: 'text-yellow-700',
      };

  return (
    <StatusLayout>
      <div className={`${colorClasses.container} border rounded-lg p-6 max-w-lg`}>
        <h2 className={`${colorClasses.title} font-semibold mb-2`}>{resolvedTitle}</h2>
        <p className={`${colorClasses.message} mb-4`}>{resolvedMessage}</p>
        {resolvedHint && (
          <div className="text-sm text-gray-600">
            {resolvedHint}
          </div>
        )}
      </div>
    </StatusLayout>
  );
}
