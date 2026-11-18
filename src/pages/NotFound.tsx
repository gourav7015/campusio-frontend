import { ErrorScreen } from '../design/ErrorScreen';
import { useSession } from '../types/auth';
import { homeFor } from './Login.jsx';
import { PublicPage } from './PublicPage';

/** Shown for any address that does not exist. It never reveals whether a private page exists: signed-out and signed-in people see the same thing. */
export default function NotFound() {
  const session = useSession() as ReturnType<typeof useSession> | null;
  const home = session?.user ? homeFor(session.user.role) : '/';
  return (
    <PublicPage title="Page not found">
      <ErrorScreen kind="notfound" inline homeHref={home} homeLabel={session?.user ? 'Back to your dashboard' : 'Go to the home page'} />
    </PublicPage>
  );
}
