import { useMemo } from 'react';
import { useApi } from './useApi.js';

/** Class / section / subject / teacher / year lookups for School Admin forms. */
export function useLookups(yearId) {
  const years = useApi('/api/school/years');
  const classes = useApi('/api/school/classes');
  const subjects = useApi('/api/school/subjects');
  const sections = useApi('/api/school/sections', { yearId });
  const teachers = useApi('/api/school/teachers', { limit: 200, status: 'active' });
  return useMemo(() => {
    const classMap = new Map((classes.data || []).map((c) => [c._id, c]));
    const sectionLabel = (s) => `${classMap.get(s.classId)?.name || ''} ${s.name}`.trim();
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
