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

  function updateCoverStrip(link, activeIndex) {
    var strip = link.querySelector('.project-cover-strip');
    if (!strip) return;
    var segments = strip.querySelectorAll('.project-cover-strip__segment');
    for (var i = 0; i < segments.length; i += 1) {
      segments[i].classList.toggle('is-active', i === activeIndex);
    }
  }

  function preloadImage(src) {
    if (!src) return;
    var img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = src;
  }

  function preloadCoverImages(images) {
    if (!images || images.length < 2) return;
    for (var i = 1; i < images.length; i += 1) {
      var src = images[i];
      if (!src) continue;
      preloadImage(src);
    }
  }

  function runWhenIdle(task) {
    if (typeof task !== 'function') return;
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 1500 });
      return;
    }
    window.setTimeout(task, 500);
  }

  function afterInitialLoad(task) {
    if (document.readyState === 'complete') {
      runWhenIdle(task);
      return;
    }
    window.addEventListener('load', function onLoad() {
      runWhenIdle(task);
    }, { once: true });
  }

  function setupDeferredPreload(link, images) {
    if (!link || !images || images.length < 2) return;

    var started = false;

    function startPreload() {
      if (started) return;
      started = true;
      afterInitialLoad(function () {
        preloadCoverImages(images);
      });
    }

    // If user starts interaction, warm up frames immediately.
    link.addEventListener('mouseenter', startPreload, { once: true, passive: true });
    link.addEventListener('touchstart', startPreload, { once: true, passive: true });

    // Otherwise preload only when card is near viewport.
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i += 1) {
          if (!entries[i].isIntersecting) continue;
          startPreload();
          observer.disconnect();
          break;
        }
      }, { rootMargin: '300px 0px' });
      observer.observe(link);
      return;
    }

    // Older browsers: fallback to delayed preload after onload.
    afterInitialLoad(startPreload);
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
      updateCoverStrip(link, 0);
      setupDeferredPreload(link, images);

      var rafId = null;
      var lastClientX = null;
      var isTouchTracking = false;
      var touchStartX = 0;
      var touchStartY = 0;

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
          updateCoverStrip(link, idx);
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
        updateCoverStrip(link, 0);
      });

      link.addEventListener('touchstart', function (e) {
        var touch = e.touches && e.touches[0];
        if (!touch) return;
        isTouchTracking = true;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        lastClientX = touch.clientX;
        updateByClientX(lastClientX);
      }, { passive: true });

      link.addEventListener('touchmove', function (e) {
        if (!isTouchTracking) return;
        var touch = e.touches && e.touches[0];
        if (!touch) return;

        var deltaX = touch.clientX - touchStartX;
        var deltaY = touch.clientY - touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          e.preventDefault();
        }

        lastClientX = touch.clientX;
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
          rafId = null;
          updateByClientX(lastClientX);
        });
      }, { passive: false });

      function stopTouchTracking() {
        isTouchTracking = false;
        touchStartX = 0;
        touchStartY = 0;
        lastClientX = null;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        currentIndex = 0;
        setPromoBackground(promo, images[0]);
        updateCoverStrip(link, 0);
      }

      link.addEventListener('touchend', stopTouchTracking, { passive: true });
      link.addEventListener('touchcancel', stopTouchTracking, { passive: true });
    });

  }

  initProjectCovers();
  document.addEventListener('site:projects-rendered', initProjectCovers);
  document.addEventListener('site:header-ready', initProjectCovers);
})();

