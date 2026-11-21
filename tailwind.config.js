/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: '#F3F8FC',
        'sky-50': '#EAF4FB',
        'sky-200': '#BFDDF2',
        'sky-500': '#3B9AD9',
        'sky-700': '#1F6FA8',
        ink: '#0F2230',
        'ink-muted': '#5B7083',
        hairline: '#DCE7F0',
        status: {
          available: '#1E9E6A',
          in_use: '#3B9AD9',
          maintenance: '#C98A1B',
          broken: '#CF4B4B',
        },
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
        'mono-semibold': ['JetBrainsMono_600SemiBold'],
        'mono-bold': ['JetBrainsMono_700Bold'],
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        input: '10px',
        DEFAULT: '12px',
        md: '12px',
        lg: '12px',
        full: '9999px',
      },
      spacing: {
        screen: '20px',
        4.5: '18px',
        12: '48px',
      },
    },
  },
  plugins: [],
};
