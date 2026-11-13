/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // G HUB style: pure black canvas, near-black surfaces, cyan accent
        bg: '#000000',
        panel: '#0d0d0d',
        tile: '#1a1a1a',
        hover: '#242424',
        line: '#2a2a2a',
        accent: '#00b8fc',
        muted: '#8c8c8c'
      },
      fontFamily: {
        sans: ['"Outfit Variable"', '"Segoe UI"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
