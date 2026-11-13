import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../design/ui';
import { useSession } from '../types/auth';
import { homeFor } from './Login.jsx';
import { PublicPage } from './PublicPage';

/** Shown for any address that does not exist. It never reveals whether a private page exists: signed-out and signed-in people see the same thing. */
export default function NotFound() {
  const session = useSession() as ReturnType<typeof useSession> | null;
  const home = session?.user ? homeFor(session.user.role) : '/';
  return (
    <PublicPage title="Page not found">
      <EmptyState icon={Compass} title="This page does not exist" description="The address may be mistyped, or the page may have moved." className="py-24"
        action={<Button variant="primary" asChild><Link to={home}>{session?.user ? 'Back to your dashboard' : 'Go to the home page'}</Link></Button>} />
    </PublicPage>
  );
}
