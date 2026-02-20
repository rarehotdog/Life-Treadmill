import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(220 14% 20%)',
        input: 'hsl(220 14% 20%)',
        ring: 'hsl(265 90% 66%)',
        background: 'hsl(220 18% 8%)',
        foreground: 'hsl(220 12% 96%)',
        primary: {
          DEFAULT: 'hsl(265 90% 66%)',
          foreground: 'hsl(220 12% 96%)'
        },
        secondary: {
          DEFAULT: 'hsl(220 14% 16%)',
          foreground: 'hsl(220 12% 96%)'
        },
        muted: {
          DEFAULT: 'hsl(220 14% 14%)',
          foreground: 'hsl(220 8% 65%)'
        },
        accent: {
          DEFAULT: 'hsl(220 14% 16%)',
          foreground: 'hsl(220 12% 96%)'
        },
        card: {
          DEFAULT: 'hsl(220 16% 10%)',
          foreground: 'hsl(220 12% 96%)'
        }
      }
    }
  },
  plugins: []
};

export default config;
