/**
 * Page trail (Figma motion study 52:727, dashed + Bedrock variant).
 *
 * Markup hooks:
 *   [data-trail-section]  a band the trail runs through (must be positioned)
 *   [data-waypoint]       an X inside it: a piece runs from the band's top edge
 *                         into it, and it's stamped when the trail head arrives
 *   [data-trail-stop]     like a waypoint, but it pulses instead of stamping
 *                         (the footer's Stop square)
 *   [data-trail-end]      the band's last content: a solid square sits below it
 *                         (40% of the section padding below), and a piece runs
 *                         from the square to the band's bottom edge.
 *                         [data-trail-end="n"]: no square, piece starts n px below
 *   Dashes stop CLEAR px short of every square and X, and start CLEAR px below
 *   each start square.
 *   [data-trail]          a piece already in the markup (sized by CSS)
 *
 * The trail head sits 60% down the viewport; each piece fills (--fill) as the
 * head passes over it, so the route draws in continuously as you scroll. Over
 * the last 40% of a viewport of scroll the head speeds up to reach the very
 * bottom, so the final pieces complete at the end of the page.
 *
 * Waypoints passed before the script runs (reload mid-page) are stamped
 * without animation. Reduced motion: the whole trail drawn, every X settled.
 */
type Piece = { el: HTMLElement; top: number; h: number; fill: number; size?: () => void };
type Mark = { el: HTMLElement; y: number };

const HEAD = 0.6;
const SQUARE = 12;
const CLEAR = 8; // breathing room between the dashes and every square / X
const X_INSET = 5.5; // the X's strokes start this far inside its 24px box (square caps)
const END_GAP = 0.4; // content → start square, as a fraction of the section padding

function docTop(el: HTMLElement) {
    let y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
}

export function initTrail() {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pieces: Piece[] = [];
    const marks: Mark[] = [];

    root.dataset.trailJs = '';

    for (const section of document.querySelectorAll<HTMLElement>('[data-trail-section]')) {
        const target = section.querySelector<HTMLElement>('[data-waypoint], [data-trail-stop]');
        if (target) {
            const el = piece(section);
            // stop CLEAR px short of the X's strokes / the square's top edge
            const into = (target.hasAttribute('data-waypoint') ? X_INSET : 0) - CLEAR;
            const p: Piece = { el, top: 0, h: 0, fill: -1 };
            p.size = () => {
                const sTop = docTop(section);
                p.top = sTop;
                p.h = Math.max(0, docTop(target) - sTop + into);
                el.style.top = '0px';
                el.style.height = `${p.h}px`;
            };
            pieces.push(p);
        }
        const end = section.querySelector<HTMLElement>('[data-trail-end]');
        if (end) {
            const el = piece(section);
            const square = !end.dataset.trailEnd;
            if (square) {
                const sq = document.createElement('span');
                sq.className = 'page-trail-square';
                el.append(sq);
            }
            const p: Piece = { el, top: 0, h: 0, fill: -1 };
            p.size = () => {
                const sTop = docTop(section);
                const pad = parseFloat(getComputedStyle(section).paddingBottom) || 0;
                const gap = square ? Math.round(pad * END_GAP) + SQUARE + CLEAR : Number(end.dataset.trailEnd);
                const from = docTop(end) + end.offsetHeight + gap - sTop;
                p.top = sTop + from;
                p.h = Math.max(0, section.offsetHeight - from);
                el.style.top = `${from}px`;
                el.style.height = `${p.h}px`;
            };
            pieces.push(p);
        }
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-trail]')) {
        const p: Piece = { el, top: 0, h: 0, fill: -1 };
        p.size = () => {
            p.top = docTop(el);
            p.h = el.offsetHeight;
        };
        pieces.push(p);
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-waypoint], [data-trail-stop]')) marks.push({ el, y: 0 });

    function piece(section: HTMLElement) {
        const el = document.createElement('span');
        el.className = 'page-trail';
        el.setAttribute('aria-hidden', 'true');
        section.append(el);
        return el;
    }

    function measure() {
        for (const p of pieces) p.size?.();
        for (const m of marks) m.y = docTop(m.el) + m.el.offsetHeight / 2;
    }

    function update(first = false) {
        const vh = window.innerHeight;
        const y = window.scrollY;
        const remaining = root.scrollHeight - vh - y;
        const head = reduce.matches ? Infinity : y + vh * HEAD + Math.max(0, vh * (1 - HEAD) - remaining);

        for (const p of pieces) {
            const f = p.h > 0 ? Math.min(1, Math.max(0, (head - p.top) / p.h)) : head >= p.top ? 1 : 0;
            const r = Math.round(f * 1000) / 1000;
            if (r !== p.fill) {
                p.fill = r;
                p.el.style.setProperty('--fill', String(r));
            }
        }
        for (const m of marks) {
            if (!m.el.dataset.stamped && head >= m.y) {
                m.el.dataset.stamped = first || reduce.matches ? 'instant' : 'play';
            }
        }
    }

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            update();
        });
    };

    measure();
    update(true);
    window.addEventListener('scroll', onScroll, { passive: true });
    reduce.addEventListener('change', () => update(true));
    // Re-measure when layout changes (fonts, images, drawers, resizes).
    new ResizeObserver(() => {
        measure();
        update();
    }).observe(document.body);
}
