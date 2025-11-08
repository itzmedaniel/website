// Vanilla JS version of LiquidChrome
class LiquidChrome {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      baseColor: options.baseColor || [0.1, 0.1, 0.1],
      speed: options.speed !== undefined ? options.speed : 0.2,
      amplitude: options.amplitude !== undefined ? options.amplitude : 0.3,
      frequencyX: options.frequencyX !== undefined ? options.frequencyX : 3,
      frequencyY: options.frequencyY !== undefined ? options.frequencyY : 3,
      interactive: options.interactive !== undefined ? options.interactive : true,
    };

    this.rafId = null;
    this.gl = null;
    this.canvas = null;
    this.program = null;
    this.uniforms = null;
    
    console.log('LiquidChrome: Starting initialization', this.options);
    this.init();
  }

  init() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);
    
    const gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl', { antialias: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.gl = gl;
    this.canvas = canvas;
    gl.clearColor(1, 1, 1, 1);
    
    console.log('LiquidChrome: WebGL context created');
    
    // Set canvas size
    this.resize();
    
    // Mouse/touch tracking
    this.mouseX = 0.5;
    this.mouseY = 0.5;
    
    if (this.options.interactive) {
      this.handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left) / rect.width;
        this.mouseY = 1 - (e.clientY - rect.top) / rect.height;
      };
      
      this.handleTouchMove = (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const rect = this.container.getBoundingClientRect();
          this.mouseX = (touch.clientX - rect.left) / rect.width;
          this.mouseY = 1 - (touch.clientY - rect.top) / rect.height;
        }
      };
      
      this.container.addEventListener('mousemove', this.handleMouseMove);
      this.container.addEventListener('touchmove', this.handleTouchMove);
    }
    
    // Resize handler
    this.handleResize = () => this.resize();
    window.addEventListener('resize', this.handleResize);
    
    // Create shader program
    this.createShaderProgram();
    
    // Start animation
    this.start();
    
    console.log('LiquidChrome: Initialized successfully!');
  }
  
  resize() {
    const width = Math.max(1, Math.floor(this.container.offsetWidth));
    const height = Math.max(1, Math.floor(this.container.offsetHeight));
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.gl.viewport(0, 0, width, height);
    
    if (this.program && this.uniforms) {
      this.gl.useProgram(this.program);
      this.gl.uniform3f(this.uniforms.uResolution, width, height, width / (height || 1));
    }
  }
  
  createShaderProgram() {
    const gl = this.gl;
    
    const vertexShaderSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      varying vec2 vUv;

      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

          for (float i = 1.0; i < 10.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
          }

          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;

          vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
          return vec4(color, 1.0);
      }

      void main() {
          vec4 col = vec4(0.0);
          int samples = 0;
          for (int i = -1; i <= 1; i++){
              for (int j = -1; j <= 1; j++){
                  vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                  col += renderImage(vUv + offset);
                  samples++;
              }
          }
          gl_FragColor = col / float(samples);
      }
    `;
    
    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      console.error('Shader compilation failed');
      return;
    }
    
    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    this.program = program;
    gl.useProgram(program);
    
    // Create fullscreen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Get uniform locations
    this.uniforms = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uBaseColor: gl.getUniformLocation(program, 'uBaseColor'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uFrequencyX: gl.getUniformLocation(program, 'uFrequencyX'),
      uFrequencyY: gl.getUniformLocation(program, 'uFrequencyY'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
    };
    
    // Initialize uniforms
    gl.uniform3f(this.uniforms.uResolution, this.canvas.width, this.canvas.height, this.canvas.width / this.canvas.height);
    gl.uniform3f(this.uniforms.uBaseColor, this.options.baseColor[0], this.options.baseColor[1], this.options.baseColor[2]);
    gl.uniform1f(this.uniforms.uAmplitude, this.options.amplitude);
    gl.uniform1f(this.uniforms.uFrequencyX, this.options.frequencyX);
    gl.uniform1f(this.uniforms.uFrequencyY, this.options.frequencyY);
    gl.uniform2f(this.uniforms.uMouse, 0.5, 0.5);
  }
  
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  animate(timestamp) {
    this.rafId = requestAnimationFrame((t) => this.animate(t));
    
    const gl = this.gl;
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Update time uniform
    gl.uniform1f(this.uniforms.uTime, timestamp * 0.001 * this.options.speed);
    
    // Update mouse uniform
    gl.uniform2f(this.uniforms.uMouse, this.mouseX, this.mouseY);
    
    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  start() {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame((t) => this.animate(t));
    }
  }
  
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  destroy() {
    console.log('LiquidChrome: Destroying instance');
    this.stop();
    
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    
    if (this.handleMouseMove) {
      this.container.removeEventListener('mousemove', this.handleMouseMove);
    }
    
    if (this.handleTouchMove) {
      this.container.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    if (this.canvas && this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
    
    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }
}
