'use client';

import { useEffect, useState } from 'react';

export function useDelayedBoolean(value: boolean, delayMs: number) {
  const [delayedValue, setDelayedValue] = useState(false);

  useEffect(() => {
    if (!value) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDelayedValue(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      setDelayedValue(false);
    };
  }, [value, delayMs]);

  return delayedValue;
}
