/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fef7ee',
          100: '#fdeed7',
          200: '#f9d9ae',
          300: '#f5be7b',
          400: '#f09a46',
          500: '#ec7d21',
          600: '#dd6417',
          700: '#b74b15',
          800: '#923c19',
          900: '#763317',
        },
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#232330',
          500: '#2e2e3d',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(240, 154, 70, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(240, 154, 70, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
