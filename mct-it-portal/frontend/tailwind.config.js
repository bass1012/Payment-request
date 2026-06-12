/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mct: {
          blue: '#003087',
          red: '#C8102E',
          gray: '#6B7280',
        }
      }
    },
  },
  plugins: [],
}
