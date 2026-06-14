/** @type {import('tailwindcss').Config} */
// Mirrors apps/landing/tailwind.config.js so the copied admin UI renders with the
// exact same Hallmark heritage tokens (defined in src/renderer/src/index.css).
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hanken Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: 'var(--color-paper)',
        'paper-2': 'var(--color-paper-2)',
        'paper-3': 'var(--color-paper-3)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        muted: 'var(--color-muted)',
        rule: 'var(--color-rule)',
        'rule-2': 'var(--color-rule-2)',
        forest: 'var(--color-forest)',
        'forest-2': 'var(--color-forest-2)',
        'forest-deep': 'var(--color-forest-deep)',
        'on-forest': 'var(--color-on-forest)',
        'on-forest-2': 'var(--color-on-forest-2)',
        'rule-forest': 'var(--color-rule-forest)',
        accent: 'var(--color-accent)',
        'accent-deep': 'var(--color-accent-deep)',
        'on-accent': 'var(--color-on-accent)',
        bronze: 'var(--color-bronze)',
        danger: 'var(--color-danger)',
        plate: 'var(--color-plate)',
        focus: 'var(--color-focus)',
      },
      maxWidth: {
        prose: '65ch',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
