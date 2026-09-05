/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0EEFF',
          100: '#DDD6FE',
          200: '#C4B8FC',
          300: '#A78BFA',
          400: '#9270F7',
          500: '#7C6EF8',
          600: '#6B5CF0',
          700: '#5B4AE0',
          800: '#4C3BB8',
          900: '#3D2D95',
        },
        // surface/text read from CSS custom properties (defined in index.css for
        // :root and .dark) so light/dark values are swapped natively by the
        // cascade — no per-class `dark:` variant needed anywhere they're used.
        surface: {
          DEFAULT: 'var(--surface)',
          muted:   'var(--surface-muted)',
          subtle:  'var(--surface-subtle)',
          warm:    'var(--surface-warm)',
          dark: {
            DEFAULT: '#1E1E1E',
            muted:   '#2A2A2A',
            subtle:  '#333333',
            warm:    '#3A3A3A',
          },
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverse:   'var(--text-inverse)',
          dark: {
            primary:   '#F5F5F5',
            secondary: '#D4D4D4',
            muted:     '#A3A3A3',
            inverse:   '#1C1917',
          },
        },
        status: {
          success: '#16A34A',
          'success-light': '#DCFCE7',
          warning: '#D97706',
          'warning-light': '#FEF3C7',
          error: '#DC2626',
          'error-light': '#FEE2E2',
          info: '#2563EB',
          'info-light': '#DBEAFE',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '0.875rem', // 14px
        'btn-sm': '0.5rem',   // 8px
        'btn-md': '0.625rem', // 10px
        'btn-lg': '0.75rem',  // 12px
      },
      boxShadow: {
        card:       '0 1px 4px rgba(28,25,23,.06), 0 1px 2px rgba(28,25,23,.04)',
        'card-hover':'0 4px 14px rgba(28,25,23,.08), 0 2px 4px rgba(28,25,23,.04)',
        modal:      '0 20px 40px rgba(28,25,23,.12), 0 8px 16px rgba(28,25,23,.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.3s ease forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'float': 'float 7s ease-in-out infinite',
        'pulse-slow': 'pulse 1.5s ease infinite',
        'spin': 'spin 0.7s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        spin: {
          'to': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
