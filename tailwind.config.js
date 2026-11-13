import animate from 'tailwindcss-animate';

const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** Every colour is a token (see src/design/tokens.css). Nothing in the app uses a raw hex. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['selector', ':root[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: c('bg'), foreground: c('fg'), card: c('surface'), muted: c('muted'), 'muted-foreground': c('fg-2'), subtle: c('fg-3'),
        border: c('border'), 'border-strong': c('border-strong'), input: c('border-strong'), ring: c('primary'),
        primary: { DEFAULT: c('primary'), foreground: '#ffffff', soft: c('primary-soft'), ink: c('primary-ink') },
        navy: { DEFAULT: c('navy'), soft: c('navy-soft') },
        success: { DEFAULT: c('success'), soft: c('success-soft'), ink: c('success-ink') },
        warning: { DEFAULT: c('warning'), soft: c('warning-soft'), ink: c('warning-ink') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft'), ink: c('danger-ink') },
        tone: { DEFAULT: c('tone'), soft: c('tone-soft'), ink: c('tone-ink'), foreground: c('tone-fg') },
        'on-accent': c('on-accent'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Noto Sans Devanagari"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: { sm: '6px', DEFAULT: '10px', md: '10px', lg: '14px', xl: '16px', '2xl': '20px' },
      boxShadow: {
        xs: '0 1px 2px rgb(var(--c-shadow) / .04)',
        sm: '0 2px 8px rgb(var(--c-shadow) / .06), 0 1px 2px rgb(var(--c-shadow) / .04)',
        md: '0 8px 24px -4px rgb(var(--c-shadow) / .10), 0 2px 6px -2px rgb(var(--c-shadow) / .05)',
        lg: '0 24px 56px -12px rgb(var(--c-shadow) / .22)',
      },
      fontSize: { xs: ['12px', '16px'], sm: ['13px', '20px'], base: ['14px', '22px'], lg: ['16px', '24px'], xl: ['18px', '28px'], '2xl': ['24px', '32px'], '3xl': ['30px', '36px'], '4xl': ['40px', '46px'] },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        drift: { '0%, 100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(14px,-12px,0)' } },
        twinkle: { '0%, 100%': { opacity: '.25' }, '50%': { opacity: '.9' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: { rise: 'rise .24s cubic-bezier(.2,.8,.2,1) both', fade: 'fade .16s ease-out both' },
    },
  },
  plugins: [animate],
};
