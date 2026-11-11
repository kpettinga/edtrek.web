/**
 * Scroll scene for the homepage: topo map parallax + navbar state.
 *
 *  --map-y            on <html>: map drifts up at MAP_SPEED × scroll
 *  --map-scale        on <html>: 1 → MAP_ZOOM across the hero, then holds
 *  (both static under reduced motion)
 *  --scroll-progress  on <html>: 0 → 1 across the whole page (nav trail line)
 *  #site-nav[data-state]  top | compact
 */
/** Map travel per px scrolled (vertical parallax). Tune here. */
const MAP_SPEED = 0.1;
/** Map zoom reached at the end of the hero. */
const MAP_ZOOM = 1.08;
const COMPACT_AFTER = 8; // px scrolled before the nav compresses

export function initScrollScene() {
  const root = document.documentElement;
  const nav = document.getElementById('site-nav');
  const hero = document.getElementById('hero');
  if (!nav) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;

    const still = reduceMotion.matches;
    // Hero progress 0 → 1 as it scrolls away; zoom stops once it's gone.
    const heroProgress = hero ? Math.min(1, Math.max(0, y / hero.offsetHeight)) : 1;
    root.style.setProperty('--map-y', still ? '0px' : `${(-y * MAP_SPEED).toFixed(1)}px`);
    root.style.setProperty('--map-scale', still ? '1' : (1 + (MAP_ZOOM - 1) * heroProgress).toFixed(4));
    root.style.setProperty('--scroll-progress', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');

    const state = y > COMPACT_AFTER ? 'compact' : 'top';
    if (nav!.dataset.state !== state) nav!.dataset.state = state;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reduceMotion.addEventListener('change', onScroll);
}
