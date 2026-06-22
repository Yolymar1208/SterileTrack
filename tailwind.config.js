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
          50:  '#E0FAFB',
          100: '#B3F2F5',
          200: '#7DE8ED',
          300: '#3DD9E0',
          400: '#00C9D4',
          500: '#00B8C2',
          600: '#0099A8',
          700: '#007A88',
          800: '#005C68',
          900: '#0A0F1E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      fontSize: {
        '2xs': '10px',
      },
      letterSpacing: {
        tight: '-0.3px',
        tighter: '-0.5px',
      },
    },
  },
  plugins: [],
}
