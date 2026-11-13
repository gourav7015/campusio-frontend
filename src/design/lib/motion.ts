import type { Variants } from 'framer-motion';

/** One easing curve and two durations for the whole product. */
export const ease = [0.2, 0.8, 0.2, 1] as const;
export const dur = { fast: 0.16, base: 0.24 } as const;

export const fadeRise: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: dur.base, ease } } };
export const stagger = (gap = 0.04): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap } } });
export const pageTransition = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: dur.base, ease } };
