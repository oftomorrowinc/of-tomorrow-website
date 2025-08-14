/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
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
        'info': '#17A2B8',
        'innovation-purple': '#6F42C1',
        'creative-pink': '#E83E8C',
        'growth-teal': '#20C997'
      },
      fontFamily: {
        'brand': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'code': ['JetBrains Mono', 'monospace']
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