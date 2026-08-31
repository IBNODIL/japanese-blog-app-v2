"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Hook that prevents duplicate actions while a previous action is still in progress.
 * Returns [execute, isLoading] — the button should be disabled when isLoading is true.
 */
export function useLoadingAction<T extends (...args: never[]) => Promise<unknown>>(
  action: T
): [(...args: Parameters<T>) => Promise<void>, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  const lockRef = useRef(false);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setIsLoading(true);
      try {
        await action(...args);
      } finally {
        lockRef.current = false;
        setIsLoading(false);
      }
    },
    [action]
  );

  return [execute, isLoading];
}
