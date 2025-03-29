/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4361EE',
          light: '#6D86F3',
          dark: '#2D42C4',
        },
        secondary: {
          DEFAULT: '#4CC9F0',
          light: '#7AD9F5',
          dark: '#29A3CC',
        },
        accent: {
          DEFAULT: '#FFC300',
          light: '#FFD54F',
          dark: '#E0A800',
        },
        success: '#06D6A0',
        error: '#EF476F',
        warning: '#FFD166',
        neutral: {
          dark: '#2B2D42',
          medium: '#8D99AE',
          light: '#EDF2F4',
        }
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}


