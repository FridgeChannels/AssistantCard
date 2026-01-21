/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sothebys: {
          navy: '#002349',
          blue: '#002349', // Alternate ref
          gold: '#8f7e5e', // Optional accent
          gray: '#f9f9f9',
          border: '#e5e5e5',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
