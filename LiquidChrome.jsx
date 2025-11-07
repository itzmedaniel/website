import React, { useEffect, useRef } from 'react';

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

export default function LiquidChrome({
  baseColor = [0.1, 0.1, 0.1], // [r,g,b] 0..1
  speed = 1,
  amplitude = 0.6, // 0..1 movement/intensity
  interactive = true
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const roRef = useRef(null);
  const stateRef = useRef({ t: 0, mouse: { x: 0, y: 0 }, size: { w: 0, h: 0 } });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
    roRef.current = ro;

    const onMove = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 2 - 1;
      const y = (e.clientY - rect.top) / rect.height * 2 - 1;
      stateRef.current.mouse.x = clamp(x, -1, 1);
      stateRef.current.mouse.y = clamp(y, -1, 1);
    };
    if (interactive) window.addEventListener('pointermove', onMove);

    const blobs = Array.from({ length: 16 }).map((_, i) => ({
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      freqX: 0.6 + Math.random() * 0.8,
      freqY: 0.6 + Math.random() * 0.8,
      baseR: 40 + Math.random() * 80,
      weight: 0.5 + Math.random()
    }));

    function fillBase() {
      const { w, h } = stateRef.current.size;
      const r = Math.round(clamp(baseColor[0], 0, 1) * 255);
      const g = Math.round(clamp(baseColor[1], 0, 1) * 255);
      const b = Math.round(clamp(baseColor[2], 0, 1) * 255);
      // Subtle vertical gradient to enhance depth
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgb(${r},${g},${b})`);
      grad.addColorStop(1, `rgb(${Math.max(0,r-10)},${Math.max(0,g-10)},${Math.max(0,b-10)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    function drawBlobs(t) {
      const { w, h } = stateRef.current.size;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const A = Math.min(w, h) * (0.25 + 0.35 * clamp(amplitude, 0, 1));
      const mouse = stateRef.current.mouse;
      const mx = interactive ? mouse.x * A * 0.3 : 0;
      const my = interactive ? mouse.y * A * 0.3 : 0;

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const x = cx + Math.sin(b.phaseX + t * b.freqX * speed + i * 0.3) * A + mx;
        const y = cy + Math.cos(b.phaseY + t * b.freqY * speed + i * 0.2) * A * 0.6 + my;
        const radius = b.baseR * (0.8 + 0.6 * Math.sin(t * 0.9 + i));

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0.0, 'rgba(255,255,255,0.65)');
        grad.addColorStop(0.35, 'rgba(220,220,220,0.35)');
        grad.addColorStop(0.75, 'rgba(120,120,120,0.10)');
        grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawSpecular(t) {
      const { w, h } = stateRef.current.size;
      const highlight = ctx.createLinearGradient(0, 0, w, h);
      const power = 0.18;
      highlight.addColorStop(0.0, `rgba(255,255,255,${power})`);
      highlight.addColorStop(0.25, 'rgba(255,255,255,0.0)');
      highlight.addColorStop(0.75, 'rgba(255,255,255,0.0)');
      highlight.addColorStop(1.0, `rgba(255,255,255,${power * 0.6})`);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = highlight;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawVignette() {
      const { w, h } = stateRef.current.size;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.4, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    function frame(tms) {
      const t = (tms || 0) * 0.001;
      stateRef.current.t = t;
      const { w, h } = stateRef.current.size;
      ctx.clearRect(0, 0, w, h);
      fillBase();
      drawBlobs(t);
      drawSpecular(t);
      drawVignette();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (roRef.current) roRef.current.disconnect();
      if (interactive) window.removeEventListener('pointermove', onMove);
    };
  }, [baseColor[0], baseColor[1], baseColor[2], speed, amplitude, interactive]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
