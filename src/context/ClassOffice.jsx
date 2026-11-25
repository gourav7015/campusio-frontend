import { createContext, useContext } from 'react';

/**
 * Where the school office's own screens read from and link to. In the School Admin portal it is the admin API and the /admin pages.
 * For a class teacher looking at his own class it is the read-only "class office" API (/api/teacher/office) and his My class pages, so he sees
 * exactly what the office sees of his class, with nothing that changes anything.
 */
export const ADMIN_OFFICE = { api: '/api/school', finance: '/api/school/finance', library: '/api/school/library', nav: '/admin', readOnly: false };
export const CLASS_OFFICE = { api: '/api/teacher/office', finance: '/api/teacher/office/finance', library: '/api/teacher/office/library', nav: '/teacher/my-class', readOnly: true };
const OfficeCtx = createContext(ADMIN_OFFICE);
export const OfficeProvider = OfficeCtx.Provider;
export const useOffice = () => useContext(OfficeCtx);
