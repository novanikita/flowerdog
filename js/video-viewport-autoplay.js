(function () {
  'use strict';

  var videos = Array.prototype.slice.call(
    document.querySelectorAll('video[autoplay][muted]')
  );
  if (!videos.length) return;

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
