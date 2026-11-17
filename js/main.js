const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll fade-ins — once, on first intersection. */
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const fadeEls = document.querySelectorAll('.js-fade');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  fadeEls.forEach((el) => observer.observe(el));
}

/* Hero 3D pearls — lazy-loaded, WebGL-gated, reduced-motion-gated. */
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

const isMobileViewport = window.matchMedia('(max-width: 560px)').matches;

if (!prefersReducedMotion && !isMobileViewport && supportsWebGL()) {
  const hero = document.getElementById('top');
  const canvas = document.getElementById('hero-canvas');

  const start = () => {
    import('./hero-scene.js')
      .then((mod) => mod.initHeroScene(canvas, hero))
      .then(() => hero.classList.add('has-webgl'))
      .catch(() => { /* keep CSS fallback pearls on any failure */ });
  };

  if (document.readyState === 'complete') {
    (window.requestIdleCallback || window.setTimeout)(start, { timeout: 1500 });
  } else {
    window.addEventListener('load', () => {
      (window.requestIdleCallback || window.setTimeout)(start, { timeout: 1500 });
    });
  }
}
