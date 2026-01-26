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
        'float': 'float 6s ease-in-out infinite',
        'subtle-glow': 'subtle-glow 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(5px) rotate(-1deg)' },
        },
        'subtle-glow': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.25' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' },
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