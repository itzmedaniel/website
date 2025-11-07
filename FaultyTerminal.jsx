import React, { useEffect, useRef } from 'react';

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

export default function FaultyTerminal({
  scale = 1,
  gridMul = [1, 1],
  digitSize = 1,
  timeScale = 1,
  pause = false,
  scanlineIntensity = 0.5,
  glitchAmount = 0.3,
  flickerAmount = 0.2,
  noiseAmp = 0.15,
  chromaticAberration = 0.1,
  dither = 0.1,
  curvature = 0.1,
  tint = '#00ff88',
  mouseReact = true,
  mouseStrength = 0.25,
  pageLoadAnimation = true,
  brightness = 1
}) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    t: 0,
    flicker: 1,
    mouse: { x: 0, y: 0 },
    size: { w: 0, h: 0 },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      stateRef.current.size = { w: canvas.width, h: canvas.height };
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = (e.clientY - rect.top) / rect.height * 2 - 1;
      stateRef.current.mouse.x = clamp(x, -1, 1);
      stateRef.current.mouse.y = clamp(y, -1, 1);
    };

    if (mouseReact) window.addEventListener('pointermove', onMouseMove);

    let loadAnim = pageLoadAnimation ? 0 : 1;

    function hexToRGB(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
      const num = parseInt(c, 16);
      return {
        r: ((num >> 16) & 255),
        g: ((num >> 8) & 255),
        b: (num & 255)
      };
    }

    const tintRGB = hexToRGB(tint);

    function quantizeChannel(v, steps) {
      return Math.round(v / 255 * steps) / steps * 255;
    }

    function drawScanlines(alpha) {
      const { w, h } = stateRef.current.size;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      for (let y = 0; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1);
      }
      ctx.restore();
    }

    function drawVignette(strength) {
      const { w, h } = stateRef.current.size;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * (0.45 - strength * 0.2), w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${clamp(0.25 + strength * 0.5, 0, 0.9)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function drawNoise(intensity) {
      if (intensity <= 0) return;
      const { w, h } = stateRef.current.size;
      const count = Math.floor((w * h) / (8000 / (intensity + 0.0001)));
      ctx.save();
      ctx.globalAlpha = clamp(0.08 + intensity * 0.25, 0, 0.4);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const sz = 1 + Math.floor(Math.random() * 2);
        const v = Math.floor(Math.random() * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.restore();
    }

    function drawDigits(time) {
      const { w, h } = stateRef.current.size;
      const baseCols = Math.max(8, Math.floor((w / 20) * scale * gridMul[0]));
      const baseRows = Math.max(4, Math.floor((h / 32) * scale * gridMul[1]));

      const cellW = w / baseCols;
      const cellH = h / baseRows;

      const fontSize = Math.floor(Math.min(cellW, cellH) * 0.8 * digitSize);
      const r = clamp(tintRGB.r * brightness, 0, 255);
      const g = clamp(tintRGB.g * brightness, 0, 255);
      const b = clamp(tintRGB.b * brightness, 0, 255);

      const steps = Math.max(2, Math.floor(8 * (1 + dither * 2)));
      const qr = quantizeChannel(r, steps);
      const qg = quantizeChannel(g, steps);
      const qb = quantizeChannel(b, steps);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;

      // Flicker
      const flicker = 1 - (Math.random() * flickerAmount);
      const alphaBase = clamp(0.8 * flicker, 0.2, 1);

      // Optional chromatic aberration draws
      const channels = [
        { dx: 0, dy: 0, fill: `rgba(${qr},${qg},${qb},${alphaBase})` },
        { dx: chromaticAberration * 2, dy: 0, fill: `rgba(${qr},0,0,${alphaBase * 0.7})` },
        { dx: -chromaticAberration * 2, dy: 0, fill: `rgba(0,0,${qb},${alphaBase * 0.7})` }
      ];

      const mouse = stateRef.current.mouse;
      const mouseOffsetX = mouseReact ? mouse.x * mouseStrength * cellW : 0;
      const mouseOffsetY = mouseReact ? mouse.y * mouseStrength * cellH : 0;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(0, 0, w, h);

      // Glitch bands parameters
      const glitchBands = Math.floor(glitchAmount * 6);

      for (let rI = 0; rI < baseRows; rI++) {
        for (let cI = 0; cI < baseCols; cI++) {
          const cx = cI * cellW + cellW / 2 + mouseOffsetX;
          const cy = rI * cellH + cellH / 2 + mouseOffsetY;

          const seed = (rI * 73856093) ^ (cI * 19349663);
          const phase = ((seed % 1000) / 1000) + time * 0.3 * timeScale;
          const digit = Math.floor(Math.abs(Math.sin(phase) * 9.999)) % 10;

          channels.forEach(ch => {
            ctx.fillStyle = ch.fill;
            ctx.fillText(String(digit), cx + ch.dx, cy + ch.dy);
          });
        }
      }

      // Glitch overlay bands
      if (glitchBands > 0) {
        for (let i = 0; i < glitchBands; i++) {
          const gy = Math.random() * h;
          const gh = Math.max(2, Math.random() * (h * 0.05));
          const offset = (Math.random() - 0.5) * (w * 0.1 * glitchAmount);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5;
          ctx.drawImage(canvas, 0, gy, w, gh, offset, gy, w, gh);
          ctx.restore();
        }
      }
    }

    function frame(tms) {
      if (pause) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }
      const t = (tms || 0) * 0.001;
      stateRef.current.t = t;

      const { w, h } = stateRef.current.size;
      ctx.clearRect(0, 0, w, h);

      if (loadAnim < 1) loadAnim = clamp(loadAnim + 0.03, 0, 1);

      drawDigits(t);
      drawScanlines(clamp(scanlineIntensity * 0.6, 0, 1));
      drawNoise(noiseAmp);
      drawVignette(curvature);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (mouseReact) window.removeEventListener('pointermove', onMouseMove);
    };
  }, [scale, gridMul[0], gridMul[1], digitSize, timeScale, pause, scanlineIntensity, glitchAmount, flickerAmount, noiseAmp, chromaticAberration, dither, curvature, tint, mouseReact, mouseStrength, pageLoadAnimation, brightness]);

  return (
    <div ref={overlayRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: `${clamp(curvature * 16, 0, 16)}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
