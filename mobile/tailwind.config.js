/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: process.env.DARK_MODE ? process.env.DARK_MODE : 'class',
  content: [
    './app/**/*.{html,js,jsx,ts,tsx,mdx}',
    './components/**/*.{html,js,jsx,ts,tsx,mdx}',
    './utils/**/*.{html,js,jsx,ts,tsx,mdx}',
    './*.{html,js,jsx,ts,tsx,mdx}',
    './src/**/*.{html,js,jsx,ts,tsx,mdx}',
  ],
  presets: [require('nativewind/preset')],
  important: 'html',
  safelist: [
    {
      pattern:
        /(bg|border|text|stroke|fill)-(primary|typography|outline|background|surface|border|market|warning|info)(-\w+)?$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        market: {
          up: '#22C55E',
          down: '#EF4444',
          flat: '#8C909F',
        },
        chart: {
          grid: 'rgba(51, 65, 85, 0.1)',
          crosshair: '#C2C6D6',
        },
        surface: {
          DEFAULT: '#111827',
          lowest: '#0B0F10',
          low: '#191C1E',
          container: '#1D2022',
          high: '#272A2C',
          highest: '#323537',
          elevated: '#1E293B',
        },
        background: {
          DEFAULT: '#0F172A',
          200: '#1E293B',
          300: '#334155',
          light: '#FBFBFB',
          dark: '#181719',
        },
        border: {
          DEFAULT: '#334155',
          muted: '#424754',
        },
        primary: {
          500: '#3B82F6',
          soft: '#ADC6FF',
        },
        typography: {
          DEFAULT: '#F8FAFC',
          muted: '#94A3B8',
          disabled: '#64748B',
          400: '#94A3B8',
          900: '#F8FAFC',
          white: '#FFFFFF',
          gray: '#D4D4D4',
          black: '#181718',
        },
        outline: {
          200: '#334155',
          300: '#475569',
        },
        warning: {
          DEFAULT: '#F59E0B',
        },
        info: {
          DEFAULT: '#38BDF8',
        },
      },
      fontFamily: {
        heading: ['Inter', 'var(--font-display)', 'ui-sans-serif', 'system-ui'],
        body: ['Inter', 'var(--font-display)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)'],
        jakarta: ['var(--font-plus-jakarta-sans)'],
        roboto: ['var(--font-roboto)'],
        code: ['var(--font-source-code-pro)'],
        inter: ['var(--font-inter)'],
        'space-mono': ['var(--font-space-mono)'],
      },
      fontWeight: {
        extrablack: '950',
      },
      fontSize: {
        '2xs': '10px',
        'price-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'price-display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'screen-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'section-title': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'secondary-info': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'tiny-label': ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        cardxl: '14px',
      },
      spacing: {
        'screen': '16px',
        'card': '16px',
        'section': '24px',
        'cell-y': '8px',
        'cell-x': '12px',
      },
      boxShadow: {
        floating: '0px 4px 10px rgba(0, 0, 0, 0.4)',
        'hard-1': '-2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-2': '0px 3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-3': '2px 2px 8px 0px rgba(38, 38, 38, 0.20)',
        'hard-4': '0px -3px 10px 0px rgba(38, 38, 38, 0.20)',
        'hard-5': '0px 2px 10px 0px rgba(38, 38, 38, 0.10)',
        'soft-1': '0px 0px 10px rgba(38, 38, 38, 0.1)',
        'soft-2': '0px 0px 20px rgba(38, 38, 38, 0.2)',
        'soft-3': '0px 0px 30px rgba(38, 38, 38, 0.1)',
        'soft-4': '0px 0px 40px rgba(38, 38, 38, 0.1)',
      },
    },
  },
};
