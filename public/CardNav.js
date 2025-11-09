// Vanilla JS version of CardNav - Simple Horizontal Navigation
class CardNav {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { categories: options.categories || [] };
    this.navEl = null;
    this.metallicInstances = [];
    this.init();
  }
  init() {
    this.render();
    this.attachEventListeners();
    this.initMetallicDots();
  }
  render() {
    const allSections = this.options.categories.flatMap(cat => cat.sections);
    const navHTML = `<nav class="card-nav"><div class="nav-items">${allSections.map(section => `<button class="nav-item" data-page-id="${section.pageId}"><canvas class="item-dot-canvas" data-text="●"></canvas><span class="item-title">${section.title}</span></button>`).join('')}</div></nav>`;
    this.container.innerHTML = navHTML;
    this.navEl = this.container.querySelector('.card-nav');
  }
  initMetallicDots() {
    const canvases = this.container.querySelectorAll('.item-dot-canvas');
    canvases.forEach(canvas => {
      const text = canvas.getAttribute('data-text');
      const imageData = this.createTextImageData(text);
      
      if (window.MetallicPaint && imageData) {
        const metallic = new window.MetallicPaint(canvas, imageData, {
          patternScale: 0.8,
          refraction: 0.12,
          edge: 0.6,
          patternBlur: 0.001,
          liquid: 0.25,
          speed: 0.3
        });
        this.metallicInstances.push(metallic);
      }
    });
  }
  createTextImageData(text) {
    if (window.parseTextToImageData) {
      return window.parseTextToImageData(text, {
        fontSize: 32,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        padding: 5
      });
    }
    return null;
  }
  createTextImageData(text) {
    if (window.parseTextToImageData) {
      return window.parseTextToImageData(text, {
        fontSize: 20,
        fontFamily: 'Arial, sans-serif',
        fontWeight: '400',
        padding: 2
      });
    }
    return null;
  }
  createSquareImageData(color) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);
    
    // Create a gradient from center outward - this provides edge data for the shader
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2 - 10);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.5, 'white');
    gradient.addColorStop(0.8, 'rgb(180, 180, 180)');
    gradient.addColorStop(1, 'rgb(100, 100, 100)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
    ctx.fill();
    
    return ctx.getImageData(0, 0, size, size);
  }
  createCircleImageData(color) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);
    
    // Draw multiple circles to ensure complete fill
    ctx.fillStyle = 'white';
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;
    
    // Fill the entire circle area with white pixels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    return ctx.getImageData(0, 0, size, size);
  }
  attachEventListeners() {
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.getAttribute('data-page-id');
        if (pageId) {
          if (pageId === 'home' && typeof window.showHomePage === 'function') { window.showHomePage(); }
          else if (typeof window.showPage === 'function') { window.showPage(pageId); }
        }
      });
    });
  }
  destroy() {
    this.metallicInstances.forEach(instance => instance.destroy());
    this.metallicInstances = [];
  }
}
window.CardNav = CardNav;
