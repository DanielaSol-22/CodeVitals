/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        navy: { DEFAULT: '#131b33', 2: '#1a2440', line: '#33405f', text: '#d6dcf0', mute: '#8e98b8' },
        canvas: '#f3f5fb',
        line: '#e6e9f4',
        ink: '#141b34',
        soft: '#4a5378',
        muted: '#6b7497',
        brand: { DEFAULT: '#4f46e5', 50: '#f0f1fb' },
        risk: {
          low: '#2f9e63', 'low-bg': '#e3f5ec', 'low-fg': '#237a4d', 'low-bar': '#4caf7d',
          med: '#f0a020', 'med-bg': '#fff0d0', 'med-fg': '#8f5a05', 'med-bar': '#fbc558',
          high: '#e04d4d', 'high-bg': '#fde8e8', 'high-fg': '#b42e2e', 'high-bar': '#f28c8c',
        },
      },
    },
  },
  plugins: [],
}
