/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8b5cf6',
          accent: '#10b981',
          dark: '#0f172a',
          light: '#ede9fe',
        },
        discord: {
          bg:      'var(--vx-bg)',
          sidebar: 'var(--vx-sidebar)',
          dark:    'var(--vx-dark)',
          darker:  'var(--vx-darker)',
          input:   'var(--vx-input)',
          text:    'var(--vx-text)',
          muted:   'var(--vx-muted)',
          channel: 'var(--vx-channel)',
          hover:   'var(--vx-hover)',
          brand:   '#5865f2',
          green:   '#23d160',
          red:     '#ed4245',
          yellow:  '#faa61a',
          blurple: '#5865f2',
          active:  '#252830',
          mention: '#2a2d4a',
          mentionBorder: '#5865f2',
        }
      },
      fontFamily: {
        sans: ['Inter', '"gg sans"', '"Noto Sans"', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease',
        'slide-up': 'slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-dot': 'pulseDot 1.5s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideUp: { from: { transform: 'translateY(10px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        pulseDot: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.3)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      boxShadow: {
        'brand': '0 4px 20px rgba(88,101,242,0.4)',
        'brand-lg': '0 8px 40px rgba(88,101,242,0.3)',
        'glow': '0 0 20px rgba(88,101,242,0.4), 0 0 40px rgba(88,101,242,0.2)',
      },
    },
  },
  plugins: [],
}
