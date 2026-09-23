/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#060607',
          900: '#0A0A0C',
          850: '#121215',
          800: '#18181C',
          750: '#202026',
          700: '#2A2A32',
        },
      },
    },
  },
  plugins: [],
}
