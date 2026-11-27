import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

/**
 * A thin line across the top while a screen is waiting for an answer it does not have yet
 * (first visit, or another date, class or tab). A quiet refresh of what is already on screen does not show it.
 * It appears only after a third of a second, so quick answers never flash it.
 */
export function TopProgress() {
  const waiting = useIsFetching({ predicate: (q) => q.state.status === 'pending' }) > 0;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(waiting), waiting ? 350 : 0);
    return () => clearTimeout(t);
  }, [waiting]);
  return show ? <div className="sk-thread" aria-hidden /> : null;
}
