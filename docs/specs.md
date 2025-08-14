# Of Tomorrow - Development Specifications

## [ ] Spec 001: Astro Business Website Platform Foundation

```json
{
  "id": 1,
  "title": "Astro Business Website Platform Foundation",
  "why": "Of Tomorrow, Inc. needs modern business website with CMS for content management",
  "system": {
    "complete": true,
    "commands": [
      "npm init -y",
      "npm create astro@latest ./temp --template blog --typescript --yes --skip-houston",
      "mv ./temp/* ./ && rmdir ./temp",
      "npm install @astrojs/tailwind decap-cms-app",
      "npm i -D @playwright/test && npx playwright install chromium &&  playwright install"
    ],
    "files": {
      ".gitignore": "# Dependencies\nnode_modules/\n\n# Build outputs\ndist/\n.astro/\n\n# Environment variables\n.env\n.env.local\n.env.production\n.env.staging\n\n# Logs\nlogs/\n*.log\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n# Runtime data\npids\n*.pid\n*.seed\n*.pid.lock\n\n# Coverage directory used by tools like istanbul\ncoverage/\n\n# Editor directories and files\n.vscode/\n.idea/\n*.swp\n*.swo\n*~\n\n# OS generated files\n.DS_Store\n.DS_Store?\n._*\n.Spotlight-V100\n.Trashes\nehthumbs.db\nThumbs.db\n\n# CMS admin build\npublic/admin/dist/\n\n# Playwright\nplaywright-report/\n\n",
      "astro.config.mjs": "import { defineConfig } from 'astro/config';\nimport tailwind from '@astrojs/tailwind';\n\nexport default defineConfig({\n  integrations: [tailwind()],\n  site: 'https://oftomorrow.net'\n});",
      "tailwind.config.mjs": "/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],\n  theme: {\n    extend: {\n      colors: {\n        'tomorrow-blue': '#0066FF',\n        'progress-orange': '#FF6B35',\n        'bg-primary': '#FFFFFF',\n        'bg-secondary': '#F8F9FA',\n        'border-gray': '#E9ECEF',\n        'text-primary': '#343A40',\n        'text-secondary': '#6C757D',\n        'success': '#28A745',\n        'warning': '#FFC107',\n        'error': '#DC3545',\n        'info': '#17A2B8',\n        'innovation-purple': '#6F42C1',\n        'creative-pink': '#E83E8C',\n        'growth-teal': '#20C997'\n      },\n      fontFamily: {\n        'brand': ['Space Grotesk', 'sans-serif'],\n        'body': ['Inter', 'system-ui', 'sans-serif'],\n        'code': ['JetBrains Mono', 'monospace']\n      },\n      spacing: {\n        'xs': '4px',\n        'sm': '8px',\n        'md': '16px',\n        'lg': '24px',\n        'xl': '32px',\n        '2xl': '48px'\n      },\n      borderRadius: {\n        'sm': '4px',\n        'md': '8px',\n        'lg': '16px'\n      },\n      boxShadow: {\n        'sm': '0 1px 3px rgba(0, 0, 0, 0.12)',\n        'md': '0 4px 6px rgba(0, 0, 0, 0.16)',\n        'lg': '0 10px 20px rgba(0, 0, 0, 0.20)'\n      }\n    }\n  },\n  plugins: []\n};",
      "public/admin/config.yml": "backend:\n  name: git-gateway\n  branch: main\n\nmedia_folder: public/images\npublic_folder: /images\n\ncollections:\n  - name: 'blog'\n    label: 'Blog Posts'\n    folder: 'src/content/blog'\n    create: true\n    slug: '{{year}}-{{month}}-{{day}}-{{slug}}'\n    fields:\n      - { label: 'Title', name: 'title', widget: 'string' }\n      - { label: 'Description', name: 'description', widget: 'string' }\n      - { label: 'Author', name: 'author', widget: 'string', default: 'Of Tomorrow, Inc.' }\n      - { label: 'Publish Date', name: 'pubDate', widget: 'datetime' }\n      - { label: 'Hero Image', name: 'heroImage', widget: 'image', required: false }\n      - { label: 'Body', name: 'body', widget: 'markdown' }",
      "public/admin/index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Content Manager</title>\n  <script src=\"https://identity.netlify.com/v1/netlify-identity-widget.js\"></script>\n</head>\n<body>\n  <script src=\"https://unpkg.com/decap-cms-app@^3.0.0/dist/decap-cms-app.js\"></script>\n</body>\n</html>",
      "src/layouts/Layout.astro": "---\nexport interface Props {\n  title: string;\n}\n\nconst { title } = Astro.props;\n---\n\n<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"description\" content=\"Of Tomorrow, Inc. - Innovation for the Future\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg\" />\n    <meta name=\"generator\" content={Astro.generator} />\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n    <link href=\"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap\" rel=\"stylesheet\">\n    <title>{title}</title>\n  </head>\n  <body class=\"bg-bg-primary text-text-primary min-h-screen font-body\">\n    <slot />\n  </body>\n</html>"
    },
    "env_vars": {
      "PUBLIC_SITE_URL": "http://localhost:4321",
      "PUBLIC_SITE_TITLE": "Of Tomorrow, Inc."
    }
  }
}
```

---

## [ ] Spec 002: Professional Site Header

```json
{
  "id": 2,
  "title": "Professional Site Header",
  "why": "Visitors need professional navigation and company branding with Of Tomorrow brand identity",
  "depends": [1],
  "ui": {
    "complete": true,
    "url": "/",
    "scenarios": [
      {
        "name": "header-display",
        "expect": "see branded header with company name in Space Grotesk font, navigation links (Services, About, Blog, Contact) in Tomorrow Blue (#0066FF), and professional styling with white background"
      },
      {
        "name": "responsive-header",
        "action": "resize to mobile viewport",
        "expect": "header adapts to mobile with hamburger menu and proper spacing using brand spacing system"
      }
    ],
    "components": ["Header", "Navigation", "MobileMenu"]
  }
}
```