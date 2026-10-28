import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#F1F8F1',
          100: '#DCEFDD',
          200: '#BFE0C1',
          300: '#A5D6A7',
          500: '#43A047',
          600: '#2E7D32', // primary
          700: '#256628',
          800: '#1B4D1E',
          900: '#123316',
        },
        earth: {
          100: '#EFE6E1',
          300: '#BCAAA4',
          600: '#6D4C41',
          800: '#4E342E',
        },
        gold: {
          100: '#FFF4D6',
          500: '#F9A825', // icons only, never text
          700: '#B26A00',
        },
        sand: {
          50: '#FAF7F0', // app bg
          200: '#E8E2D4', // borders
          400: '#B8B09C',
        },
        ink: {
          600: '#52606D', // secondary text
          900: '#1F2933', // body
        },
        status: {
          success: '#2E7D32',
          'success-bg': '#DCEFDD',
          warning: '#B26A00',
          'warning-bg': '#FFF4D6',
          danger: '#C62828',
          'danger-bg': '#FDECEA',
          info: '#1565C0',
          'info-bg': '#E3F0FC',
        },
        ai: {
          50: '#F4EFFA',
          300: '#B9A3D6',
          600: '#6A4C93',
          800: '#442F63', // AI content ONLY
        },
        cta: {
          DEFAULT: '#FDB600',
          hover: '#E5A400',
          pressed: '#C98F00',
          text: '#1F2933', // amber buttons ALWAYS dark text
        },
      },
      fontFamily: {
        sans: [
          'var(--font-noto-sans)',
          'var(--font-noto-sans-sinhala)',
          'var(--font-noto-sans-tamil)',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 41, 51, 0.08)',
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
