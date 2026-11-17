/**
 * Topo reveal: a soft spotlight that follows the mouse and shows the page topo
 * map at full strength around the cursor (TopoMap.astro reads the values).
 *
 *  --mx, --my   spotlight centre (viewport px), eased toward the pointer
 *  --reveal-r   spotlight radius: grows a little with pointer speed, settles
 *               back when the pointer rests, closes when it leaves the window
 *
 * Mouse/pen only — touch and no-hover devices get the faint static map (CSS).
 * Values are written to the [data-topo-reveal] elements, not <html>, so a
 * pointer move doesn't restyle the whole document. The rAF loop only runs
 * while something is still easing. Reduced motion: no easing or speed swell.
 */

const RADIUS = 260; // px, resting spotlight radius
const SWELL = 120; // px, extra radius at speed
const FOLLOW = 0.16; // position easing per frame (0–1)
const GROW = 0.1; // radius easing per frame (0–1)
const REST_AFTER = 140; // ms without movement before the swell fades

export function initTopoReveal() {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const els = [...document.querySelectorAll<HTMLElement>('[data-topo-reveal]')];
    if (!els.length) return;

    let x = 0, y = 0, r = 0; // current
    let tx = 0, ty = 0, tr = 0; // target
    let seen = false;
    let lastMove = 0;
    let lastX = 0, lastY = 0;
    let raf = 0;

    const write = () => {
        for (const el of els) {
            el.style.setProperty('--mx', `${x.toFixed(1)}px`);
            el.style.setProperty('--my', `${y.toFixed(1)}px`);
            el.style.setProperty('--reveal-r', `${Math.max(0, r).toFixed(1)}px`);
        }
    };

    const frame = (now: number) => {
        raf = 0;
        const still = reduce.matches;
        if (tr > 0 && now - lastMove > REST_AFTER) tr = RADIUS;

        const k = still ? 1 : FOLLOW;
        x += (tx - x) * k;
        y += (ty - y) * k;
        r += (tr - r) * (still ? 1 : GROW);
        write();

        if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 || Math.abs(tr - r) > 0.3 || tr > RADIUS) {
            raf = requestAnimationFrame(frame);
        }
    };
    const kick = () => {
        if (!raf) raf = requestAnimationFrame(frame);
    };

    window.addEventListener(
        'pointermove',
        (e) => {
            if (!fine.matches || e.pointerType === 'touch') return;
            tx = e.clientX;
            ty = e.clientY;
            if (!seen) {
                // first contact: start at the pointer instead of sweeping in from 0,0
                seen = true;
                x = lastX = tx;
                y = lastY = ty;
            }
            const speed = Math.hypot(tx - lastX, ty - lastY); // px per event
            lastX = tx;
            lastY = ty;
            lastMove = performance.now();
            tr = reduce.matches ? RADIUS : RADIUS + Math.min(SWELL, speed * 3);
            kick();
        },
        { passive: true },
    );

    // Pointer left the window: close the spotlight.
    document.documentElement.addEventListener('pointerleave', () => {
        tr = 0;
        kick();
    });
}
