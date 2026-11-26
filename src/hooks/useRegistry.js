import { useMemo } from 'react';
import { useApi } from './useApi.js';

const LONG = { staleTime: 5 * 60_000 }; // classes, subjects, houses and the like change rarely: fetched once, then shown from memory

/** The school's own houses, as options for a select. Nobody can be put in a house that is not in this list. */
export function useHouseOptions() {
  const q = useApi('/api/school/houses', undefined, LONG);
  return useMemo(() => ({ options: (q.data?.houses || []).filter((h) => h.status === 'active').map((h) => ({ value: h.name, label: h.name })), loading: q.loading }), [q.data, q.loading]);
}

/** The ranks (designations) the school has registered for teachers: PGT, TGT, Head of Department… A teacher can hold only one of these. */
export function useRankOptions() {
  const q = useApi('/api/school/teacher-designations', undefined, LONG);
  return useMemo(() => ({ options: (q.data || []).filter((d) => d.status === 'active').map((d) => ({ value: d.name, label: d.name })), loading: q.loading }), [q.data, q.loading]);
}
