/** LKG, UKG, Class 1 … Class 12 in school order (not alphabetical, where Class 10 would come before Class 2). */
export const gradeRank = (name) => {
  const n = String(name || '');
  if (/^lkg$/i.test(n)) return -2;
  if (/^ukg$/i.test(n)) return -1;
  const m = /(\d+)/.exec(n);
  return m ? Number(m[1]) : 999;
};
/** Sort key for "Class 8 A": grade first, then section. */
export const sectionKey = (className, sectionName) => `${String(gradeRank(className) + 10).padStart(3, '0')}-${/^class \d+ /i.test(className || '') ? className : ''}-${sectionName || ''}`; // the streams of Class 11 and 12 stay together
