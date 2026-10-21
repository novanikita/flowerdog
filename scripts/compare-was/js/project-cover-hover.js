(function () {
  'use strict';

  function parseCoverImages(value) {
    if (!value) return [];
    return value.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function setPromoBackground(promoEl, imageUrl) {
    if (!promoEl || !imageUrl) return;
    promoEl.style.backgroundImage = "url('" + imageUrl + "')";
    promoEl.style.backgroundColor = '';
  }

  function setPromoColor(promoEl, color) {
    if (!promoEl || !color) return;
    promoEl.style.backgroundImage = 'none';
    promoEl.style.backgroundColor = color;
  }

  function setPromoVideo(promoEl, videoUrl) {
    if (!promoEl || !videoUrl) return;
    var video = promoEl.querySelector('video');
    if (!video) return;

    var source = video.querySelector('source');
    var current = source ? source.getAttribute('src') : (video.getAttribute('src') || '');
    if (current === videoUrl) return;

    var wasMuted = video.muted !== false;
    if (source) {
      source.setAttribute('src', videoUrl);
    } else {
      video.setAttribute('src', videoUrl);
    }
    video.load();
    video.muted = wasMuted;
    if (wasMuted) {
      video.setAttribute('muted', '');
    } else {
      video.removeAttribute('muted');
    }

    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {});
    }

    var button = promoEl.querySelector('.video-sound-toggle');
    if (button) {
      button.classList.toggle('is-on', !wasMuted);
      button.setAttribute('aria-label', wasMuted ? 'Включить звук' : 'Выключить звук');
      button.setAttribute('aria-pressed', String(!wasMuted));
    }
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

    link.addEventListener('mouseenter', startPreload, { once: true, passive: true });
    link.addEventListener('touchstart', startPreload, { once: true, passive: true });

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

    afterInitialLoad(startPreload);
  }

  function updateMenuLabel(link, index) {
    if (!link.hasAttribute('data-cover-labels-ru')) return;
    var desc = link.querySelector('.menu-item-desc');
    if (!desc) return;
    var lang = (window.SiteLang && window.SiteLang.getCurrent())
      || document.documentElement.getAttribute('data-lang')
      || 'ru';
    var labels = parseCoverImages(link.getAttribute('data-cover-labels-' + lang));
    if (!labels.length) labels = parseCoverImages(link.getAttribute('data-cover-labels-ru'));
    if (index < 0 || index >= labels.length) return;
    link.dataset.menuCoverIndex = String(index);
    desc.textContent = labels[index];
  }

  function setupCoverHover(link, frames, useColors, useVideos) {
    if (!frames.length) return;

    var promo = link.querySelector('.project-promo');
    if (!promo) return;

    var currentIndex = -1;

    function applyFrame(index) {
      if (useVideos) {
        setPromoVideo(promo, frames[index]);
      } else if (useColors) {
        setPromoColor(promo, frames[index]);
      } else {
        setPromoBackground(promo, frames[index]);
      }
    }

    applyFrame(0);
    currentIndex = 0;
    updateCoverStrip(link, 0);
    updateMenuLabel(link, 0);
    if (!useColors && !useVideos) setupDeferredPreload(link, frames);

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
      var idx = Math.floor(ratio * frames.length);
      if (idx < 0) idx = 0;
      if (idx > frames.length - 1) idx = frames.length - 1;

      if (idx !== currentIndex) {
        currentIndex = idx;
        applyFrame(idx);
        updateCoverStrip(link, idx);
        updateMenuLabel(link, idx);
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
      applyFrame(0);
      updateCoverStrip(link, 0);
      updateMenuLabel(link, 0);
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
      applyFrame(0);
      updateCoverStrip(link, 0);
      updateMenuLabel(link, 0);
    }

    link.addEventListener('touchend', stopTouchTracking, { passive: true });
    link.addEventListener('touchcancel', stopTouchTracking, { passive: true });
  }

  function refreshMenuLabels() {
    document.querySelectorAll('.menu-promo-link[data-cover-labels-ru]').forEach(function (link) {
      var index = parseInt(link.dataset.menuCoverIndex || '0', 10);
      if (Number.isNaN(index)) index = 0;
      updateMenuLabel(link, index);
    });
  }

  function initProjectCovers() {
    document.querySelectorAll('.project-promo-link[data-cover-videos]').forEach(function (link) {
      if (link.dataset.coverHoverInit === 'true') return;
      link.dataset.coverHoverInit = 'true';
      setupCoverHover(link, parseCoverImages(link.getAttribute('data-cover-videos')), false, true);
    });

    document.querySelectorAll('.project-promo-link[data-cover-images]').forEach(function (link) {
      if (link.dataset.coverHoverInit === 'true') return;
      link.dataset.coverHoverInit = 'true';
      setupCoverHover(link, parseCoverImages(link.getAttribute('data-cover-images')), false, false);
    });

    document.querySelectorAll('.project-promo-link[data-cover-colors]').forEach(function (link) {
      if (link.dataset.coverHoverInit === 'true') return;
      link.dataset.coverHoverInit = 'true';
      setupCoverHover(link, parseCoverImages(link.getAttribute('data-cover-colors')), true, false);
    });

    document.querySelectorAll('.menu-promo-link--sound[data-sound-samples]').forEach(function (link) {
      if (link.dataset.soundMenuInit === 'true') return;
      link.dataset.soundMenuInit = 'true';
      setupSoundMenu(link);
    });
  }

  function setupSoundMenu(link) {
    var samples = parseCoverImages(link.getAttribute('data-sound-samples'));
    if (!samples.length) return;

    var currentIndex = 0;
    var audio = null;
    var rafId = null;
    var lastClientX = null;

    link.dataset.menuCoverIndex = '0';
    updateCoverStrip(link, 0);
    updateMenuLabel(link, 0);

    function setIndex(index) {
      if (index < 0) index = 0;
      if (index > samples.length - 1) index = samples.length - 1;
      if (index === currentIndex) return;
      currentIndex = index;
      updateCoverStrip(link, index);
      updateMenuLabel(link, index);
    }

    function updateByClientX(clientX) {
      if (clientX == null) return;
      var rect = link.getBoundingClientRect();
      var ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      var idx = Math.floor(ratio * samples.length);
      setIndex(idx);
    }

    function stopAudio() {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio = null;
      link.classList.remove('is-playing');
    }

    function playCurrent() {
      var src = samples[currentIndex];
      if (!src) return;

      if (audio && audio.dataset.sampleSrc === src && !audio.paused) {
        stopAudio();
        return;
      }

      stopAudio();
      audio = new Audio(src);
      audio.dataset.sampleSrc = src;
      link.classList.add('is-playing');
      audio.addEventListener('ended', function () {
        link.classList.remove('is-playing');
        audio = null;
      });
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          link.classList.remove('is-playing');
          audio = null;
        });
      }
    }

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
      setIndex(0);
    });

    link.addEventListener('click', function (e) {
      e.preventDefault();
      playCurrent();
    });

    link.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      playCurrent();
    });
  }

  initProjectCovers();
  document.addEventListener('site:projects-rendered', initProjectCovers);
  document.addEventListener('site:header-ready', initProjectCovers);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-lang-switch]')) return;
    window.setTimeout(refreshMenuLabels, 0);
  });
})();
