import { useEffect } from 'react';

const SITE = 'AtKaksha';

/** Set the browser tab title for this page: "Students · School admin · AtKaksha". */
export function usePageTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), SITE].join(' · ');
  useEffect(() => { document.title = title; }, [title]);
}

/** Tell search engines whether this page may be indexed. Signed-in pages never are: they hold school and student records. */
export function useRobots(index: boolean) {
  useEffect(() => {
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!tag) { tag = document.createElement('meta'); tag.name = 'robots'; document.head.appendChild(tag); }
    tag.content = index ? 'index, follow' : 'noindex, nofollow';
    return () => { if (tag) tag.content = 'noindex, nofollow'; };
  }, [index]);
}
