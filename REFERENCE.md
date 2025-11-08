# Website Reference Documentation

## 📋 Overview
This is Daniel's personal portfolio website built with Vite, React, Three.js, and custom visual effects.

**Live Site**: https://itzmedaniel.github.io/website/
**Repository**: https://github.com/itzmedaniel/website

---

## 🎨 Page Backgrounds & Effects

### Home Page
- **3D Scene**: Three.js with MacBook and Black Hole models
- **Features**: OrbitControls, animated camera, theme switching (light/dark)
- **Bouncing Logo**: Global Pochita logo with physics-based bouncing

### Contact Page
- **Background**: `LiquidChrome.jsx` - Liquid metal chrome effect
- **Component**: React component using custom WebGL shaders
- **Bouncing Logo**: Pochita bouncing with `contact-bouncing-logo` div
- **CSS Class**: `.contact-bouncing-logo` (fixed position, 100x100px)

### Project Page
- **Background**: `FaultyTerminal.jsx` - Matrix-style terminal effect
- **Library**: OGL (WebGL rendering library v1.0.11)
- **Effect**: Green matrix characters with noise/glitch patterns
- **Settings**:
  - `scale: 1.5`
  - `tint: "#4a7c59"` (gray-green forest color)
  - `curvature: 0.15` (fisheye effect)
  - `scanlineIntensity: 1`
  - `mouseReact: true`
- **Bouncing Logo**: Pochita bouncing with `project-bouncing-logo` div
- **CSS**: Fixed position background that covers full scrollable area

### Reference Page
- **Background**: `LetterGlitch.jsx` - Glitchy character matrix effect
- **Effect**: Random character glitching with color transitions
- **Settings**:
  - `glitchSpeed: 50` (fast transitions)
  - `centerVignette: true` (dark center vignette)
  - `outerVignette: false`
  - `smooth: true` (smooth color interpolation)
- **Bouncing Logo**: Pochita bouncing with `reference-bouncing-logo` div
- **CSS**: Fixed position background

---

## 🐶 Pochita Bouncing Logo System

### How It Works
- **Physics**: Uses `requestAnimationFrame` for smooth 60fps animation
- **Bounds**: Window dimensions (`window.innerWidth/innerHeight`)
- **Speed**: 1.5px per frame in both X and Y directions
- **Collision**: Precise corner detection with `>=` and `<=` comparisons
- **Rotation**: Rotates on each bounce for visual effect

### Logo Elements
```html
<!-- Global (Home/About pages) -->
<div id="bouncing-logo" class="bouncing-logo"></div>

<!-- Contact Page -->
<div id="contact-bouncing-logo" class="contact-bouncing-logo"></div>

<!-- Project Page -->
<div id="project-bouncing-logo" class="contact-bouncing-logo"></div>

<!-- Reference Page -->
<div id="reference-bouncing-logo" class="contact-bouncing-logo"></div>
```

### CSS Styling
```css
.contact-bouncing-logo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100px;
  height: 100px;
  z-index: 1;
  pointer-events: none;
  background-image: url('https://raw.githubusercontent.com/itzmedaniel/website/main/pochita.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.8;
}
```

### JavaScript Logic
```javascript
function selectLogoForPage(pageId) {
  // Hides all other logos and shows the appropriate one
  // Handles: 'contact', 'project', 'reference', or default (global)
}

function animateLogo() {
  // Physics-based bouncing with rotation
  // Uses window bounds for collision detection
}
```

---

## 🔧 React Components & Mounting

### Component Files
- `LiquidChrome.jsx` - Contact page background
- `FaultyTerminal.jsx` - Project page terminal matrix
- `LetterGlitch.jsx` - Reference page glitch effect

### React Roots
```javascript
let contactReactRoot = null;     // For LiquidChrome
let projectReactRoot = null;     // For FaultyTerminal
let referenceReactRoot = null;   // For LetterGlitch
```

### Mount/Unmount Functions
```javascript
// Contact Page
mountLiquidChrome()
unmountLiquidChrome()

// Project Page
mountFaultyTerminal()
unmountFaultyTerminal()

// Reference Page
mountLetterGlitch()
unmountLetterGlitch()
```

### Page Switching Logic
```javascript
showPage(pageId) {
  if (pageId === 'contact') {
    mountLiquidChrome();
    unmountFaultyTerminal();
    unmountLetterGlitch();
  } else if (pageId === 'project') {
    mountFaultyTerminal();
    unmountLiquidChrome();
    unmountLetterGlitch();
  } else if (pageId === 'reference') {
    mountLetterGlitch();
    unmountLiquidChrome();
    unmountFaultyTerminal();
  } else {
    // Unmount all
    unmountLiquidChrome();
    unmountFaultyTerminal();
    unmountLetterGlitch();
  }
  
  selectLogoForPage(pageId);
  startBouncingLogo();
}
```

---

## 📦 Dependencies

### Core
- **Vite** v4.5.14 - Build tool and dev server
- **React** v18.2.0 - UI library
- **React DOM** v18.2.0 - DOM rendering

### 3D Graphics
- **Three.js** v0.160.1 - 3D scene rendering
- **OGL** v1.0.11 - Lightweight WebGL library (for FaultyTerminal)

### Animation
- **anime.js** v3.2.2 - JavaScript animation library

### Styling
- **Tailwind CSS** - Via CDN (should be moved to PostCSS in production)

### File Handling
- **Git LFS** - For large model files (.glb)

---

## 🚀 Development

### Local Setup
```bash
cd website
npm install
npm run dev
```
Dev server runs at: `http://localhost:5173/website/`

### Build for Production
```bash
npm run build
```

### Deploy to GitHub Pages
- Automatic deployment via GitHub Actions
- Workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main` branch

---

## 🎯 Key Features

### Favicon System
- Multiple sizes (16x16, 32x32, 192x192, 512x512)
- Apple touch icon
- Located in `/favicon_io/` directory
- URLs: `https://raw.githubusercontent.com/itzmedaniel/website/main/favicon_io/...`

### Theme Switching
- Light/Dark mode toggle
- Persists in localStorage
- Affects 3D scene colors and UI

### Page Animations
- Glass panel entrance animations
- Character slide animations for headings
- Continuous hover animations
- Bouncing orbs on each page

### Responsive Design
- Mobile-friendly layout
- Responsive canvas sizing
- Touch-enabled controls (OrbitControls)

---

## 📁 Project Structure

```
website/
├── index.html              # Main HTML file
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── LiquidChrome.jsx        # Contact page background
├── FaultyTerminal.jsx      # Project page background
├── FaultyTerminal.css      # Terminal styling
├── LetterGlitch.jsx        # Reference page background
├── favicon_io/             # Favicon files
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   └── site.webmanifest
├── public/                 # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages deployment
└── REFERENCE.md            # This file
```

---

## 🐛 Known Issues & Fixes

### Issue: Pochita Not Bouncing
**Solution**: Check `selectLogoForPage()` includes the page ID and logo element exists in HTML

### Issue: Background Not Covering on Scroll
**Solution**: Use `position: fixed` instead of `position: absolute` for `.contact-terminal-bg`

### Issue: Duplicate React Root Declarations
**Solution**: Ensure only ONE declaration per root (contactReactRoot, projectReactRoot, referenceReactRoot)

### Issue: Component Not Rendering
**Solution**: 
1. Check import statement in `<script type="module">`
2. Verify mount function is called in `showPage()`
3. Check browser console for errors
4. Ensure target div exists in HTML

---

## 🎨 Color Palette

### Project Page Matrix
- **Primary**: `#4a7c59` (Gray-green forest)
- **Background**: Black with fixed positioning

### Reference Page Glitch
- **Colors**: `['#2b4539', '#61dca3', '#61b3dc']` (Dark green, cyan, blue)
- **Background**: Black

### Contact Page Chrome
- **Base**: `[0.1, 0.1, 0.1]` (Near black)
- **Effect**: Metallic liquid chrome shader

---

## 📝 Notes

- Tailwind CDN should be replaced with PostCSS build for production
- All background effects use React 18's `createRoot()` API
- Three.js models are loaded via Git LFS
- Animations use `requestAnimationFrame` for performance
- All backgrounds are unmounted when navigating away to prevent memory leaks

---

## 🔄 Update Checklist

When adding a new page with background effect:

1. ✅ Create component file (e.g., `NewEffect.jsx`)
2. ✅ Add import in `<script type="module">` section
3. ✅ Create React root variable (e.g., `let newReactRoot = null;`)
4. ✅ Create mount/unmount functions
5. ✅ Add background div to page HTML
6. ✅ Add bouncing logo div (if needed)
7. ✅ Update `showPage()` mounting logic
8. ✅ Update `selectLogoForPage()` function
9. ✅ Test in `npm run dev` before pushing
10. ✅ Update this REFERENCE.md file

---

**Last Updated**: November 8, 2025
**Maintained By**: Daniel
**Questions?**: Check GitHub issues or commit history
