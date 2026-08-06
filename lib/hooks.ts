"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Shared select-to-promote pattern: a set of checked ids plus toggle/clear —
 * used identically by the Enquiries and Drafts tabs so "select some cards,
 * then act on just those" behaves the same way everywhere. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Explicit set (not toggle) — for auto-select driven by a condition (e.g.
  // "every item on this card is priced"), not a user click. Idempotent: a
  // repeat call with the value it's already at is a no-op, so a component
  // can safely call this every render without fighting a manual toggle that
  // happened in between.
  const setChecked = useCallback((id: string, value: boolean) => {
    setSelected((prev) => {
      if (prev.has(id) === value) return prev;
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, setChecked, clear };
}

/** Returns a stable function that calls `callback` only after `delayMs` of no
 * further calls — used for autosave-while-typing without a request per keystroke. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
