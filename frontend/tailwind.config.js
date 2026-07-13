export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EBF2FF', 500: '#1A3C6E', 600: '#152E57' },
        success: { DEFAULT: '#16a34a', light: '#f0fdf4' },
        warning: { DEFAULT: '#ca8a04', light: '#fefce8' },
        danger:  { DEFAULT: '#dc2626', light: '#fef2f2' },
        surface: '#F4F7FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    }
  },
  plugins: []
}
