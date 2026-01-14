'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/lib/ui-primitives/input';
import { useDebounceValue } from '@/lib/hooks/use-debounce-value';

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  id?: string;
  className?: string;
}

/**
 * A search input that debounces value changes to avoid excessive re-renders.
 * The internal state updates immediately for responsive UI, but the parent
 * only receives updates after the debounce delay.
 */
export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = 'Type to search...',
  delay = 300,
  id,
  className,
}: DebouncedSearchInputProps) {
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);
  
  // Debounced version of the local value
  const [debouncedValue] = useDebounceValue(localValue, delay);

  // Sync local state when external value changes (e.g., reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Notify parent when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  return (
    <Input
      id={id}
      type="text"
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      className={className}
    />
  );
}
