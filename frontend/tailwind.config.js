/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          50: '#ecf9ff',
          100: '#d6f1ff',
          200: '#b1e5ff',
          300: '#7dd5ff',
          400: '#41c4ff',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#0f3444',
        },
      },
    },
  },
  plugins: [],
}