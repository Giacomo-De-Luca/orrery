'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

interface ContainerDimensions {
  width: number;
  height: number;
}

/**
 * Hook that tracks the dimensions of a container element using ResizeObserver.
 * Returns dimensions that update when the container is resized.
 */
export function useContainerDimensions(
  containerRef: RefObject<HTMLElement | null>,
  defaultDimensions: ContainerDimensions = { width: 800, height: 600 }
): ContainerDimensions {
  const [dimensions, setDimensions] = useState<ContainerDimensions>(defaultDimensions);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      // Only update if dimensions actually changed and are valid
      if (clientWidth > 0 && clientHeight > 0) {
        setDimensions(prev => {
          if (prev.width !== clientWidth || prev.height !== clientHeight) {
            return { width: clientWidth, height: clientHeight };
          }
          return prev;
        });
      }
    }
  }, [containerRef]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Initial measurement
    updateDimensions();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      window.requestAnimationFrame(() => {
        if (entries.length > 0) {
          updateDimensions();
        }
      });
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, updateDimensions]);

  return dimensions;
}
