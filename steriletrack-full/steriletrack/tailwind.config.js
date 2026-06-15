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
          50:  '#E0F7F9',
          100: '#B3ECF1',
          200: '#80DFE8',
          300: '#4DD2DF',
          400: '#26C8D9',
          500: '#4AB8C1',
          600: '#0097A7',
          700: '#00838F',
          800: '#006064',
          900: '#1E3A5F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
