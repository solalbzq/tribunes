import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          soft: '#eff4ff',
        },
        gold: {
          DEFAULT: '#eeb007',
          hover: '#d99e06',
          soft: '#fef6e0',
        },
        ink: '#111827',
        muted: '#6b7280',
        subtle: '#f8fafc',
        line: '#e5e7eb',
        success: '#22c55e',
        danger: '#ef4444',
        warn: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
        lift: '0 12px 32px -8px rgba(16,24,40,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
