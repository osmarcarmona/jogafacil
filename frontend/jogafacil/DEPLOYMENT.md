# JogaFacil - Deployment Guide

## Local Development

### Prerequisites
- Node.js v18+ (tested with v18.20.2)
- npm or yarn

### Installation & Running Locally

1. Navigate to the project directory:
```bash
cd jogafacil
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173
```

The app will automatically reload when you make changes to the code.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Building for Production

To create a production build:

```bash
npm run build
```

This will create an optimized build in the `dist` folder.

To preview the production build locally:

```bash
npm run preview
```

## Deployment Options

### Option 1: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Option 2: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy`
3. For production: `netlify deploy --prod`

### Option 3: GitHub Pages
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. Update `vite.config.js` with base path
4. Run: `npm run deploy`

## Features

- Material-UI (MUI) components for modern UI
- Responsive design
- Search functionality
- Game listing with location and time
- Floating action button for adding new games

## Tech Stack

- React 18
- Vite
- Material-UI (MUI)
- Emotion (CSS-in-JS)
