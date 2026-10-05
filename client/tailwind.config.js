/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Preflight resets margins/typography globally, which would collide with
  // the rest of this app's hand-written CSS (globals.css). Tailwind is used
  // here only for the property microsite, as plain utility classes.
  // `container` is also disabled: this app has its own hand-written `.container`
  // class in globals.css (used by the navbar and every page), and Tailwind's
  // built-in `.container` utility has the same class name — it was winning the
  // cascade on pages that load the microsite bundle, shrinking the navbar's gutter.
  corePlugins: { preflight: false, container: false },
  theme: {
    extend: {
      colors: {
        cream: '#F5F2EC',
        ink: '#111111',
        charcoal: '#1C1C1C',
        stone: '#8A877F',
        gold: '#B89B5E',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
