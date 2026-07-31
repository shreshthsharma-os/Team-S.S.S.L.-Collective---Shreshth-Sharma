/**
 * bg.js — Hackify flowery background animation.
 *
 * Soft floating flower petals and botanical leaves drift across the canvas.
 * Pastel palette with low opacity so UI content stays readable.
 */

(function () {
  'use strict';

  const CFG = {
    petalCount: 35,
    leafCount: 15,
    speed: 0.3,
    rotationSpeed: 0.008,
    swayAmplitude: 0.4,
    swayFrequency: 0.015,
    petalColors: [
      'rgba(255, 182, 193, ALPHA)',  // light pink
      'rgba(255, 218, 233, ALPHA)',  // soft pink
      'rgba(216, 191, 255, ALPHA)',  // lavender
      'rgba(255, 255, 255, ALPHA)',  // white
      'rgba(255, 200, 200, ALPHA)',  // blush
      'rgba(230, 210, 255, ALPHA)',  // soft purple
    ],
    leafColors: [
      'rgba(144, 238, 144, ALPHA)',  // light green
      'rgba(180, 230, 180, ALPHA)',  // soft green
      'rgba(160, 215, 160, ALPHA)',  // mint
    ],
    minAlpha: 0.08,
    maxAlpha: 0.25,
    minSize: 8,
    maxSize: 22,
  };

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  let petals = [];
  let leaves = [];
  let raf;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  // Draw a petal shape
  function drawPetal(x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.4, -size * 0.6, size * 0.8, -size * 0.3, size, 0);
    ctx.bezierCurveTo(size * 0.8, size * 0.3, size * 0.4, size * 0.6, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // Draw a leaf shape
  function drawLeaf(x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.3, -size * 0.8, size * 0.7, -size * 0.8, size, 0);
    ctx.bezierCurveTo(size * 0.7, size * 0.3, size * 0.3, size * 0.3, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    // Leaf vein
    ctx.beginPath();
    ctx.moveTo(size * 0.1, 0);
    ctx.lineTo(size * 0.85, 0);
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.6).toFixed(3) + ')');
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  function makeItem(type) {
    const colors = type === 'petal' ? CFG.petalColors : CFG.leafColors;
    const colorTemplate = colors[Math.floor(Math.random() * colors.length)];
    const alpha = CFG.minAlpha + Math.random() * (CFG.maxAlpha - CFG.minAlpha);
    const size = CFG.minSize + Math.random() * (CFG.maxSize - CFG.minSize);
    return {
      x: Math.random() * W,
      y: Math.random() * H - H * 0.1,
      size: size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * CFG.rotationSpeed * 2,
      vy: CFG.speed * 0.4 + Math.random() * CFG.speed * 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      swayPhase: Math.random() * Math.PI * 2,
      color: colorTemplate.replace('ALPHA', alpha.toFixed(3)),
      type: type,
    };
  }

  function init() {
    petals = [];
    leaves = [];
    for (let i = 0; i < CFG.petalCount; i++) {
      const p = makeItem('petal');
      p.y = Math.random() * H;  // Scatter across screen initially
      petals.push(p);
    }
    for (let i = 0; i < CFG.leafCount; i++) {
      const l = makeItem('leaf');
      l.y = Math.random() * H;
      leaves.push(l);
    }
  }

  function updateItem(item) {
    item.swayPhase += CFG.swayFrequency;
    item.x += item.vx + Math.sin(item.swayPhase) * CFG.swayAmplitude;
    item.y += item.vy;
    item.rotation += item.rotSpeed;

    // Reset when off screen
    if (item.y > H + 30) {
      item.y = -30;
      item.x = Math.random() * W;
    }
    if (item.x < -30) item.x = W + 30;
    if (item.x > W + 30) item.x = -30;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw leaves first (behind petals)
    for (const leaf of leaves) {
      updateItem(leaf);
      drawLeaf(leaf.x, leaf.y, leaf.size * 1.3, leaf.rotation, leaf.color);
    }

    // Draw petals
    for (const petal of petals) {
      updateItem(petal);
      drawPetal(petal.x, petal.y, petal.size, petal.rotation, petal.color);
    }

    raf = requestAnimationFrame(draw);
  }

  function boot() {
    resize();
    init();
    raf = requestAnimationFrame(draw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
