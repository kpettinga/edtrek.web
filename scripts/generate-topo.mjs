#!/usr/bin/env node
/**
 * Procedural topo map → static SVG for the page-wide TopoMap.
 *
 *   npm run topo                 # writes src/assets/textures/topo.svg (default seed)
 *   node scripts/generate-topo.mjs --seed 42 [--out path] [--levels 30] …
 *
 * Also importable: `generateTopo({ seed })` returns the SVG string (used by
 * the dev-only /topo page to preview seeds).
 *
 * Look (matches the Figma topo texture): contour lines at one thin weight that
 * bunch on steep slopes, a couple of thicker meandering trails that cross them,
 * and a light scatter of small square points in loose clusters. White on
 * transparent — TopoMap draws it with mix-blend-mode: difference.
 *
 * - Terrain: domain-warped fractal simplex noise, sampled on a cylinder so the
 *   tile wraps top ↔ bottom and stacks seamlessly.
 * - Contour levels blend even height steps with height quantiles, which evens
 *   out line density while keeping some steep/flat variation.
 * - Contours: d3-contour (marching squares) on a padded grid; the padding
 *   pushes d3's edge closures outside the viewBox, which clips them.
 * - Strokes use vector-effect: non-scaling-stroke, so lines keep the same
 *   pixel weight at whatever width the tile is displayed.
 * - Seeded: the same seed and options always give the same map.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contours } from 'd3-contour';
import { createNoise3D } from 'simplex-noise';

export const DEFAULTS = {
    seed: 42,
    levels: 30, // contour levels across the height range
    even: 0.8, // 1 = even height steps, 0 = equal-area (quantile) levels
    warp: 200, // px of domain warp (bends the hills)
    scale: 900, // px, size of the main hills
    gain: 0.4, // fine-detail strength
    minLength: 70, // drop contour loops shorter than this (px)
    lineWidth: 1, // px
    trails: 2, // thick trail levels
    trailWidth: 2.6, // px
    clusters: 26, // square-point clusters
    pointSize: 7, // px
};

const W = 2130; // tile size in px at 1:1 (3:2)
const H = 1420;
const STEP = 5; // grid cell, px
const PAD = 6; // grid cells beyond the tile on every side

function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Douglas–Peucker. Handles closed rings (first point === last point). */
function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const [ax, ay] = pts[a];
        const [bx, by] = pts[b];
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        let far = -1;
        let dmax = eps;
        for (let k = a + 1; k < b; k++) {
            // distance to the chord; to the point itself when the chord is a ring's seam
            const d = len
                ? Math.abs(dy * pts[k][0] - dx * pts[k][1] + bx * ay - by * ax) / len
                : Math.hypot(pts[k][0] - ax, pts[k][1] - ay);
            if (d > dmax) {
                dmax = d;
                far = k;
            }
        }
        if (far > 0) {
            keep[far] = 1;
            stack.push([a, far], [far, b]);
        }
    }
    return pts.filter((_, k) => keep[k]);
}

const r1 = (n) => Math.round(n * 10) / 10;

/** px polylines → compact path data (absolute moveto, relative linetos). */
function toPath(runs, eps, minLength) {
    let d = '';
    for (const raw of runs) {
        const pts = simplify(raw, eps);
        if (pts.length < 2) continue;
        let length = 0;
        for (let k = 1; k < pts.length; k++) length += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        if (length < minLength) continue;
        let px = r1(pts[0][0]);
        let py = r1(pts[0][1]);
        d += `M${px} ${py}`;
        let first = true;
        for (let k = 1; k < pts.length; k++) {
            const x = r1(pts[k][0]);
            const y = r1(pts[k][1]);
            const dx = r1(x - px);
            const dy = r1(y - py);
            if (!dx && !dy) continue;
            const sep = first ? 'l' : dx < 0 ? '' : ' '; // a leading minus doubles as a separator
            d += `${sep}${dx}${dy < 0 ? '' : ' '}${dy}`;
            first = false;
            px = x;
            py = y;
        }
        if (raw.closed) d += 'z';
    }
    return d;
}

export function generateTopo(options = {}) {
    const o = { ...DEFAULTS, ...options };
    const rand = mulberry32(o.seed);
    const noise = createNoise3D(mulberry32(o.seed * 7919 + 13));

    // Noise at (x, y) px, periodic in y with period H (sampled on a cylinder).
    const R = H / (2 * Math.PI);
    const cyl = (x, y, freq, off) => {
        const t = (2 * Math.PI * y) / H;
        return noise(x * freq + off, R * freq * Math.cos(t) + off * 0.37, R * freq * Math.sin(t) - off * 0.61);
    };
    const fbm = (x, y, freq, octaves, off, gain = 0.5) => {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        for (let k = 0; k < octaves; k++) {
            sum += amp * cyl(x, y, freq, off + k * 17.3);
            norm += amp;
            amp *= gain;
            freq *= 2.03;
        }
        return sum / norm;
    };
    const height = (x, y) => {
        const wx = o.warp * fbm(x, y, 1 / 900, 3, 101);
        const wy = o.warp * fbm(x, y, 1 / 900, 3, 202);
        return fbm(x + wx, y + wy, 1 / o.scale, 6, 303, o.gain);
    };
    const trailField = (x, y) => fbm(x + 140 * fbm(x, y, 1 / 700, 2, 505), y, 1 / 2200, 2, 606);

    // Sample a field on the padded grid.
    const nx = Math.round(W / STEP) + 2 * PAD;
    const ny = Math.round(H / STEP) + 2 * PAD;
    const at = (i) => (i - PAD) * STEP;
    const sample = (fn) => {
        const v = new Float64Array(nx * ny);
        let min = Infinity;
        let max = -Infinity;
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const h = fn(at(i), at(j));
                v[j * nx + i] = h;
                if (h < min) min = h;
                if (h > max) max = h;
            }
        }
        return { v, min, max };
    };

    // Contour rings (grid coords) → px runs, keeping only what's near the tile.
    const near = ([x, y]) => x >= -2 * STEP && x <= W + 2 * STEP && y >= -2 * STEP && y <= H + 2 * STEP;
    const traceRuns = (field, thresholds) => {
        const runs = [];
        for (const c of contours().size([nx, ny]).smooth(true).thresholds(thresholds)(field.v)) {
            for (const poly of c.coordinates) {
                for (const ring of poly) {
                    const pts = ring.map(([x, y]) => [(x - PAD - 0.5) * STEP, (y - PAD - 0.5) * STEP]);
                    const split = [];
                    let run = [];
                    for (const p of pts) {
                        if (near(p)) run.push(p);
                        else if (run.length) {
                            split.push(run);
                            run = [];
                        }
                    }
                    if (run.length) split.push(run);
                    if (split.length === 1 && split[0].length === pts.length) split[0].closed = true;
                    runs.push(...split);
                }
            }
        }
        return runs;
    };

    // Contours
    const terrain = sample(height);
    const sorted = Float64Array.from(terrain.v).sort();
    const levels = Array.from({ length: o.levels }, (_, k) => {
        const t = (k + 1) / (o.levels + 1);
        const q = sorted[Math.floor(t * (sorted.length - 1))];
        return o.even * (terrain.min + t * (terrain.max - terrain.min)) + (1 - o.even) * q;
    });
    const contourD = toPath(traceRuns(terrain, levels), 0.45, o.minLength);

    // Trails: level sets of a broad, separate field, so they cross the contours
    const trail = sample(trailField);
    const tLevels = Array.from(
        { length: o.trails },
        (_, k) => trail.min + ((trail.max - trail.min) * (k + 1)) / (o.trails + 1),
    );
    const trailD = toPath(traceRuns(trail, tLevels), 0.8, 200);

    // Square points: loose clusters, kept clear of the top/bottom seam
    let pointsD = '';
    const s = o.pointSize;
    for (let c = 0; c < o.clusters; c++) {
        const cx = 30 + rand() * (W - 60);
        const cy = 60 + rand() * (H - 120);
        const n = 1 + Math.floor(rand() * rand() * 5); // mostly 1–2, sometimes 4–5
        for (let k = 0; k < n; k++) {
            const x = Math.round(cx + (rand() - 0.5) * 70);
            const y = Math.round(cy + (rand() - 0.5) * 40);
            pointsD += `M${x} ${y}h${s}v${s}h-${s}z`;
        }
    }

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
        `<!-- generated by scripts/generate-topo.mjs, seed ${o.seed} -->` +
        `<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">` +
        `<path stroke-width="${o.lineWidth}" vector-effect="non-scaling-stroke" d="${contourD}"/>` +
        `<path stroke-width="${o.trailWidth}" vector-effect="non-scaling-stroke" d="${trailD}"/>` +
        `</g><path fill="#fff" d="${pointsD}"/></svg>\n`
    );
}

// ---- CLI -----------------------------------------------------------------
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const args = {};
    for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
    const out = args.out ?? 'src/assets/textures/topo.svg';
    delete args.out;
    const opts = Object.fromEntries(Object.entries(args).map(([k, v]) => [k, Number(v)]));
    const svg = generateTopo(opts);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, svg);
    console.log(`seed ${opts.seed ?? DEFAULTS.seed} → ${out} (${(svg.length / 1024).toFixed(0)} KB)`);
}
