// Vanilla JS WebGL Metallic Paint Effect
class MetallicPaint {
  constructor(canvas, imageData, params = {}) {
    console.log('MetallicPaint constructor called', canvas, imageData);
    this.canvas = canvas;
    this.imageData = imageData;
    this.params = {
      patternScale: params.patternScale || 2,
      refraction: params.refraction || 0.015,
      edge: params.edge || 1,
      patternBlur: params.patternBlur || 0.005,
      liquid: params.liquid || 0.07,
      speed: params.speed || 0.3
    };
    
    this.gl = null;
    this.uniforms = {};
    this.totalAnimationTime = 0;
    this.lastRenderTime = 0;
    this.animationFrame = null;
    
    this.init();
  }
  
  init() {
    console.log('MetallicPaint init called');
    this.gl = this.canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false
    });
    
    if (!this.gl) {
      console.error('WebGL2 not supported');
      return;
    }
    
    console.log('WebGL2 context created');
    this.initShader();
    this.resizeCanvas();
    this.startAnimation();
  }
  
  createShader(sourceCode, type) {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, sourceCode);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  initShader() {
    const vertexShaderSource = `#version 300 es
precision mediump float;

in vec2 a_position;
out vec2 vUv;

void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m*m;
    m = m*m;
    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130. * dot(m, g);
}

vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    float scale_factor = 1.;
    img_uv *= scale_factor;
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}
vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;
    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));
    return ch;
}
float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}
void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;
    float diagonal = uv.x - uv.y;
    float t = .001 * u_time;
    vec2 img_uv = get_img_uv();
    vec4 img = texture(u_image_texture, img_uv);
    vec3 color = vec3(0.);
    float opacity = 1.;
    vec3 color1 = vec3(.98, 0.98, 1.);
    vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));
    float edge = img.r;
    vec2 grad_uv = uv;
    grad_uv -= .5;
    float dist = length(grad_uv + vec2(0., .2 * diagonal));
    grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);
    float bulge = pow(1.8 * dist, 1.2);
    bulge = 1. - bulge;
    bulge *= pow(uv.y, .3);
    float cycle_width = u_patternScale;
    float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
    float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
    float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);
    float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
    float thin_strip_2_width = cycle_width * thin_strip_2_ratio;
    opacity = 1. - smoothstep(.9 - .5 * u_edge, 1. - .5 * u_edge, edge);
    opacity *= get_img_frame_alpha(img_uv, 0.01);
    float noise = snoise(uv - t);
    edge += (1. - edge) * u_liquid * noise;
    float refr = 0.;
    refr += (1. - bulge);
    refr = clamp(refr, 0., 1.);
    float dir = grad_uv.x;
    dir += diagonal;
    dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));
    bulge *= clamp(pow(uv.y, .1), .3, 1.);
    dir *= (.1 + (1.1 - edge) * bulge);
    dir *= smoothstep(1., .7, edge);
    dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
    dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));
    dir *= (.5 + .5 * pow(uv.y, 2.));
    dir *= cycle_width;
    dir -= t;
    float refr_r = refr;
    refr_r += .03 * bulge * noise;
    float refr_b = 1.3 * refr;
    refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
    refr_r -= diagonal;
    refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
    refr_b -= .2 * edge;
    refr_r *= u_refraction;
    refr_b *= u_refraction;
    vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
    w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
    float stripe_r = mod(dir + refr_r, 1.);
    float r = get_color_channel(color1.r, color2.r, stripe_r, w, 0.02 + .03 * u_refraction * bulge, bulge);
    float stripe_g = mod(dir, 1.);
    float g = get_color_channel(color1.g, color2.g, stripe_g, w, 0.01 / (1. - diagonal), bulge);
    float stripe_b = mod(dir - refr_b, 1.);
    float b = get_color_channel(color1.b, color2.b, stripe_b, w, .01, bulge);
    color = vec3(r, g, b);
    color *= opacity;
    fragColor = vec4(color, opacity);
}`;

    const vertexShader = this.createShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.createShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    
    const program = this.gl.createProgram();
    if (!program || !vertexShader || !fragmentShader) return;
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      return;
    }
    
    // Get uniforms
    const uniformCount = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = this.gl.getActiveUniform(program, i);
      if (!uniformInfo) continue;
      this.uniforms[uniformInfo.name] = this.gl.getUniformLocation(program, uniformInfo.name);
    }
    
    // Create vertices
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    this.gl.useProgram(program);
    
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    // Set up texture
    this.setupTexture();
    this.updateUniforms();
  }
  
  setupTexture() {
    const imageTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, imageTexture);
    
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.imageData.width,
      this.imageData.height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.imageData.data
    );
    
    this.gl.uniform1i(this.uniforms.u_image_texture, 0);
  }
  
  updateUniforms() {
    if (!this.gl || !this.uniforms) return;
    
    this.gl.uniform1f(this.uniforms.u_edge, this.params.edge);
    this.gl.uniform1f(this.uniforms.u_patternBlur, this.params.patternBlur);
    this.gl.uniform1f(this.uniforms.u_time, 0);
    this.gl.uniform1f(this.uniforms.u_patternScale, this.params.patternScale);
    this.gl.uniform1f(this.uniforms.u_refraction, this.params.refraction);
    this.gl.uniform1f(this.uniforms.u_liquid, this.params.liquid);
  }
  
  resizeCanvas() {
    if (!this.imageData) return;
    
    const imgRatio = this.imageData.width / this.imageData.height;
    this.gl.uniform1f(this.uniforms.u_img_ratio, imgRatio);
    
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uniforms.u_ratio, this.canvas.width / this.canvas.height);
  }
  
  startAnimation() {
    const render = (currentTime) => {
      const deltaTime = currentTime - this.lastRenderTime;
      this.lastRenderTime = currentTime;
      
      this.totalAnimationTime += deltaTime * this.params.speed;
      this.gl.uniform1f(this.uniforms.u_time, this.totalAnimationTime);
      
      // Enable blending for transparency
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      
      this.animationFrame = requestAnimationFrame(render);
    };
    
    this.lastRenderTime = performance.now();
    this.animationFrame = requestAnimationFrame(render);
  }
  
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

// Text to ImageData converter
function parseTextToImageData(text, options = {}) {
  const fontSize = options.fontSize || 100;
  const fontFamily = options.fontFamily || 'Arial, sans-serif';
  const fontWeight = options.fontWeight || '600';
  const padding = options.padding || 20;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set font to measure text
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  const width = Math.ceil(metrics.width) + padding * 2;
  const height = fontSize + padding * 2;
  
  canvas.width = width;
  canvas.height = height;
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Draw black text
  ctx.fillStyle = 'black';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height / 2);
  
  return ctx.getImageData(0, 0, width, height);
}

if (typeof window !== 'undefined') {
  window.MetallicPaint = MetallicPaint;
  window.parseTextToImageData = parseTextToImageData;
}
