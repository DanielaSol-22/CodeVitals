/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Space Grotesk'", 'system-ui', 'sans-serif'],
        serif: ["'Lora'", 'Georgia', 'serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      colors: {
        ink: '#211B14',
        paper: '#F2EEE3',
        surface: '#FBF9F4',
        line: '#DED5BD',
        muted: '#6B5E44',
        label: '#8A6B3F',
        accent: {
          DEFAULT: '#A6621F',
          dark: '#7A4716',
          soft: '#F0DFC9',
        },
        risk: {
          low: '#3E6B37',
          mid: '#8A6B1F',
          high: '#A6421F',
        },
      },
    },
  },
  plugins: [],
}
