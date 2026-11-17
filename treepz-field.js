// Lightweight 2D canvas motion backgrounds: drifting data particles, or a schematic route network.
export function mountField(canvas, { mode = 'particles', nodes = [], edges = [] } = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = Math.min(devicePixelRatio, 1.5), raf = 0, visible = false, drawT = 0;
  const pts = Array.from({ length: mode === 'particles' ? 110 : 40 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02, y2: Math.random() < 0.12 }));
  const fit = () => { const r = canvas.getBoundingClientRect(); w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 }); io.observe(canvas);
  let last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (!visible) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, w, h);
    pts.forEach((p) => { p.x = (p.x + p.vx * dt + 1) % 1; p.y = (p.y + p.vy * dt + 1) % 1; });
    const link = mode === 'particles' ? 130 : 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], ax = a.x * w, ay = a.y * h;
      for (let j = i + 1; j < pts.length && link; j++) {
        const b = pts[j], dx = ax - b.x * w, dy = ay - b.y * h, d = Math.hypot(dx, dy);
        if (d < link) { ctx.strokeStyle = `rgba(191,217,255,${(1 - d / link) * 0.16})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(b.x * w, b.y * h); ctx.stroke(); }
      }
      ctx.fillStyle = a.y2 ? 'rgba(255,192,68,.9)' : 'rgba(191,217,255,.45)';
      ctx.beginPath(); ctx.arc(ax, ay, a.y2 ? 1.8 : 1.1, 0, Math.PI * 2); ctx.fill();
    }
    if (mode === 'network') {
      drawT = Math.min(1, drawT + dt * 0.35);
      const t = now / 1000;
      edges.forEach((e, k) => {
        const A = nodes[e[0]], B = nodes[e[1]], live = e[2] === 'live';
        const prog = Math.min(1, Math.max(0, drawT * 1.6 - k * 0.12));
        if (prog <= 0) return;
        const x1 = A.x * w, y1 = A.y * h, x2 = x1 + (B.x * w - x1) * prog, y2 = y1 + (B.y * h - y1) * prog;
        ctx.setLineDash(live ? [] : [4, 7]); ctx.lineDashOffset = live ? 0 : -t * 12;
        ctx.strokeStyle = live ? 'rgba(255,192,68,1)' : 'rgba(191,217,255,.35)'; ctx.lineWidth = live ? 3 : 1.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        if (prog >= 1) {
          for (let q = 0; q < (live ? 3 : 1); q++) {
            const u = ((t * (live ? 0.35 : 0.12)) + q / 3 + k * 0.17) % 1;
            ctx.fillStyle = live ? '#FFC044' : 'rgba(191,217,255,.8)';
            ctx.beginPath(); ctx.arc(x1 + (B.x * w - x1) * u, y1 + (B.y * h - y1) * u, live ? 3.5 : 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      });
      nodes.forEach((n) => {
        const x = n.x * w, y = n.y * h, live = n.live;
        if (live) { const r = 10 + ((t * 14) % 22); ctx.strokeStyle = `rgba(255,192,68,${1 - (r - 10) / 22})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = live ? '#FFC044' : '#0A0A0A'; ctx.strokeStyle = live ? '#FFC044' : 'rgba(191,217,255,.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, live ? 6 : 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }
  };
  raf = requestAnimationFrame(loop);
  return { dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); } };
}
