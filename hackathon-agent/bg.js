/**
 * bg.js — Hackify blue blossom background animation.
 *
 * Soft floating flower petals, cherry blossoms, and botanical leaves
 * drift across the canvas with a blue-lavender-pink palette.
 */

(function () {
  'use strict';

  const CFG = {
    petalCount: 40,
    leafCount: 12,
    sparkleCount: 20,
    speed: 0.25,
    rotationSpeed: 0.006,
    swayAmplitude: 0.5,
    swayFrequency: 0.012,
    petalColors: [
      'rgba(182, 200, 255, ALPHA)',  // soft blue
      'rgba(200, 180, 255, ALPHA)',  // lavender
      'rgba(255, 200, 220, ALPHA)',  // blush pink
      'rgba(220, 230, 255, ALPHA)',  // ice blue
      'rgba(180, 160, 255, ALPHA)',  // periwinkle
      'rgba(255, 220, 240, ALPHA)',  // light rose
      'rgba(160, 200, 255, ALPHA)',  // sky blue
    ],
    leafColors: [
      'rgba(144, 200, 180, ALPHA)',  // sage green
      'rgba(160, 210, 190, ALPHA)',  // mint
      'rgba(130, 190, 220, ALPHA)',  // teal blue
    ],
    sparkleColor: 'rgba(200, 210, 255, ALPHA)',
    minAlpha: 0.06,
    maxAlpha: 0.20,
    minSize: 8,
    maxSize: 24,
  };

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  let petals = [];
  let leaves = [];
  let sparkles = [];
  let raf;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);

  // Draw a petal (teardrop / cherry blossom petal)
  function drawPetal(x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.5, -size * 0.7, size * 0.9, -size * 0.3, size, 0);
    ctx.bezierCurveTo(size * 0.9, size * 0.3, size * 0.5, size * 0.7, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // Draw a 5-petal flower (cherry blossom style)
  function drawFlower(x, y, size, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 / 5) * i);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.3, -size * 0.5, size * 0.7, -size * 0.4, size * 0.6, 0);
      ctx.bezierCurveTo(size * 0.7, size * 0.4, size * 0.3, size * 0.5, 0, 0);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(/[\d.]+\)$/, (m) => Math.min(parseFloat(m) * 2, 0.4).toFixed(3) + ')');
    ctx.fill();
    ctx.restore();
  }

  // Draw a leaf
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
    ctx.strokeStyle = color.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.5).toFixed(3) + ')');
    ctx.lineWidth = 0.4;
    ctx.stroke();
    ctx.restore();
  }

  // Draw a sparkle (tiny star)
  function drawSparkle(x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.strokeStyle = `rgba(200, 210, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  function makeItem(type) {
    const colors = type === 'petal' ? CFG.petalColors : CFG.leafColors;
    const colorTemplate = colors[Math.floor(Math.random() * colors.length)];
    const alpha = CFG.minAlpha + Math.random() * (CFG.maxAlpha - CFG.minAlpha);
    const size = CFG.minSize + Math.random() * (CFG.maxSize - CFG.minSize);
    const isFlower = type === 'petal' && Math.random() < 0.25;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * CFG.rotationSpeed * 2,
      vy: CFG.speed * 0.3 + Math.random() * CFG.speed * 0.7,
      vx: (Math.random() - 0.5) * 0.25,
      swayPhase: Math.random() * Math.PI * 2,
      color: colorTemplate.replace('ALPHA', alpha.toFixed(3)),
      type: type,
      isFlower: isFlower,
    };
  }

  function makeSparkle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: 2 + Math.random() * 4,
      alpha: 0,
      alphaTarget: 0.05 + Math.random() * 0.12,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.02,
    };
  }

  function init() {
    petals = [];
    leaves = [];
    sparkles = [];
    for (let i = 0; i < CFG.petalCount; i++) {
      const p = makeItem('petal');
      p.y = Math.random() * H;
      petals.push(p);
    }
    for (let i = 0; i < CFG.leafCount; i++) {
      const l = makeItem('leaf');
      l.y = Math.random() * H;
      leaves.push(l);
    }
    for (let i = 0; i < CFG.sparkleCount; i++) {
      sparkles.push(makeSparkle());
    }
  }

  function updateItem(item) {
    item.swayPhase += CFG.swayFrequency;
    item.x += item.vx + Math.sin(item.swayPhase) * CFG.swayAmplitude;
    item.y += item.vy;
    item.rotation += item.rotSpeed;
    if (item.y > H + 30) { item.y = -30; item.x = Math.random() * W; }
    if (item.x < -30) item.x = W + 30;
    if (item.x > W + 30) item.x = -30;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sparkles
    for (const s of sparkles) {
      s.phase += s.speed;
      s.alpha = s.alphaTarget * (0.5 + 0.5 * Math.sin(s.phase));
      drawSparkle(s.x, s.y, s.size, s.alpha);
    }

    // Leaves (behind petals)
    for (const leaf of leaves) {
      updateItem(leaf);
      drawLeaf(leaf.x, leaf.y, leaf.size * 1.3, leaf.rotation, leaf.color);
    }

    // Petals & flowers
    for (const petal of petals) {
      updateItem(petal);
      if (petal.isFlower) {
        drawFlower(petal.x, petal.y, petal.size * 0.6, petal.rotation, petal.color);
      } else {
        drawPetal(petal.x, petal.y, petal.size, petal.rotation, petal.color);
      }
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
