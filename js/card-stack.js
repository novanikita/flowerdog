(function () {
  const stack = document.querySelector('.card-stack');
  if (!stack) return;

  const links = stack.querySelectorAll('.card-stack__link');
  const baseZ = 1;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  function lowerAll() {
    links.forEach(function (link, index) {
      link.style.zIndex = baseZ + index;
      link.classList.remove('is-raised');
    });
  }

  function raise(link) {
    links.forEach(function (l) {
      l.style.zIndex = baseZ;
      l.classList.remove('is-raised');
    });
    link.style.zIndex = baseZ + links.length;
    link.classList.add('is-raised');
  }

  links.forEach(function (link, index) {
    link.style.zIndex = baseZ + index;
  });

  function initMobileScrollBehavior() {
    let rafId = null;

    function raiseClosestToCenter() {
      const stackRect = stack.getBoundingClientRect();
      const centerX = stackRect.left + stackRect.width / 2;
      let closest = null;
      let minDist = Infinity;

      links.forEach(function (link) {
        const rect = link.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dist = Math.abs(cardCenter - centerX);
        if (dist < minDist) {
          minDist = dist;
          closest = link;
        }
      });

      if (closest) {
        raise(closest);
      }
    }

    function onScrollOrResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(raiseClosestToCenter);
    }

    stack.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    onScrollOrResize();
  }

  if (isMobile) {
    initMobileScrollBehavior();
    return;
  }

  /* Hover zones: independent layer above cards so every card stays hoverable */
  const hoverZones = document.createElement('div');
  hoverZones.className = 'card-stack__hover-zones';
  hoverZones.style.width = links.length * 2 + 'em';

  links.forEach(function (link, index) {
    const zone = document.createElement('div');
    zone.className = 'card-stack__hover-zone';
    zone.setAttribute('aria-hidden', 'true');
    zone.dataset.cardIndex = String(index);
    zone.addEventListener('mouseenter', function () {
      raise(link);
    });
    zone.addEventListener('mouseleave', function (e) {
      var next = e.relatedTarget;
      if (!next || !hoverZones.contains(next)) {
        lowerAll();
      }
    });
    zone.addEventListener('click', function (e) {
      e.preventDefault();
      link.click();
    });
    hoverZones.appendChild(zone);
  });

  stack.insertBefore(hoverZones, links[0]);

  stack.addEventListener('mouseleave', function () {
    lowerAll();
  });
})();
