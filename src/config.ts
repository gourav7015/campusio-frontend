/** Business details come from build-time settings (see frontend/.env.example). Anything not set is simply not shown. */
const env = import.meta.env;
const val = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

export const site = {
  name: 'AtKaksha',
  company: val(env.VITE_COMPANY_NAME),
  address: val(env.VITE_COMPANY_ADDRESS),
  /** The public contact address shown on the site and in the policies. */
  email: val(env.VITE_SUPPORT_EMAIL) || 'hello@atkaksha.com',
  /** Each address has one job. They are public, so they live here and not in the build settings. */
  mailboxes: { support: 'support@atkaksha.com', privacy: 'privacy@atkaksha.com', billing: 'billing@atkaksha.com', security: 'security@atkaksha.com' },
  phone: val(env.VITE_SUPPORT_PHONE),
  grievanceOfficer: val(env.VITE_GRIEVANCE_OFFICER),
  publicUrl: val(env.VITE_PUBLIC_URL).replace(/\/$/, ''),
};

