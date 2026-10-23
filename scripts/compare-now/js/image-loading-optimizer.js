(function () {
  'use strict';

  function optimizeImages(root) {
    (root || document).querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
      if (!img.hasAttribute('fetchpriority')) {
        img.setAttribute('fetchpriority', 'low');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      optimizeImages(document);
    });
  } else {
    optimizeImages(document);
  }
})();
