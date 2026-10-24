const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: token('card'),
        muted: token('muted'),
        border: token('border'),
        'muted-foreground': token('muted-foreground'),
        primary: token('primary'),
        'primary-foreground': token('primary-foreground'),
        secondary: token('secondary'),
        'secondary-foreground': token('secondary-foreground'),
        accent: token('accent'),
        'accent-foreground': token('accent-foreground'),
      },
      fontFamily: { sans: ['Nunito', 'Vazirmatn', 'system-ui', 'sans-serif'] },
    },
  },
}
