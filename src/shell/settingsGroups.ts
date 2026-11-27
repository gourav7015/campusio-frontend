/** The groups of School settings, as the side menu lists them under "School settings" and as the page shows them (one group at a time). */
export interface SettingsGroup { key: string; to: string; label: string; sub: string; /** words the "Find a setting" box matches */ words: string }
export const SETTINGS_GROUPS: SettingsGroup[] = [
  { key: 'general', to: '/admin/settings', label: 'General', sub: 'Name, time zone, numbers', words: 'school name time zone timezone working days admission number format starting password sign in' },
  { key: 'attendance', to: '/admin/settings/attendance', label: 'Attendance', sub: 'How students are marked', words: 'attendance late present period by period once a day day rule half day marks performance register locked' },
  { key: 'grading', to: '/admin/settings/grading', label: 'Grading', sub: 'Pass mark and grades', words: 'grading grade bands pass percentage marks fail report card' },
  { key: 'leave', to: '/admin/settings/leave', label: 'Leave', sub: 'Allowance and rules', words: 'leave casual sick earned allowance notice half day teaching non-teaching transport approver apply' },
  { key: 'staff-attendance', to: '/admin/settings/staff-attendance', label: 'Staff attendance', sub: 'Hours and check-in', words: 'staff attendance shift grace full day half day check in location latitude longitude distance' },
  { key: 'payroll', to: '/admin/settings/payroll', label: 'Payroll', sub: 'PF, ESI, Professional Tax', words: 'payroll statutory deductions pf provident fund esi professional tax slab' },
];
