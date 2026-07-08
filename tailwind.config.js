/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'var(--brand-50,  #E0FAFB)',
          100: 'var(--brand-100, #B3F2F5)',
          200: 'var(--brand-200, #7DE8ED)',
          300: 'var(--brand-300, #3DD9E0)',
          400: 'var(--brand-400, #00C9D4)',
          500: 'var(--brand,     #00C9D4)',
          600: 'var(--brand-mid, #00B8C2)',
          700: 'var(--brand-700, #0099A8)',
          800: 'var(--brand-800, #007A88)',
          900: 'var(--brand-900, #0A0F1E)',
        },
      },
    },
  },
  plugins: [],
}
