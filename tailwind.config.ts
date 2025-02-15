import { type Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        coral: {
          50: '#FFF3F0',
          100: '#FFE6E0',
          200: '#FFD0C2',
          300: '#FFB3A3',
          400: '#FF8F75',
          500: '#FF6B4A', // Base coral
          600: '#FF4D26',
          700: '#FF2E00',
          800: '#CC2500',
          900: '#991C00',
        },
        plum: {
          50: '#F3F0FF',
          100: '#E6E0FF',
          200: '#C2B8FF',
          300: '#9F8FFF',
          400: '#7C66FF',
          500: '#5B34D9', // Base plum
          600: '#4A2AB3',
          700: '#3A218C',
          800: '#291866',
          900: '#190F40',
        },
        dark: {
          100: '#1F1F23',
          200: '#18181C',
          300: '#121215',
          400: '#0C0C0E',
          500: '#060607',
        },
        cream: "#FFF1E6",
        softgray: "#F0F2F5",
        charcoal: "#403E43",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B4A 0%, #5B34D9 100%)',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(to bottom, rgba(31, 31, 35, 0.8), rgba(12, 12, 14, 1))',
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'gradient-spotlight': 'radial-gradient(circle at center, rgba(255, 107, 74, 0.15), transparent 70%)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-slower': 'spin 12s linear infinite reverse',
        'fade-up': 'fadeUp 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'system-ui',
          'sans-serif'
        ],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
