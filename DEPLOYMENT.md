# Deployment Guide for GitHub Pages

## ✅ Configuration Complete

Your website is now fully configured for deployment to GitHub Pages. Here's what has been set up:

### 1. **Vite Configuration** (`vite.config.js`)
- ✅ Base path set to `/website/` (matches your GitHub repository name)
- ✅ Public directory properly configured
- ✅ Build output directory set to `dist`
- ✅ Public files will be copied to dist during build

### 2. **Script Paths Fixed** (`index.html`)
All script loaders now use relative paths that work with GitHub Pages:
- ✅ `./CardNav.js` (was `/CardNav.js`)
- ✅ `./MetallicPaint.js` (was `/MetallicPaint.js`)
- ✅ `./Plasma.js`
- ✅ `./LiquidChrome.js`
- ✅ `./FaultyTerminal.js`
- ✅ `./LetterGlitch.js`
- ✅ `./ClickSpark.js`

### 3. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
- ✅ Automatically builds and deploys on push to `main` branch
- ✅ Uses Node.js 20
- ✅ Installs dependencies and builds the project
- ✅ Deploys to GitHub Pages

### 4. **Public Files**
All required JavaScript files are in the `public/` folder and will be copied to `dist/`:
- CardNav.js
- ClickSpark.js
- FaultyTerminal.js
- LetterGlitch.js
- LiquidChrome.js
- MetallicPaint.js
- Plasma.js

---

## 🚀 How to Deploy

### Option 1: Push to GitHub (Automatic)
1. **Commit your changes:**
   ```powershell
   git add .
   git commit -m "Fix script paths for GitHub Pages deployment"
   ```

2. **Push to GitHub:**
   ```powershell
   git push origin main
   ```

3. **Wait for deployment:**
   - Go to your repository on GitHub
   - Click on the "Actions" tab
   - Watch the deployment workflow run
   - Once complete, your site will be live at: `https://itzmedaniel.github.io/website/`

### Option 2: Manual Build & Deploy
If you need to test the build locally first:
```powershell
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

---

## 🔍 Verify Deployment

After deployment, check:
1. ✅ Website loads at `https://itzmedaniel.github.io/website/`
2. ✅ Navigation pills work (Home, About Me, Project, Contact, Reference)
3. ✅ Background effects load on each page
4. ✅ 3D models render correctly
5. ✅ Theme switcher works (Light/Dark/System)
6. ✅ All animations work smoothly

---

## 🛠️ Troubleshooting

### If scripts fail to load:
- Check browser console for 404 errors
- Verify all files in `public/` are copied to `dist/` after build
- Ensure base path in `vite.config.js` matches your repo name

### If GitHub Actions fails:
- Check the Actions tab for error messages
- Verify GitHub Pages is enabled in repository settings
- Ensure repository name matches the base path in `vite.config.js`

### Enable GitHub Pages (if not already):
1. Go to repository Settings
2. Click "Pages" in the sidebar
3. Source should be set to "GitHub Actions"
4. Save if needed

---

## 📝 Important Notes

- **Base Path:** The `/website/` base path must match your GitHub repository name
- **Public Folder:** All files in `public/` are automatically copied to `dist/` during build
- **Relative Paths:** All script src paths use `./` to work with the base path
- **Build Before Push:** Not required - GitHub Actions will build automatically
- **Local Preview:** Use `npm run preview` to test the production build locally

---

## 🎉 You're All Set!

Your code is now fully compatible with GitHub Pages deployment. Just push your changes and the website will automatically deploy!

**Live URL:** https://itzmedaniel.github.io/website/
