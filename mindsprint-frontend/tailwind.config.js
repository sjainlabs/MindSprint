/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A90E2',
        accent: '#F5A623',
        background: '#F9FAFB',
        text: '#333333',
      },
    },
  },
  plugins: [],
}
