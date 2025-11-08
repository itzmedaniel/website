// Vanilla JS version of LetterGlitch
class LetterGlitch {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      glitchColors: options.glitchColors || ['#2b4539', '#61dca3', '#61b3dc'],
      glitchSpeed: options.glitchSpeed || 50,
      centerVignette: options.centerVignette !== undefined ? options.centerVignette : true,
      outerVignette: options.outerVignette !== undefined ? options.outerVignette : false,
      smooth: options.smooth !== undefined ? options.smooth : true,
      characters: options.characters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789'
    };

    this.letters = [];
    this.grid = { columns: 0, rows: 0 };
    this.context = null;
    this.animationId = null;
    this.lastGlitchTime = Date.now();

    this.fontSize = 16;
    this.charWidth = 10;
    this.charHeight = 20;
    this.lettersAndSymbols = Array.from(this.options.characters);

    console.log('LetterGlitch: Starting initialization');
    this.init();
  }

  getRandomChar() {
    return this.lettersAndSymbols[Math.floor(Math.random() * this.lettersAndSymbols.length)];
  }

  getRandomColor() {
    return this.options.glitchColors[Math.floor(Math.random() * this.options.glitchColors.length)];
  }

  hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  interpolateColor(start, end, factor) {
    const result = {
      r: Math.round(start.r + (end.r - start.r) * factor),
      g: Math.round(start.g + (end.g - start.g) * factor),
      b: Math.round(start.b + (end.b - start.b) * factor)
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
  }

  calculateGrid(width, height) {
    const columns = Math.ceil(width / this.charWidth);
    const rows = Math.ceil(height / this.charHeight);
    return { columns, rows };
  }

  initializeLetters(columns, rows) {
    this.grid = { columns, rows };
    const totalLetters = columns * rows;
    this.letters = Array.from({ length: totalLetters }, () => ({
      char: this.getRandomChar(),
      color: this.getRandomColor(),
      targetColor: this.getRandomColor(),
      colorProgress: 1
    }));
  }

  init() {
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.backgroundColor = '#000000';
    wrapper.style.overflow = 'hidden';
    this.container.appendChild(wrapper);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    wrapper.appendChild(canvas);
    this.canvas = canvas;

    // Create vignettes
    if (this.options.outerVignette) {
      const outerVignette = document.createElement('div');
      outerVignette.style.position = 'absolute';
      outerVignette.style.top = '0';
      outerVignette.style.left = '0';
      outerVignette.style.width = '100%';
      outerVignette.style.height = '100%';
      outerVignette.style.pointerEvents = 'none';
      outerVignette.style.background = 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)';
      wrapper.appendChild(outerVignette);
    }

    if (this.options.centerVignette) {
      const centerVignette = document.createElement('div');
      centerVignette.style.position = 'absolute';
      centerVignette.style.top = '0';
      centerVignette.style.left = '0';
      centerVignette.style.width = '100%';
      centerVignette.style.height = '100%';
      centerVignette.style.pointerEvents = 'none';
      centerVignette.style.background = 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)';
      wrapper.appendChild(centerVignette);
    }

    this.context = canvas.getContext('2d');
    this.resizeCanvas();

    // Handle window resize
    this.resizeTimeout = null;
    this.handleResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        cancelAnimationFrame(this.animationId);
        this.resizeCanvas();
        this.animate();
      }, 100);
    };
    window.addEventListener('resize', this.handleResize);

    this.animate();
    console.log('LetterGlitch: Initialized successfully!');
  }

  resizeCanvas() {
    const canvas = this.canvas;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (this.context) {
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const { columns, rows } = this.calculateGrid(rect.width, rect.height);
    this.initializeLetters(columns, rows);

    this.drawLetters();
  }

  drawLetters() {
    if (!this.context || this.letters.length === 0) return;
    const ctx = this.context;
    const { width, height } = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${this.fontSize}px monospace`;
    ctx.textBaseline = 'top';

    this.letters.forEach((letter, index) => {
      const x = (index % this.grid.columns) * this.charWidth;
      const y = Math.floor(index / this.grid.columns) * this.charHeight;
      ctx.fillStyle = letter.color;
      ctx.fillText(letter.char, x, y);
    });
  }

  updateLetters() {
    if (!this.letters || this.letters.length === 0) return;

    const updateCount = Math.max(1, Math.floor(this.letters.length * 0.05));

    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * this.letters.length);
      if (!this.letters[index]) continue;

      this.letters[index].char = this.getRandomChar();
      this.letters[index].targetColor = this.getRandomColor();

      if (!this.options.smooth) {
        this.letters[index].color = this.letters[index].targetColor;
        this.letters[index].colorProgress = 1;
      } else {
        this.letters[index].colorProgress = 0;
      }
    }
  }

  handleSmoothTransitions() {
    let needsRedraw = false;
    this.letters.forEach(letter => {
      if (letter.colorProgress < 1) {
        letter.colorProgress += 0.05;
        if (letter.colorProgress > 1) letter.colorProgress = 1;

        const startRgb = this.hexToRgb(letter.color);
        const endRgb = this.hexToRgb(letter.targetColor);
        if (startRgb && endRgb) {
          letter.color = this.interpolateColor(startRgb, endRgb, letter.colorProgress);
          needsRedraw = true;
        }
      }
    });

    if (needsRedraw) {
      this.drawLetters();
    }
  }

  animate() {
    const now = Date.now();
    if (now - this.lastGlitchTime >= this.options.glitchSpeed) {
      this.updateLetters();
      this.drawLetters();
      this.lastGlitchTime = now;
    }

    if (this.options.smooth) {
      this.handleSmoothTransitions();
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    console.log('LetterGlitch: Destroying instance');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.canvas && this.canvas.parentElement) {
      this.container.removeChild(this.canvas.parentElement);
    }
  }
}
