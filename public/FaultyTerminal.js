// Simplified WebGL Terminal Effect (no external dependencies)
class FaultyTerminal {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      tint: options.tint || '#00ff00',
      mouseReact: options.mouseReact !== undefined ? options.mouseReact : true,
      timeScale: options.timeScale || 1,
      brightness: options.brightness || 1,
    };

    this.mouse = { x: 0.5, y: 0.5 };
    this.time = 0;
    this.rafId = null;
    
    console.log('FaultyTerminal: Starting initialization');
    this.init();
  }

  init() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);
    
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.gl = gl;
    this.canvas = canvas;
    
    console.log('FaultyTerminal: WebGL context created');
    
    // Set canvas size
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Mouse tracking
    if (this.options.mouseReact) {
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width;
        this.mouse.y = 1 - (e.clientY - rect.top) / rect.height;
      });
    }
    
    // Create shader program
    this.createShaderProgram();
    
    // Start animation
    this.start();
    
    console.log('FaultyTerminal: Initialized successfully!');
  }
  
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = 0.75; // OPTIMIZED: Render at 75% resolution
    this.canvas.width = this.container.offsetWidth * dpr * scale;
    this.canvas.height = this.container.offsetHeight * dpr * scale;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  
  createShaderProgram() {
    const gl = this.gl;
    
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform float time;
      uniform vec2 resolution;
      uniform vec2 mouse;
      uniform vec3 tint;
      uniform float brightness;
      
      float hash21(vec2 p){
        p = fract(p * 234.56);
        p += dot(p, p + 34.56);
        return fract(p.x * p.y);
      }
      
      float noise(vec2 p) {
        return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
      }
      
      mat2 rotate(float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c);
      }
      
      float fbm(vec2 p) {
        p *= 1.1;
        float f = 0.0;
        float amp = 0.5;
        
        mat2 modify0 = rotate(time * 0.02);
        f += amp * noise(p);
        p = modify0 * p * 2.0;
        amp *= 0.454545;
        
        mat2 modify1 = rotate(time * 0.02);
        f += amp * noise(p);
        p = modify1 * p * 2.0;
        amp *= 0.454545;
        
        mat2 modify2 = rotate(time * 0.08);
        f += amp * noise(p);
        
        return f;
      }
      
      float pattern(vec2 p, out vec2 q, out vec2 r) {
        vec2 offset1 = vec2(1.0);
        vec2 offset0 = vec2(0.0);
        mat2 rot01 = rotate(0.1 * time);
        mat2 rot1 = rotate(0.1);
        
        q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
        r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
        return fbm(p + r);
      }
      
      float digit(vec2 p, vec2 mouse) {
        vec2 grid = vec2(2.0, 1.0) * 15.0;
        vec2 s = floor(p * grid) / grid;
        p = p * grid;
        vec2 q, r;
        float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
        
        // Mouse interaction
        vec2 mouseWorld = mouse * 1.5;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * 0.5 * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - time * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
        
        p = fract(p);
        p *= 1.2;
        
        float px5 = p.x * 5.0;
        float py5 = (1.0 - p.y) * 5.0;
        float x = fract(px5);
        float y = fract(py5);
        
        float i = floor(py5) - 2.0;
        float j = floor(px5) - 2.0;
        float n = i * i + j * j;
        float f = n * 0.0625;
        
        float isOn = step(0.1, intensity - f);
        float bright = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
        
        return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * bright;
      }
      
      float onOff(float a, float b, float c) {
        return step(c, sin(time + a * cos(time * b)));
      }
      
      float displace(vec2 look) {
        float y = look.y - mod(time * 0.25, 1.0);
        float window = 1.0 / (1.0 + 50.0 * y * y);
        return sin(look.y * 20.0 + time) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(time * 60.0)) * window;
      }
      
      vec3 getColor(vec2 p, vec2 mouse) {
        float timeScaled = time * 0.333333;
        
        // Scanlines
        float bar = step(mod(p.y + timeScaled * 20.0, 1.0), 0.2) * 0.4 + 1.0;
        
        // Displacement/glitch
        float displacement = displace(p);
        p.x += displacement;
        
        float middle = digit(p, mouse);
        
        // Soft glow effect
        const float off = 0.002;
        float sum = digit(p + vec2(-off, -off), mouse) + digit(p + vec2(0.0, -off), mouse) + digit(p + vec2(off, -off), mouse) +
                    digit(p + vec2(-off, 0.0), mouse) + digit(p + vec2(0.0, 0.0), mouse) + digit(p + vec2(off, 0.0), mouse) +
                    digit(p + vec2(-off, off), mouse) + digit(p + vec2(0.0, off), mouse) + digit(p + vec2(off, off), mouse);
        
        vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
        return baseColor;
      }
      
      vec2 barrel(vec2 uv) {
        vec2 c = uv * 2.0 - 1.0;
        float r2 = dot(c, c);
        c *= 1.0 + 0.2 * r2; // Curvature amount
        return c * 0.5 + 0.5;
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        
        // Apply barrel distortion (fisheye)
        uv = barrel(uv);
        
        vec2 p = uv * 1.5;
        vec3 col = getColor(p, mouse);
        
        col *= tint;
        col *= brightness;
        
        gl_FragColor = vec4(col, 1.0);
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
      time: gl.getUniformLocation(program, 'time'),
      resolution: gl.getUniformLocation(program, 'resolution'),
      mouse: gl.getUniformLocation(program, 'mouse'),
      tint: gl.getUniformLocation(program, 'tint'),
      brightness: gl.getUniformLocation(program, 'brightness'),
    };
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
  
  hexToRgb(hex) {
    let h = hex.replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    const num = parseInt(h, 16);
    return [
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    ];
  }
  
  animate(timestamp) {
    this.rafId = requestAnimationFrame((t) => this.animate(t));
    
    this.time = timestamp * 0.001 * this.options.timeScale;
    
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Update uniforms
    gl.uniform1f(this.uniforms.time, this.time);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uniforms.brightness, this.options.brightness);
    
    const tintRgb = this.hexToRgb(this.options.tint);
    gl.uniform3f(this.uniforms.tint, tintRgb[0], tintRgb[1], tintRgb[2]);
    
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
    console.log('FaultyTerminal: Destroying instance');
    this.stop();
    if (this.canvas && this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
    if (this.gl) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }
}
