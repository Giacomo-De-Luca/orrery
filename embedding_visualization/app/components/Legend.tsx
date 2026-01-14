'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/lib/ui-primitives/card';
import { Badge } from '@/lib/ui-primitives/badge';
import {
  buildCategoryColorMap,
  getCategoryLabel,
  getCategoryDisplayName,
} from '../../lib/utils/categoryColors';

interface LegendProps {
  className?: string;
  categoryField?: string | null;
  categoryValues?: string[];
}

/**
 * Dynamic legend component that displays category colors.
 * Falls back to POS legend for backwards compatibility.
 */
export function Legend({ className, categoryField, categoryValues }: LegendProps) {
  // Default to POS legend if no category info provided
  const isPosLegend = !categoryField || categoryField === 'pos';
  const values = categoryValues || (isPosLegend ? ['n', 'v', 'a', 'r', 's', 'unknown'] : []);

  const colorMap = buildCategoryColorMap(categoryField ?? 'pos', values);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{getCategoryDisplayName(categoryField ?? 'pos')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {values.map((value) => (
          <div className="flex items-center justify-between" key={value}>
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: colorMap[value] || '#7f7f7f' }}
                aria-hidden="true"
              />
              <span className="font-xs">{getCategoryLabel(categoryField ?? null, value)}</span>
            </div>
            <Badge variant="outline" className="uppercase">
              {value}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
