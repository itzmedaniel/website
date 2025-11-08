// Vanilla JS version of Plasma
class Plasma {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      color: options.color || '#ff6b35',
      speed: options.speed !== undefined ? options.speed : 0.6,
      direction: options.direction || 'forward',
      scale: options.scale !== undefined ? options.scale : 1.1,
      opacity: options.opacity !== undefined ? options.opacity : 0.8,
      mouseInteractive: options.mouseInteractive !== undefined ? options.mouseInteractive : true,
    };

    this.mousePos = { x: 0, y: 0 };
    this.startTime = performance.now();
    this.rafId = null;
    this.gl = null;
    this.canvas = null;
    this.program = null;
    this.uniforms = null;
    
    console.log('Plasma: Starting initialization');
    this.init();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [1, 0.5, 0.2];
    return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
  }

  init() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);
    
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.gl = gl;
    this.canvas = canvas;
    
    console.log('Plasma: WebGL context created');
    
    // Set canvas size
    this.resize();
    
    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    
    // Mouse tracking
    if (this.options.mouseInteractive) {
      this.handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
      };
      this.container.addEventListener('mousemove', this.handleMouseMove);
    }
    
    // Create shader program
    this.createShaderProgram();
    
    // Start animation
    this.start();
    
    console.log('Plasma: Initialized successfully!');
  }
  
  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.uniforms) {
      this.gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
    }
  }
  
  createShaderProgram() {
    const gl = this.gl;
    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    
    const vertexShaderSource = isWebGL2 ? `#version 300 es
      precision highp float;
      in vec2 position;
      in vec2 uv;
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    ` : `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = isWebGL2 ? `#version 300 es
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec3 uCustomColor;
      uniform float uUseCustomColor;
      uniform float uSpeed;
      uniform float uDirection;
      uniform float uScale;
      uniform float uOpacity;
      uniform vec2 uMouse;
      uniform float uMouseInteractive;
      out vec4 fragColor;

      void mainImage(out vec4 o, vec2 C) {
        vec2 center = iResolution.xy * 0.5;
        C = (C - center) / uScale + center;
        
        vec2 mouseOffset = (uMouse - center) * 0.0002;
        C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
        
        float i, d, z, T = iTime * uSpeed * uDirection;
        vec3 O, p, S;

        for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
          p = z*normalize(vec3(C-.5*r,r.y)); 
          p.z -= 4.; 
          S = p;
          d = p.y-T;
          
          p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
          Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
          z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4; 
          o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
        }
        
        o.xyz = tanh(O/1e4);
      }

      bool finite1(float x){ return !(isnan(x) || isinf(x)); }
      vec3 sanitize(vec3 c){
        return vec3(
          finite1(c.r) ? c.r : 0.0,
          finite1(c.g) ? c.g : 0.0,
          finite1(c.b) ? c.b : 0.0
        );
      }

      void main() {
        vec4 o = vec4(0.0);
        mainImage(o, gl_FragCoord.xy);
        vec3 rgb = sanitize(o.rgb);
        
        float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
        vec3 customColor = intensity * uCustomColor;
        vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
        
        float alpha = length(rgb) * uOpacity;
        fragColor = vec4(finalColor, alpha);
      }
    ` : `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec3 uCustomColor;
      uniform float uUseCustomColor;
      uniform float uSpeed;
      uniform float uDirection;
      uniform float uScale;
      uniform float uOpacity;
      uniform vec2 uMouse;
      uniform float uMouseInteractive;

      void mainImage(out vec4 o, vec2 C) {
        vec2 center = iResolution.xy * 0.5;
        C = (C - center) / uScale + center;
        
        vec2 mouseOffset = (uMouse - center) * 0.0002;
        C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
        
        float i, d, z, T = iTime * uSpeed * uDirection;
        vec3 O, p, S;

        for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
          p = z*normalize(vec3(C-.5*r,r.y)); 
          p.z -= 4.; 
          S = p;
          d = p.y-T;
          
          p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
          Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
          z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4; 
          o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
        }
        
        o.xyz = tanh(O/1e4);
      }

      vec3 sanitize(vec3 c){
        return c;
      }

      void main() {
        vec4 o = vec4(0.0);
        mainImage(o, gl_FragCoord.xy);
        vec3 rgb = sanitize(o.rgb);
        
        float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
        vec3 customColor = intensity * uCustomColor;
        vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
        
        float alpha = length(rgb) * uOpacity;
        gl_FragColor = vec4(finalColor, alpha);
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
      iTime: gl.getUniformLocation(program, 'iTime'),
      iResolution: gl.getUniformLocation(program, 'iResolution'),
      uCustomColor: gl.getUniformLocation(program, 'uCustomColor'),
      uUseCustomColor: gl.getUniformLocation(program, 'uUseCustomColor'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uDirection: gl.getUniformLocation(program, 'uDirection'),
      uScale: gl.getUniformLocation(program, 'uScale'),
      uOpacity: gl.getUniformLocation(program, 'uOpacity'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uMouseInteractive: gl.getUniformLocation(program, 'uMouseInteractive'),
    };
    
    // Initialize uniforms
    const useCustomColor = this.options.color ? 1.0 : 0.0;
    const customColorRgb = this.options.color ? this.hexToRgb(this.options.color) : [1, 1, 1];
    const directionMultiplier = this.options.direction === 'reverse' ? -1.0 : 1.0;
    
    gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
    gl.uniform3f(this.uniforms.uCustomColor, customColorRgb[0], customColorRgb[1], customColorRgb[2]);
    gl.uniform1f(this.uniforms.uUseCustomColor, useCustomColor);
    gl.uniform1f(this.uniforms.uSpeed, this.options.speed * 0.4);
    gl.uniform1f(this.uniforms.uDirection, directionMultiplier);
    gl.uniform1f(this.uniforms.uScale, this.options.scale);
    gl.uniform1f(this.uniforms.uOpacity, this.options.opacity);
    gl.uniform2f(this.uniforms.uMouse, 0, 0);
    gl.uniform1f(this.uniforms.uMouseInteractive, this.options.mouseInteractive ? 1.0 : 0.0);
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
    
    const timeValue = (timestamp - this.startTime) * 0.001;
    
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(this.program);
    
    // Update time uniform
    gl.uniform1f(this.uniforms.iTime, timeValue);
    
    // Update direction for pingpong
    if (this.options.direction === 'pingpong') {
      const directionMultiplier = this.options.direction === 'reverse' ? -1.0 : 1.0;
      const cycle = Math.sin(timeValue * 0.5) * directionMultiplier;
      gl.uniform1f(this.uniforms.uDirection, cycle);
    }
    
    // Update mouse position
    if (this.options.mouseInteractive) {
      gl.uniform2f(this.uniforms.uMouse, this.mousePos.x, this.mousePos.y);
    }
    
    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  start() {
    if (!this.rafId) {
      this.startTime = performance.now();
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
    console.log('Plasma: Destroying instance');
    this.stop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.handleMouseMove) {
      this.container.removeEventListener('mousemove', this.handleMouseMove);
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
