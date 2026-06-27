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
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          550: '#f97316', // Custom amber/orange accent
          500: '#ec7d21',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        dark: {
          950: '#030303', // Deep obsidian
          900: '#07070a', // True dark luxury
          800: '#0f0f16', // Slate dark card background
          700: '#171724', // Medium slate border/background
          600: '#202030', // Light slate
          500: '#2b2b3d', // Accent slate
          400: '#474766',
        },
        accent: {
          emerald: '#10b981',
          rose: '#f43f5e',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          blue: '#3b82f6',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'float-slow': 'floatSlow 8s infinite ease-in-out',
        'spin-slow': 'spinSlow 20s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(236, 125, 33, 0.2)', borderColor: 'rgba(236, 125, 33, 0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(236, 125, 33, 0.45)', borderColor: 'rgba(236, 125, 33, 0.4)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-15px) scale(1.05)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      },
    },
  },
  plugins: [],
}
