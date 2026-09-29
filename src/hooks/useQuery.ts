// ============================================================
// خطاف عام لجلب البيانات مع إعادة التحميل التلقائي في وضع DEMO
// ============================================================

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribe, getVersionSnapshot } from '@/lib/store';

export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, getVersionSnapshot, getVersionSnapshot);
}

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): QueryState<T> & { reload: () => void } {
  const version = useStoreVersion();
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (alive) setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
