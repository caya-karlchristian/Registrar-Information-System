/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'selector',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        'lucida': ['"Lucida Fax"', 'serif'],
      },
      colors: {
        'dark-bg': '#020617',
        'dark-card': '#09090b',
        'dark-border': '#27272a',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}