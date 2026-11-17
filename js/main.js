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
