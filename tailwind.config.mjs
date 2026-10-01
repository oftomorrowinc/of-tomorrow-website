/** @type {import('tailwindcss').Config} */
// The magazine's tokens (docs/design/README.md). Each colour is also a CSS
// custom property in src/styles/magazine.css, so a later dark mode is one block.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'paper': '#F4ECD9',
        'paper-light': '#FBF6EA',
        'paper-dark': '#E9DFC6',
        'ink': '#1C1A16',
        'poppy': '#C5372C',
        'teal': '#1F6E7A',
        'mustard': '#D9A21B',
        'body-muted': '#4A4335',
        'caption': '#6B6253',
        // Kept for the privacy and cookie pages and the consent banner, which
        // this redesign leaves as they are.
        'tomorrow-blue': '#0066FF',
        'progress-orange': '#FF6B35',
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F8F9FA',
        'border-gray': '#E9ECEF',
        'text-primary': '#343A40',
        'text-secondary': '#6C757D',
        'success': '#28A745',
        'warning': '#FFC107',
        'error': '#DC3545',
        'info': '#17A2B8'
      },
      fontFamily: {
        'display': ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        'serif': ['"Source Serif 4"', 'Georgia', 'serif'],
        // The old names, pointed at the new faces so the pages still using
        // them pick the magazine's type up.
        'brand': ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        'body': ['"Source Serif 4"', 'Georgia', 'serif'],
        'code': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      maxWidth: {
        'magazine': '1120px'
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px'
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px'
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.16)',
        'lg': '0 10px 20px rgba(0, 0, 0, 0.20)'
      }
    }
  },
  plugins: []
};
