// Night-style orthographic globe with yellow great-circle routes between Treepz cities.
import * as d3 from 'https://esm.sh/d3-geo@3.1.1';
import { feature } from 'https://esm.sh/topojson-client@3.1.0';

export const CITIES = [
  { name: 'Lagos', c: [3.38, 6.52], hub: true },
  { name: 'Abuja', c: [7.49, 9.06] },
  { name: 'Accra', c: [-0.19, 5.6] },
  { name: 'Nairobi', c: [36.82, -1.29] },
  { name: 'Kampala', c: [32.58, 0.35] },
  { name: 'Toronto', c: [-79.38, 43.65], hub: true },
];
const ROUTES = [[0, 1], [0, 2], [0, 3], [0, 4], [3, 4], [0, 5], [2, 5], [1, 3]];

export async function mountGlobe(canvas) {
  const ctx = canvas.getContext('2d');
  const topo = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')).json();
  const land = feature(topo, topo.objects.land);
  const grat = d3.geoGraticule10();
  const proj = d3.geoOrthographic().clipAngle(90);
  const path = d3.geoPath(proj, ctx);
  const interps = ROUTES.map(([a, b]) => d3.geoInterpolate(CITIES[a].c, CITIES[b].c));
  let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 1.75), raf = 0, visible = false, t0 = performance.now();
  const fit = () => {
    const r = canvas.getBoundingClientRect(); w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.min(w * 0.5, h * 0.62);
    proj.scale(R).translate([w / 2, h * 0.58]);
  };
  fit();
  const ro = new ResizeObserver(fit); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.05 }); io.observe(canvas);

  const draw = (now) => {
    raf = requestAnimationFrame(draw);
    if (!visible) return;
    const t = (now - t0) / 1000;
    // drift between Toronto and East Africa, centred on the Atlantic/West Africa
    const lon = -18 + Math.sin(t * 0.12) * 34;
    proj.rotate([-lon, -18 - Math.sin(t * 0.09) * 6]);
    ctx.clearRect(0, 0, w, h);
    const [cx, cy] = proj.translate(), R = proj.scale();
    // atmosphere
    const g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.18);
    g.addColorStop(0, 'rgba(120,170,255,.28)'); g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill();
    // ocean
    const og = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
    og.addColorStop(0, '#0d1420'); og.addColorStop(1, '#04060a');
    ctx.fillStyle = og; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();
    ctx.beginPath(); path(grat); ctx.strokeStyle = 'rgba(191,217,255,.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); path(land); ctx.fillStyle = '#161c26'; ctx.fill(); ctx.strokeStyle = 'rgba(191,217,255,.22)'; ctx.lineWidth = 0.7; ctx.stroke();
    // routes
    ctx.lineCap = 'round';
    interps.forEach((ip, k) => {
      const pts = []; for (let i = 0; i <= 64; i++) pts.push(ip(i / 64));
      ctx.beginPath(); path({ type: 'LineString', coordinates: pts });
      ctx.strokeStyle = 'rgba(255,192,68,.35)'; ctx.lineWidth = 1.4; ctx.stroke();
      const u = ((t * 0.18) + k * 0.13) % 1, seg = [];
      for (let i = 0; i <= 12; i++) seg.push(ip(Math.min(1, u + i * 0.012)));
      ctx.beginPath(); path({ type: 'LineString', coordinates: seg });
      ctx.strokeStyle = '#FFC044'; ctx.lineWidth = 2.6; ctx.shadowColor = '#FFC044'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
    });
    // cities
    const vis = (c) => d3.geoDistance(c, [-proj.rotate()[0], -proj.rotate()[1]]) < Math.PI / 2 - 0.05;
    ctx.font = "600 13px 'General Sans', system-ui, sans-serif";
    CITIES.forEach((ct, i) => {
      if (!vis(ct.c)) return;
      const [x, y] = proj(ct.c), pr = 6 + ((t * 0.8 + i * 0.3) % 1) * 16;
      ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,192,68,${1 - (pr - 6) / 16})`; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, ct.hub ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fillStyle = '#FFC044'; ctx.shadowColor = '#FFC044'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.fillText(ct.name, x + 10, y - 8);
    });
  };
  raf = requestAnimationFrame(draw);
  return { dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); } };
}
