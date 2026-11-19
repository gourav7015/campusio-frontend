/** The leave form fields shared by every leave form (apply, record, edit): a half day is one date, and says which half the person is away. */
export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'other', 'unpaid'];

export function leaveFields({ before = [], after = [], startLabel = 'Start date', endLabel = 'End date', typeHint, reasonLabel = 'Reason' } = {}) {
  return [
    ...before,
    { name: 'leaveType', label: 'Leave type', type: 'select', options: LEAVE_TYPES, required: true, default: 'casual', hint: typeHint },
    { name: 'halfDay', label: 'Half day only', type: 'checkbox', hint: 'Tick this to be away for half of one day.' },
    { name: 'startDate', label: (v) => (v?.halfDay ? 'Date' : startLabel), type: 'date', required: true },
    { name: 'endDate', label: endLabel, type: 'date', required: true, showIf: (v) => !v.halfDay },
    { name: 'halfSession', label: 'Which half are you away?', type: 'select', required: true, default: 'second', showIf: (v) => !!v.halfDay, options: [{ value: 'first', label: 'First half (morning)' }, { value: 'second', label: 'Second half (afternoon)' }] },
    { name: 'reason', label: reasonLabel, type: 'textarea', required: true },
    ...after,
  ];
}

/** What to send: a half day has the same start and end date; a full day sends no half. */
export function leavePayload(v) {
  const { halfDay, halfSession, ...rest } = v;
  return halfDay ? { ...rest, halfDay: true, halfSession: halfSession || 'second', endDate: rest.startDate } : { ...rest, halfDay: false };
}

export const daysText = (l) => (l.halfDay ? `½ (${l.halfSession === 'first' ? 'first' : 'second'} half)` : l.days);
