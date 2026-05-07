(function () {
  'use strict';

  var isYandexCasePage = Boolean(document.querySelector('.ids__wrapper[data-client-tag="yandex"]'));
  var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
  if (!videos.length) return;

  function upsertSoundToggle(video) {
    if (!isYandexCasePage) return;
    if (!video || !video.parentElement) return;

    var host = video.closest('figure') || video.parentElement;
    if (!host) return;

    host.style.position = host.style.position || 'relative';

    var existing = host.querySelector('.video-sound-toggle');
    if (existing) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-sound-toggle';
    button.textContent = '🎵';
    button.setAttribute('aria-label', 'Включить звук');
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var nextMuted = !video.muted;
      video.muted = nextMuted;
      if (nextMuted) {
        video.setAttribute('muted', '');
      } else {
        video.removeAttribute('muted');
      }
      button.classList.toggle('is-on', !nextMuted);
      button.setAttribute('aria-label', nextMuted ? 'Включить звук' : 'Выключить звук');
      button.setAttribute('aria-pressed', String(!nextMuted));
    });

    host.appendChild(button);
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

  function playVideo(video) {
    var promise = video.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {});
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
    observer.observe(video);
  });
})();
