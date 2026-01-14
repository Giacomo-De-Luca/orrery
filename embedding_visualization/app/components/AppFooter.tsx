import { Badge } from '@/lib/ui-primitives/badge';

type AppFooterProps = {
  timestamp?: string;
  selectedCollection: string | null;
};

export function AppFooter({ timestamp, selectedCollection }: AppFooterProps) {
  return (
    <footer className="border-t mt-auto py-2 bg-background">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Embedding Visualization {selectedCollection}</span>
        {timestamp && (
          <>
            <span>•</span>
            <Badge variant="outline" className="text-xs font-normal">
              {new Date(timestamp).toLocaleDateString()}
            </Badge>
          </>
        )}
      </div>
    </footer>
  );
}
