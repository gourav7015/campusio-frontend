/** Business details come from build-time settings (see frontend/.env.example). Anything not set is simply not shown. */
const env = import.meta.env;
const val = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

export const site = {
  name: 'Campusio',
  company: val(env.VITE_COMPANY_NAME),
  address: val(env.VITE_COMPANY_ADDRESS),
  email: val(env.VITE_SUPPORT_EMAIL),
  phone: val(env.VITE_SUPPORT_PHONE),
  grievanceOfficer: val(env.VITE_GRIEVANCE_OFFICER),
  publicUrl: val(env.VITE_PUBLIC_URL).replace(/\/$/, ''),
};

