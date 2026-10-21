(function () {
  'use strict';

  if (sessionStorage.getItem('fd-page-transition')) {
    document.documentElement.classList.add('is-page-enter-prep');
  }
})();
