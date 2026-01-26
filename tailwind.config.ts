import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Aktiviert Dark Mode mit class strategy
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        'subtle-glow': 'subtle-glow 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        // PREMIUM: Micro-Animation System
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in-up-delayed': 'fade-in-up 0.6s ease-out 0.2s forwards',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-in': 'slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-subtle': 'bounce-subtle 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'parallax-up': 'parallax-up 0.3s ease-out',
        'parallax-down': 'parallax-down 0.3s ease-out',
        'card-float': 'float 3.5s ease-in-out infinite alternate',
      },
      keyframes: {
        'subtle-glow': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.25' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' },
        },
        // PREMIUM: Staggered Entrance Animations
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.2), 0 0 40px rgba(244, 114, 182, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(249, 115, 22, 0.4), 0 0 60px rgba(244, 114, 182, 0.2)' 
          },
        },
        'parallax-up': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-4px)' },
        },
        'parallax-down': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' },
        },
        'float': {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-6px)' },
        },
      },
      scale: {
        '102': '1.02',
        '110': '1.10',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Das hier hat gefehlt!
  ],
};
export default config;