# Changelog

Versions follow MAJOR.MINOR.PATCH. The first numbered release is 1.0.0.

## 1.0.0
- Security headers and a Content-Security-Policy for the site (`dist/_headers`, written by `npm run build`), checked by running the whole browser suite against the built site.
- Two-factor sign-in screens, recovery codes, "Email me a reset link" and the reset page, sessions renewed while someone works.
- Calls repeat safely after a dropped connection (same `Idempotency-Key`).
- Platform: Errors page (server and browser crashes), feature switches per school, reset two-factor for a School Admin.
- Browser crashes are reported to the server (once per kind).
- Privacy tab on a student: guardian consent, download all data, erase a former student.
- Receipts and payslips settings page (logo, stamp, signature) and the new PDF layouts.
- Size budget for the built site (`npm run budget`), GitHub CI and Dependabot.
