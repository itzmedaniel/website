// Vanilla JS version of ClickSpark
class ClickSpark {
  constructor(options = {}) {
    this.options = {
      sparkColor: options.sparkColor || '#fff',
      sparkSize: options.sparkSize || 10,
      sparkRadius: options.sparkRadius || 15,
      sparkCount: options.sparkCount || 8,
      duration: options.duration || 400,
      easing: options.easing || 'ease-out',
      extraScale: options.extraScale || 1.0
    };

    this.canvas = null;
    this.ctx = null;
    this.sparks = [];
    this.animationId = null;

    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.userSelect = 'none';
    
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resizeCanvas();

    // Handle window resize
    this.resizeTimeout = null;
    this.handleResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resizeCanvas(), 100);
    };
    window.addEventListener('resize', this.handleResize);

    // Handle clicks
    this.handleClick = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      this.createSparks(x, y);
    };
    document.addEventListener('click', this.handleClick);

    // Start animation loop
    this.animate();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  easeFunc(t) {
    switch (this.options.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: // ease-out
        return t * (2 - t);
    }
  }

  createSparks(x, y) {
    const now = performance.now();
    const { sparkCount } = this.options;

    for (let i = 0; i < sparkCount; i++) {
      this.sparks.push({
        x,
        y,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now
      });
    }
  }

  animate(timestamp) {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { duration, sparkRadius, sparkSize, sparkColor, extraScale } = this.options;

    // Filter and draw sparks
    this.sparks = this.sparks.filter(spark => {
      const elapsed = timestamp - spark.startTime;
      if (elapsed >= duration) {
        return false;
      }

      const progress = elapsed / duration;
      const eased = this.easeFunc(progress);

      const distance = eased * sparkRadius * extraScale;
      const lineLength = sparkSize * (1 - eased);

      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      this.ctx.strokeStyle = sparkColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();

      return true;
    });

    this.animationId = requestAnimationFrame((ts) => this.animate(ts));
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.handleClick) {
      document.removeEventListener('click', this.handleClick);
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
