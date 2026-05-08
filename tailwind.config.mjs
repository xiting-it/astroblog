/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: '#334155',
            a: {
              color: '#0f172a',
              '&:hover': {
                color: '#475569',
              },
            },
          },
        },
        invert: {
          css: {
            color: '#cbd5e1',
            a: {
              color: '#f1f5f9',
              '&:hover': {
                color: '#94a3b8',
              },
            },
          },
        },
      },
    },
  },
  plugins: [],
};
