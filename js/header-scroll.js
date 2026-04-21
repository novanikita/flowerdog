(function () {
  'use strict';

  function initHeaderScroll() {
    var header = document.querySelector('header');
    if (!header) return;
    header.classList.remove('is-hidden');
  }

  initHeaderScroll();
  document.addEventListener('site:header-ready', initHeaderScroll);
})();
