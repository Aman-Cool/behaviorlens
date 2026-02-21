/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
    '../src/components/dashboard/**/*.{js,jsx,ts,tsx}',
    '../src/components/ui/**/*.{js,jsx,ts,tsx}',
    '../src/stores/**/*.{js,jsx,ts,tsx}',
    '../src/lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.02em', fontWeight: '400' }],
        sm: ['0.875rem', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '400' }],
        base: ['1rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '400' }],
        lg: ['1.125rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        xl: ['1.25rem', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '600' }],
        '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '600' }],
      },
      fontFamily: {
        // Map to Google Fonts equivalents (loaded via index.html)
        heading: "'Work Sans', sans-serif",
        paragraph: "'Roboto', sans-serif",
      },
      colors: {
        'panel-background': '#171A21',
        border: '#232833',
        'signal-blue': '#007AFF',
        'signal-yellow': '#FFCC00',
        'signal-green': '#34C759',
        'signal-red': '#FF3B30',
        'signal-purple': '#AF52DE',
        destructive: '#FF3B30',
        'destructive-foreground': '#FFFFFF',
        background: '#0F1115',
        secondary: '#8B93A7',
        foreground: '#E6EAF0',
        'secondary-foreground': '#0F1115',
        'primary-foreground': '#0F1115',
        primary: '#E6EAF0',
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(circle, var(--tw-gradient-stops))',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/typography'),
  ],
};
