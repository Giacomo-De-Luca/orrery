import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/ui-primitives/card';
import { Badge } from '@/lib/ui-primitives/badge';
import type { Point2D, Point3D } from '../../lib/types/types';
import { getCategoryLabel } from '../../lib/utils/categoryColors';

interface SelectedPointCardProps {
  point: Point2D | Point3D;
  categoryField?: string | null;
}

export function SelectedPointCard({ point, categoryField }: SelectedPointCardProps) {
  const hasCategory = point.category && point.category.length > 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">{point.label}</CardTitle>
        {hasCategory && (
          <CardDescription>
            <Badge variant="secondary" className="text-xs">
              {getCategoryLabel(categoryField ?? null, point.category)}
            </Badge>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm">{point.document}</p>
        {/* Show additional metadata if available */}
        {point.metadata && Object.keys(point.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Metadata</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(point.metadata)
                .filter(([key]) => !['word', 'definition', 'pos', categoryField].includes(key))
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="truncate">
                    <span className="text-muted-foreground">{key}:</span>{' '}
                    <span>{String(value).substring(0, 50)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
