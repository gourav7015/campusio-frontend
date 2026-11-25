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

/** The only classes a school can have, in promotion order. The server enforces the same list. */
export const GRADE_NAMES = ['LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`), ...[11, 12].flatMap((n) => ['Medical', 'Non-Medical', 'Commerce', 'Arts'].map((st) => `Class ${n} ${st}`))]; // Classes 11 and 12 also come by stream
export const STAGES = ['Pre-primary', 'Primary', 'Middle', 'Secondary', 'Senior secondary'];
/** Which stage of school a class belongs to: LKG and UKG, Classes 1-5, 6-8, 9-10, then 11-12 with their streams. */
export const stageOf = (name) => { const r = gradeRank(name); return r < 1 ? 'Pre-primary' : r <= 5 ? 'Primary' : r <= 8 ? 'Middle' : r <= 10 ? 'Secondary' : 'Senior secondary'; };
