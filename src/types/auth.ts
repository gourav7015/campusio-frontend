import { useAuth as useLegacyAuth } from '../auth/AuthContext.jsx';

export interface SessionUser { _id: string; name: string; role: string; loginId?: string; mustChangePassword?: boolean; email?: string }
export interface SessionSchool { _id: string; name: string; code?: string; academicYear?: string }
export interface AuthValue {
  user: SessionUser; school: SessionSchool | null; acting: { id: string; name: string } | null;
  setActing: (s: { id: string; name: string } | null) => void; logout: () => Promise<void>;
}
/** The auth context is plain JavaScript; this gives shell code its real shape. */
export const useSession = () => useLegacyAuth() as unknown as AuthValue;
