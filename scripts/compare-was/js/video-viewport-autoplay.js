(function () {
  'use strict';

  var isYandexCasePage = Boolean(document.querySelector('.ids__wrapper[data-client-tag="yandex"]'));
  var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
  if (!videos.length) return;

  var desktopSoundClickMql = window.matchMedia('(min-width: 769px)');

  function setVideoMuted(video, button, muted) {
    video.muted = muted;
    if (muted) {
      video.setAttribute('muted', '');
    } else {
      video.removeAttribute('muted');
    }
    video.classList.toggle('has-sound-on', !muted);
    if (button) {
      button.classList.toggle('is-on', !muted);
      button.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
      button.setAttribute('aria-pressed', String(!muted));
    }

    // Chromium/WebKit sometimes fail to repaint a custom CSS cursor right after a
    // click, leaving the default arrow until the mouse physically moves. Forcing an
    // inline cursor change nudges the browser to redraw it immediately.
    if (desktopSoundClickMql.matches) {
      video.style.cursor = 'none';
      requestAnimationFrame(function () {
        video.style.cursor = '';
      });
    }
  }

  function isSoundToggleDisabled(video) {
    if (!video) return false;
    // Two video types:
    // - default: show "Включить звук" toggle
    // - data-sound-toggle="off": no toggle (animation-only clips)
    var attr = video.getAttribute('data-sound-toggle');
    if (attr == null) return false;
    var value = String(attr).trim().toLowerCase();
    return value === 'off' || value === 'false' || value === '0' || value === 'no' || value === 'hide';
  }

  function upsertSoundToggle(video) {
    if (!video || !video.parentElement) return;
    if (isSoundToggleDisabled(video)) return;

    var allowToggle =
      isYandexCasePage ||
      String(video.getAttribute('data-sound-toggle') || '').trim().toLowerCase() === 'on';
    if (!allowToggle) return;

    var host = video.closest('figure') || video.parentElement;
    if (!host) return;

    host.style.position = host.style.position || 'relative';
    video.classList.add('has-sound-toggle');

    var existing = host.querySelector('.video-sound-toggle');
    var button = existing;

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-sound-toggle';
      var icon = document.createElement('span');
      icon.className = 'video-sound-toggle__icon';
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      button.setAttribute('aria-label', 'Включить звук');
      button.setAttribute('aria-pressed', 'false');

      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        setVideoMuted(video, button, !video.muted);
      });

      host.appendChild(button);
    }

    // Clicking or tapping anywhere on the video toggles sound. The button
    // (mobile only) stops propagation, so a tap on it doesn't toggle twice.
    video.addEventListener('click', function (event) {
      event.preventDefault();
      setVideoMuted(video, button, !video.muted);
    });
  }

  videos.forEach(function (video) {
    // Keep behavior consistent for all project videos.
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    upsertSoundToggle(video);
  });

  function ensureVideoLoading(video) {
    if (!video || video.readyState > 0) return;
    video.preload = 'auto';
    video.load();
  }

  function playVideo(video) {
    ensureVideoLoading(video);

    if (video.readyState < 2) {
      if (video.__awaitingPlay) return;
      video.__awaitingPlay = true;
      video.addEventListener(
        'canplay',
        function () {
          video.__awaitingPlay = false;
          playVideo(video);
        },
        { once: true }
      );
      return;
    }

    var promise = video.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {
        if (video.__awaitingPlay) return;
        video.__awaitingPlay = true;
        video.addEventListener(
          'canplay',
          function () {
            video.__awaitingPlay = false;
            playVideo(video);
          },
          { once: true }
        );
      });
    }
  }

  function pauseVideo(video) {
    video.pause();
  }

  if (!('IntersectionObserver' in window)) {
    videos.forEach(playVideo);
    return;
  }

  videos.forEach(pauseVideo);

  var preloadObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        ensureVideoLoading(entry.target);
        preloadObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: '500px 0px'
    }
  );

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          playVideo(entry.target);
        } else {
          pauseVideo(entry.target);
        }
      });
    },
    {
      threshold: [0, 0.35, 1],
      rootMargin: '100px 0px'
    }
  );

  videos.forEach(function (video) {
    preloadObserver.observe(video);
    observer.observe(video);
  });
})();
