import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          400: '#2dd4bf',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#a78bfa',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
        },
        village: {
          earth:      '#2C1810',
          clay:       '#8B4513',
          terracotta: '#C1440E',
          sand:       '#E8C99A',
          cream:      '#FAF3E8',
          forest:     '#1A3A2A',
          sage:       '#4A7C59',
          moss:       '#7BAF6E',
          mist:       '#B8D4C0',
          dusk:       '#1A1228',
          plum:       '#3D1F5C',
          violet:     '#7C4CA0',
          lavender:   '#C4A8D8',
          pearl:      '#EDE8F5',
          ember:      '#FF6B35',
          gold:       '#F4A261',
          sun:        '#FFD166',
        },
      },
    },
  },
  plugins: [],
}

export default config
