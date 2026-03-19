/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Severità violazioni
        critical: '#DC2626',
        serious: '#EA580C',
        moderate: '#CA8A04',
        minor: '#2563EB',
        pass: '#16A34A',
        incomplete: '#8B5CF6',
        na: '#6B7280',
        // Principi WCAG
        perceivable: '#3B82F6',
        operable: '#10B981',
        understandable: '#F59E0B',
        robust: '#8B5CF6',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
