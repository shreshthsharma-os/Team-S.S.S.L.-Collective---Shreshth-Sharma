/**
 * bg.js — Hackify background particle constellation animation.
 *
 * Floating nodes connected by dynamic lines, softly reactive to mouse movement.
 * Colors are pulled from the Hackify design system: green (#008060) + ink tones.
 * Keeps well behind the UI with low opacity so content stays readable.
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const CFG = {
    particleCount:  90,       // number of nodes
    maxDist:        140,      // max px distance to draw a connecting line
    speed:          0.35,     // base drift speed
    mouseRadius:    160,      // px radius of mouse influence
    mouseForce:     0.018,    // how strongly particles drift toward cursor
    dotMinR:        1.4,      // min node radius
    dotMaxR:        3.2,      // max node radius
    // Brand colors — very low opacity so the white UI reads clearly
    colors: [
      'rgba(0, 128, 96,  IDX)',   // Hackify green
      'rgba(0,  94, 70,  IDX)',   // green dark
      'rgba(26,  26, 26, IDX)',   // ink
      'rgba(109,113,117, IDX)',   // ink-3
    ],
    dotOpacityMin:  0.18,
    dotOpacityMax:  0.50,
    lineOpacityMax: 0.12,     // max line alpha (fades with distance)
    pulseSpeed:     0.008,    // how fast nodes pulse in size
  };

  // ── Canvas setup ─────────────────────────────────────────────────────────
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let mouse = { x: -9999, y: -9999 };
  let particles = [];
  let raf;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -9999; mouse.y = -9999;
  });

  // ── Particle factory ─────────────────────────────────────────────────────
  function makeParticle() {
    const colorTemplate = CFG.colors[Math.floor(Math.random() * CFG.colors.length)];
    const opacity = CFG.dotOpacityMin + Math.random() * (CFG.dotOpacityMax - CFG.dotOpacityMin);
    return {
      x:      Math.random() * W,
      y:      Math.random() * H,
      vx:     (Math.random() - 0.5) * CFG.speed * 2,
      vy:     (Math.random() - 0.5) * CFG.speed * 2,
      r:      CFG.dotMinR + Math.random() * (CFG.dotMaxR - CFG.dotMinR),
      rBase:  0,   // set after
      phase:  Math.random() * Math.PI * 2,
      color:  colorTemplate.replace('IDX', opacity.toFixed(2)),
    };
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < CFG.particleCount; i++) {
      const p = makeParticle();
      p.rBase = p.r;
      particles.push(p);
    }
  }

  // ── Draw frame ───────────────────────────────────────────────────────────
  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    const len = particles.length;

    // Update positions
    for (let i = 0; i < len; i++) {
      const p = particles[i];

      // Gentle mouse attraction
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouseRadius && dist > 0) {
        const factor = (1 - dist / CFG.mouseRadius) * CFG.mouseForce;
        p.vx += dx * factor;
        p.vy += dy * factor;
      }

      // Damping so velocity doesn't blow up
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Clamp speed
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > CFG.speed * 3) {
        p.vx = (p.vx / spd) * CFG.speed * 3;
        p.vy = (p.vy / spd) * CFG.speed * 3;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10)     p.x = W + 10;
      if (p.x > W + 10)  p.x = -10;
      if (p.y < -10)     p.y = H + 10;
      if (p.y > H + 10)  p.y = -10;

      // Pulse size
      p.phase += CFG.pulseSpeed;
      p.r = p.rBase + Math.sin(p.phase) * 0.6;
    }

    // Draw connecting lines first (below dots)
    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.maxDist) {
          const alpha = CFG.lineOpacityMax * (1 - d / CFG.maxDist);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 128, 96, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    resize();
    initParticles();
    raf = requestAnimationFrame(draw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
