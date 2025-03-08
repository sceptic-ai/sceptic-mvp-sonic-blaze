/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        unbounded: ['Unbounded', 'sans-serif'],
        grotesk: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f2fbf7',
          100: '#d9f3e6',
          200: '#a8e6cf', // Our mint accent color
          300: '#7ed4b6',
          400: '#56bd9c',
          500: '#3a9d81',
          600: '#2c7d68',
          700: '#256454',
          800: '#214f45',
          900: '#1e413a',
          950: '#0f2620',
        },
        secondary: {
          50: '#000000',
          100: '#0a0a0a',
          200: '#141414',
          300: '#1f1f1f',
          400: '#292929',
          500: '#333333',
          600: '#666666',
          700: '#999999',
          800: '#cccccc',
          900: '#e6e6e6',
          950: '#ffffff',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};