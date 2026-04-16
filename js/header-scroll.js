(function () {
  'use strict';

  var header = document.querySelector('header');
  if (!header) return;

  var lastScrollY = window.scrollY || 0;
  var ticking = false;
  var hideAfter = 24;
  var accumulatedDelta = 0;
  var lastDirection = 0;
  var triggerDistance = 18;

  function updateHeader() {
    var currentScrollY = window.scrollY || 0;
    var delta = currentScrollY - lastScrollY;
    var direction = delta === 0 ? 0 : (delta > 0 ? 1 : -1);

    if (currentScrollY <= hideAfter) {
      header.classList.remove('is-hidden');
      accumulatedDelta = 0;
      lastDirection = 0;
    } else {
      if (direction !== 0) {
        if (direction !== lastDirection) {
          accumulatedDelta = 0;
          lastDirection = direction;
        }
        accumulatedDelta += delta;
      }

      if (accumulatedDelta >= triggerDistance) {
        header.classList.add('is-hidden');
        accumulatedDelta = 0;
      } else if (accumulatedDelta <= -triggerDistance) {
        header.classList.remove('is-hidden');
        accumulatedDelta = 0;
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
})();
