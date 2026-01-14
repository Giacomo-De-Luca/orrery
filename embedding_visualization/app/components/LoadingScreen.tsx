import { StatusLayout } from './StatusLayout';

interface LoadingScreenProps {
  message: string;
  simple?: boolean;
}

export function LoadingScreen({ message, simple = false }: LoadingScreenProps) {
  if (simple) {
    return (
      <StatusLayout>
        <p className="text-gray-600">{message}</p>
      </StatusLayout>
    );
  }

  return (
    <StatusLayout>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </StatusLayout>
  );
}
