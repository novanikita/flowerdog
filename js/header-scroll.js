(function () {
  'use strict';

  function initHeaderScroll() {
    var header = document.querySelector('header');
    if (!header || header.dataset.scrollInit === 'true') return;
    header.dataset.scrollInit = 'true';

    var lastScrollY = window.scrollY || 0;
    var ticking = false;
    var hideAfter = 24;
    var triggerDistance = 12;
    var downDistance = 0;
    var upDistance = 0;

    function updateHeader() {
      var currentScrollY = window.scrollY || 0;
      var delta = currentScrollY - lastScrollY;

      /* Touch / restored scroll: avoid leaving header stuck off-screen at first paint */
      if (currentScrollY < 0) currentScrollY = 0;

      if (currentScrollY <= hideAfter) {
        header.classList.remove('is-hidden');
        downDistance = 0;
        upDistance = 0;
      } else {
        if (delta > 0) {
          downDistance += delta;
          upDistance = 0;
        } else if (delta < 0) {
          upDistance += Math.abs(delta);
          downDistance = 0;
        }

        if (downDistance >= triggerDistance) {
          header.classList.add('is-hidden');
          downDistance = 0;
        } else if (upDistance >= triggerDistance) {
          header.classList.remove('is-hidden');
          upDistance = 0;
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateHeader);
    }, { passive: true });

    header.classList.remove('is-hidden');
    lastScrollY = window.scrollY || 0;
    requestAnimationFrame(updateHeader);
  }

  initHeaderScroll();
  document.addEventListener('site:header-ready', initHeaderScroll);
})();
