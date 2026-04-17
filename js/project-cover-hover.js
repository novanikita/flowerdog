(function () {
  'use strict';

  function parseCoverImages(value) {
    if (!value) return [];
    // Use `|` as delimiter to avoid escaping issues with commas.
    return value.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function setPromoBackground(promoEl, imageUrl) {
    if (!promoEl || !imageUrl) return;
    promoEl.style.backgroundImage = "url('" + imageUrl + "')";
  }

  function initProjectCovers() {
    var cards = document.querySelectorAll('.project-promo-link[data-cover-images]');
    if (!cards || !cards.length) return;

    cards.forEach(function (link) {
      if (link.dataset.coverHoverInit === 'true') return;
      link.dataset.coverHoverInit = 'true';

      var images = parseCoverImages(link.getAttribute('data-cover-images'));
      if (!images.length) return;

      var promo = link.querySelector('.project-promo');
      if (!promo) return;

      var currentIndex = -1;
      setPromoBackground(promo, images[0]);
      currentIndex = 0;

      var rafId = null;
      var lastClientX = null;

      function updateByClientX(clientX) {
        if (clientX == null) return;
        var rect = link.getBoundingClientRect();
        var x = clientX - rect.left;
        var ratio = rect.width > 0 ? x / rect.width : 0;
        var idx = Math.floor(ratio * images.length);
        if (idx < 0) idx = 0;
        if (idx > images.length - 1) idx = images.length - 1;

        if (idx !== currentIndex) {
          currentIndex = idx;
          setPromoBackground(promo, images[idx]);
        }
      }

      link.addEventListener('mouseenter', function (e) {
        lastClientX = e.clientX;
        updateByClientX(lastClientX);
      });

      link.addEventListener('mousemove', function (e) {
        lastClientX = e.clientX;
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
          rafId = null;
          updateByClientX(lastClientX);
        });
      }, { passive: true });

      link.addEventListener('mouseleave', function () {
        lastClientX = null;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        currentIndex = 0;
        setPromoBackground(promo, images[0]);
      });
    });

  }

  initProjectCovers();
  document.addEventListener('site:header-ready', initProjectCovers);
})();

