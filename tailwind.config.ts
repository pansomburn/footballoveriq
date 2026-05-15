import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: '#00a651', 'green-dim': '#008c44',
        amber: '#f59e0b', blue: '#3b82f6', red: '#ef4444',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
