(() => {
  const canvases = document.querySelectorAll('.ps-canvas');
  if (!canvases.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  canvases.forEach((canvas, index) => {
    const gradient = canvas.querySelector('.ps-gradient');
    const active = canvas.querySelector('.ps-track-active');
    if (gradient && active) {
      const id = `ps-gradient-${index + 1}`;
      gradient.id = id;
      active.style.stroke = `url(#${id})`;
    }
    if (!active) return;

    active.style.strokeDasharray = '1';
    if (reduceMotion) {
      active.style.strokeDashoffset = '0';
      return;
    }

    const update = () => {
      const rect = canvas.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (viewportHeight * 0.6 - rect.top) / rect.height));
      active.style.strokeDashoffset = String(1 - progress);
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  });
})();
