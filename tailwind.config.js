/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f3',
          100: '#fde3e6',
          200: '#fbccd2',
          300: '#f7a3ad',
          400: '#f07181',
          500: '#e02636',
          600: '#c1272d',
          700: '#a01e27',
          800: '#841b24',
          900: '#6e1420',
          950: '#3b0710',
        },
        cedar: {
          500: '#0a7a44',
          600: '#006233',
          700: '#03502b',
        },
        ink: {
          50: '#f6f8fa',
          100: '#eceff3',
          200: '#d5dce4',
          300: '#b1bdcc',
          400: '#8698af',
          500: '#677c96',
          600: '#52647c',
          700: '#435265',
          800: '#3a4554',
          900: '#232b36',
          925: '#161d26',
          950: '#0b0f14',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      maxWidth: {
        site: '1200px',
      },
      keyframes: {
        marqueeRtl: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(50%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tickerFlash: {
          '0%, 100%': { backgroundColor: 'rgba(224,38,54,1)' },
          '50%': { backgroundColor: 'rgba(160,30,39,1)' },
        },
      },
      animation: {
        'marquee-rtl': 'marqueeRtl 45s linear infinite',
        'dot-pulse': 'pulse-dot 1.4s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease both',
        'ticker-flash': 'tickerFlash 2s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,34,0.06), 0 4px 14px rgba(15,23,34,0.06)',
        'card-hover': '0 4px 10px rgba(15,23,34,0.10), 0 12px 32px rgba(15,23,34,0.14)',
      },
    },
  },
  plugins: [],
};
