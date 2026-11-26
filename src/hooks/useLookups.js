import { useMemo } from 'react';
import { useApi } from './useApi.js';

const LONG = { staleTime: 5 * 60_000 }; // classes, subjects, houses and the like change rarely: fetched once, then shown from memory

/** Class / section / subject / teacher / year lookups for School Admin forms. */
export function useLookups(yearId, { openYears = false } = {}) {
  const years = useApi('/api/school/years', undefined, LONG);
  const classes = useApi('/api/school/classes', undefined, LONG);
  const subjects = useApi('/api/school/subjects', undefined, LONG);
  const sections = useApi('/api/school/sections', { yearId, open: openYears && !yearId ? 1 : undefined }, LONG); // openYears: every year still running, for pages that follow students wherever their class is
  const teachers = useApi('/api/school/teachers', { limit: 200, status: 'active' }, LONG);
  return useMemo(() => {
    const classMap = new Map((classes.data || []).map((c) => [c._id, c]));
    const manyYears = new Set((sections.data || []).map((s) => s.yearId)).size > 1; // two years at once: the same class name can mean last session's or the new one, so the year is said
    const sectionLabel = (s) => `${classMap.get(s.classId)?.name || ''} ${s.name}${manyYears && s.yearName ? ` (${s.yearName})` : ''}`.trim();
    return {
      years: years.data || [], classes: classes.data || [], subjects: subjects.data || [], sections: sections.data || [], teachers: teachers.data?.items || [],
      currentYear: (years.data || []).find((y) => y.isCurrent),
      yearOptions: (years.data || []).map((y) => ({ value: y._id, label: y.name + (y.isCurrent ? ' (current)' : '') })),
      classOptions: (classes.data || []).filter((c) => c.status === 'active').map((c) => ({ value: c._id, label: c.name })),
      subjectOptions: (subjects.data || []).filter((s) => s.status === 'active').map((s) => ({ value: s._id, label: `${s.name} (${s.code})` })),
      sectionOptions: (sections.data || []).filter((s) => s.status === 'active').map((s) => ({ value: s._id, label: `${sectionLabel(s)} · ${s.studentCount}/${s.capacity}` })),
      sectionName: (id) => { const s = (sections.data || []).find((x) => x._id === id); return s ? sectionLabel(s) : ''; },
      teacherOptions: (teachers.data?.items || []).map((t) => ({ value: t._id, label: `${t.name} (${t.employeeId})` })),
      ready: !years.loading && !classes.loading && !sections.loading,
      reload: () => { years.reload(); classes.reload(); subjects.reload(); sections.reload(); teachers.reload(); },
    };
  }, [years, classes, subjects, sections, teachers]);
}
