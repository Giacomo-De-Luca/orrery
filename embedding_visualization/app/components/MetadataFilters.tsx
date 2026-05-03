'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/lib/ui-primitives/button';
import { Input } from '@/lib/ui-primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/ui-primitives/select';
import { analyzeField, fieldToDisplayName, type FieldAnalysisResult } from '../../lib/utils/fieldAnalysis';
import type { FilterInput, FilterOperator } from '../../lib/types/types';

const STRING_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'EQ', label: '=' },
  { value: 'NE', label: '!=' },
  { value: 'IN', label: 'in' },
  { value: 'NIN', label: 'not in' },
];

const NUMERIC_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'EQ', label: '=' },
  { value: 'NE', label: '!=' },
  { value: 'GT', label: '>' },
  { value: 'GTE', label: '>=' },
  { value: 'LT', label: '<' },
  { value: 'LTE', label: '<=' },
  { value: 'IN', label: 'in' },
  { value: 'NIN', label: 'not in' },
];

interface MetadataFiltersProps {
  filters: FilterInput[];
  onChange: (filters: FilterInput[]) => void;
  availableFields: string[];
  itemMetadata: Record<string, unknown>[];
}

export function MetadataFilters({
  filters,
  onChange,
  availableFields,
  itemMetadata,
}: MetadataFiltersProps) {
  // Analyze fields once and memoize
  const fieldAnalysis = React.useMemo(() => {
    const map = new Map<string, FieldAnalysisResult>();
    for (const field of availableFields) {
      map.set(field, analyzeField(field, itemMetadata));
    }
    return map;
  }, [availableFields, itemMetadata]);

  const addFilter = React.useCallback(() => {
    const firstField = availableFields[0] ?? '';
    onChange([...filters, { field: firstField, operator: 'EQ', value: '' }]);
  }, [filters, onChange, availableFields]);

  const updateFilter = React.useCallback((index: number, updated: FilterInput) => {
    const next = [...filters];
    next[index] = updated;
    onChange(next);
  }, [filters, onChange]);

  const removeFilter = React.useCallback((index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  }, [filters, onChange]);

  if (availableFields.length === 0) return null;

  return (
    <div className="space-y-2">
      {filters.map((filter, index) => (
        <FilterRow
          key={index}
          filter={filter}
          availableFields={availableFields}
          fieldAnalysis={fieldAnalysis}
          onChange={(updated) => updateFilter(index, updated)}
          onRemove={() => removeFilter(index)}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={addFilter}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add filter
      </Button>
    </div>
  );
}

interface FilterRowProps {
  filter: FilterInput;
  availableFields: string[];
  fieldAnalysis: Map<string, FieldAnalysisResult>;
  onChange: (filter: FilterInput) => void;
  onRemove: () => void;
}

function FilterRow({
  filter,
  availableFields,
  fieldAnalysis,
  onChange,
  onRemove,
}: FilterRowProps) {
  const analysis = fieldAnalysis.get(filter.field);
  const operators = analysis?.isNumeric ? NUMERIC_OPERATORS : STRING_OPERATORS;
  const datalistId = `filter-values-${filter.field}`;
  const isListOp = filter.operator === 'IN' || filter.operator === 'NIN';

  // When field changes, reset operator and value
  const handleFieldChange = React.useCallback((field: string) => {
    onChange({ field, operator: 'EQ', value: '' });
  }, [onChange]);

  // When operator changes, reset value if switching to/from list operator
  const handleOperatorChange = React.useCallback((operator: FilterOperator) => {
    const wasListOp = filter.operator === 'IN' || filter.operator === 'NIN';
    const nowListOp = operator === 'IN' || operator === 'NIN';
    const value = wasListOp !== nowListOp ? '' : filter.value;
    onChange({ ...filter, operator, value });
  }, [filter, onChange]);

  const handleValueChange = React.useCallback((rawValue: string) => {
    let value: unknown = rawValue;
    if (isListOp) {
      value = rawValue.split(',').map((v) => v.trim()).filter(Boolean);
    }
    onChange({ ...filter, value });
  }, [filter, onChange, isListOp]);

  // Display the value as a string for the input
  const displayValue = isListOp && Array.isArray(filter.value)
    ? (filter.value as string[]).join(', ')
    : String(filter.value ?? '');

  return (
    <div className="flex items-center gap-1">
      {/* Field selector */}
      <Select value={filter.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="h-7 text-xs w-[110px] flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {availableFields.map((field) => (
            <SelectItem key={field} value={field} className="text-xs">
              {fieldToDisplayName(field)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="h-7 text-xs w-[60px] flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input with datalist suggestions */}
      <div className="flex-1 min-w-0">
        <Input
          className="h-7 text-xs"
          placeholder={isListOp ? 'val1, val2, ...' : 'value'}
          value={displayValue}
          onChange={(e) => handleValueChange(e.target.value)}
          list={!isListOp && analysis?.values?.length ? datalistId : undefined}
        />
        {!isListOp && analysis?.values && analysis.values.length > 0 && (
          <datalist id={datalistId}>
            {analysis.values.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 flex-shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
