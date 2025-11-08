// Vanilla JS version of LightRays
class LightRays {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      raysOrigin: options.raysOrigin || 'top-center',
      raysColor: options.raysColor || '#ffffff',
      raysSpeed: options.raysSpeed !== undefined ? options.raysSpeed : 1,
      lightSpread: options.lightSpread !== undefined ? options.lightSpread : 1,
      rayLength: options.rayLength !== undefined ? options.rayLength : 2,
      pulsating: options.pulsating !== undefined ? options.pulsating : false,
      fadeDistance: options.fadeDistance !== undefined ? options.fadeDistance : 1.0,
      saturation: options.saturation !== undefined ? options.saturation : 1.0,
      followMouse: options.followMouse !== undefined ? options.followMouse : true,
      mouseInfluence: options.mouseInfluence !== undefined ? options.mouseInfluence : 0.1,
      noiseAmount: options.noiseAmount !== undefined ? options.noiseAmount : 0.0,
      distortion: options.distortion !== undefined ? options.distortion : 0.0,
    };

    this.mouse = { x: 0.5, y: 0.5 };
    this.smoothMouse = { x: 0.5, y: 0.5 };
    this.time = 0;
    this.rafId = null;
    this.gl = null;
    this.canvas = null;
    this.program = null;
    this.uniforms = null;
    
    console.log('LightRays: Starting initialization');
    this.init();
  }

  hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
  }

  getAnchorAndDir(origin, w, h) {
    const outside = 0.2;
    switch (origin) {
      case 'top-left':
        return { anchor: [0, -outside * h], dir: [0, 1] };
      case 'top-right':
        return { anchor: [w, -outside * h], dir: [0, 1] };
      case 'left':
        return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
      case 'right':
        return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
      case 'bottom-left':
        return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
      case 'bottom-center':
        return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
      case 'bottom-right':
        return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
      default: // "top-center"
        return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
    }
  }

  init() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    this.container.appendChild(canvas);
    
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    this.gl = gl;
    this.canvas = canvas;
    
    console.log('LightRays: WebGL context created');
    
    // Set canvas size
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Mouse tracking
    if (this.options.followMouse) {
      this.handleMouseMove = (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) / rect.width;
        this.mouse.y = (e.clientY - rect.top) / rect.height;
      };
      window.addEventListener('mousemove', this.handleMouseMove);
    }
    
    // Create shader program
    this.createShaderProgram();
    
    // Start animation
    this.start();
    
    console.log('LightRays: Initialized successfully!');
  }
  
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.container.offsetWidth * dpr;
    this.canvas.height = this.container.offsetHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Update anchor and direction
    if (this.uniforms) {
      const { anchor, dir } = this.getAnchorAndDir(
        this.options.raysOrigin, 
        this.canvas.width, 
        this.canvas.height
      );
      this.gl.uniform2f(this.uniforms.rayPos, anchor[0], anchor[1]);
      this.gl.uniform2f(this.uniforms.rayDir, dir[0], dir[1]);
      this.gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
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

      uniform float iTime;
      uniform vec2  iResolution;

      uniform vec2  rayPos;
      uniform vec2  rayDir;
      uniform vec3  raysColor;
      uniform float raysSpeed;
      uniform float lightSpread;
      uniform float rayLength;
      uniform float pulsating;
      uniform float fadeDistance;
      uniform float saturation;
      uniform vec2  mousePos;
      uniform float mouseInfluence;
      uniform float noiseAmount;
      uniform float distortion;

      varying vec2 vUv;

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                        float seedA, float seedB, float speed) {
        vec2 sourceToCoord = coord - raySource;
        vec2 dirNorm = normalize(sourceToCoord);
        float cosAngle = dot(dirNorm, rayRefDirection);

        float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
        
        float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

        float distance = length(sourceToCoord);
        float maxDistance = iResolution.x * rayLength;
        float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
        
        float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
        float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

        float baseStrength = clamp(
          (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
          (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
          0.0, 1.0
        );

        return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
        
        vec2 finalRayDir = rayDir;
        if (mouseInfluence > 0.0) {
          vec2 mouseScreenPos = mousePos * iResolution.xy;
          vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
          finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
        }

        vec4 rays1 = vec4(1.0) *
                     rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                                 1.5 * raysSpeed);
        vec4 rays2 = vec4(1.0) *
                     rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                                 1.1 * raysSpeed);

        fragColor = rays1 * 0.5 + rays2 * 0.4;

        if (noiseAmount > 0.0) {
          float n = noise(coord * 0.01 + iTime * 0.1);
          fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
        }

        float brightness = 1.0 - (coord.y / iResolution.y);
        fragColor.x *= 0.1 + brightness * 0.8;
        fragColor.y *= 0.3 + brightness * 0.6;
        fragColor.z *= 0.5 + brightness * 0.5;

        if (saturation != 1.0) {
          float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
          fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
        }

        fragColor.rgb *= raysColor;
      }

      void main() {
        vec4 color;
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
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
      rayPos: gl.getUniformLocation(program, 'rayPos'),
      rayDir: gl.getUniformLocation(program, 'rayDir'),
      raysColor: gl.getUniformLocation(program, 'raysColor'),
      raysSpeed: gl.getUniformLocation(program, 'raysSpeed'),
      lightSpread: gl.getUniformLocation(program, 'lightSpread'),
      rayLength: gl.getUniformLocation(program, 'rayLength'),
      pulsating: gl.getUniformLocation(program, 'pulsating'),
      fadeDistance: gl.getUniformLocation(program, 'fadeDistance'),
      saturation: gl.getUniformLocation(program, 'saturation'),
      mousePos: gl.getUniformLocation(program, 'mousePos'),
      mouseInfluence: gl.getUniformLocation(program, 'mouseInfluence'),
      noiseAmount: gl.getUniformLocation(program, 'noiseAmount'),
      distortion: gl.getUniformLocation(program, 'distortion'),
    };
    
    // Initialize uniforms
    const { anchor, dir } = this.getAnchorAndDir(
      this.options.raysOrigin, 
      this.canvas.width, 
      this.canvas.height
    );
    
    gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.rayPos, anchor[0], anchor[1]);
    gl.uniform2f(this.uniforms.rayDir, dir[0], dir[1]);
    
    const colorRgb = this.hexToRgb(this.options.raysColor);
    gl.uniform3f(this.uniforms.raysColor, colorRgb[0], colorRgb[1], colorRgb[2]);
    gl.uniform1f(this.uniforms.raysSpeed, this.options.raysSpeed);
    gl.uniform1f(this.uniforms.lightSpread, this.options.lightSpread);
    gl.uniform1f(this.uniforms.rayLength, this.options.rayLength);
    gl.uniform1f(this.uniforms.pulsating, this.options.pulsating ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.fadeDistance, this.options.fadeDistance);
    gl.uniform1f(this.uniforms.saturation, this.options.saturation);
    gl.uniform2f(this.uniforms.mousePos, 0.5, 0.5);
    gl.uniform1f(this.uniforms.mouseInfluence, this.options.mouseInfluence);
    gl.uniform1f(this.uniforms.noiseAmount, this.options.noiseAmount);
    gl.uniform1f(this.uniforms.distortion, this.options.distortion);
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
    
    this.time = timestamp * 0.001;
    
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(this.program);
    
    // Update time uniform
    gl.uniform1f(this.uniforms.iTime, this.time);
    
    // Update mouse position with smoothing
    if (this.options.followMouse && this.options.mouseInfluence > 0.0) {
      const smoothing = 0.92;
      this.smoothMouse.x = this.smoothMouse.x * smoothing + this.mouse.x * (1 - smoothing);
      this.smoothMouse.y = this.smoothMouse.y * smoothing + this.mouse.y * (1 - smoothing);
      gl.uniform2f(this.uniforms.mousePos, this.smoothMouse.x, this.smoothMouse.y);
    }
    
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
    console.log('LightRays: Destroying instance');
    this.stop();
    
    if (this.handleMouseMove) {
      window.removeEventListener('mousemove', this.handleMouseMove);
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
