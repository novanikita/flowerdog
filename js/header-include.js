(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-fds-header]');
  if (!slots.length) return;

  /* Inline fallback when fetch fails (file://, offline, wrong base path on mobile). */
  var FALLBACK =
    '<header class="fds-header">' +
    '<div class="fds-header__left">' +
    '<div class="fds-header__logo"><a href="/" aria-label="flowerdog"><img src="images/icon/logo.svg" alt="flowerdog" class="fds-header__logo-image" draggable="false"></a></div>' +
    '</div>' +
    '<div class="fds-header__right">' +
    '<button type="button" class="fds-header__burger" aria-label="Open menu" aria-expanded="false">' +
    '<span class="fds-header__burger-line"></span>' +
    '<span class="fds-header__burger-line"></span>' +
    '</button>' +
    '<nav class="fds-header__nav">' +
    '<a class="fds-header__link" data-i18n data-key="nav.about" data-ru="О нас" data-en="About" href="about.html">О нас</a>' +
    '<a class="fds-header__link" data-i18n data-key="nav.projects" data-ru="Проекты" data-en="Projects" href="portfolio.html">Проекты</a>' +
    '<div class="fds-lang" aria-label="Language switcher" role="group">' +
    '<button type="button" class="fds-lang__btn is-active" data-lang-switch="ru" aria-pressed="true">РУ</button>' +
    '<button type="button" class="fds-lang__btn" data-lang-switch="en" aria-pressed="false">EN</button>' +
    '</div>' +
    '</nav>' +
    '</div></div></header>';

  function initMobileMenu(root) {
    var header = root.querySelector('.fds-header');
    var toggle = root.querySelector('.fds-header__burger');
    if (!header || !toggle) return;

    function setMenuOpen(isOpen) {
      if (isOpen) {
        header.classList.add('is-menu-open');
        document.body.classList.add('has-menu-open');
      } else {
        header.classList.remove('is-menu-open');
        document.body.classList.remove('has-menu-open');
      }

      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
      setMenuOpen(!header.classList.contains('is-menu-open'));
    });

    root.querySelectorAll('.fds-header__nav a, .fds-lang__btn').forEach(function (el) {
      el.addEventListener('click', function () {
        setMenuOpen(false);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setMenuOpen(false);
    });
  }

  function inject(markup) {
    slots.forEach(function (slot) {
      slot.innerHTML = markup;
      initMobileMenu(slot);
    });
    document.dispatchEvent(new CustomEvent('site:header-ready'));
    if (window.SiteLang && typeof window.SiteLang.getCurrent === 'function') {
      window.SiteLang.apply(window.SiteLang.getCurrent());
    }
  }

  fetch('partials/header.html')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load header partial');
      }
      return response.text();
    })
    .then(function (markup) {
      if (!markup || !String(markup).trim()) {
        throw new Error('Empty header partial');
      }
      inject(markup);
    })
    .catch(function () {
      inject(FALLBACK);
    });
})();
