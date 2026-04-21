(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-site-header]');
  if (!slots.length) return;

  /* Inline fallback when fetch fails (file://, offline, wrong base path on mobile). */
  var FALLBACK =
    '<header class="main-header">' +
    '<div class="main-header__left">' +
    '<div class="logo"><a href="index.html">flowerdog</a></div>' +
    '</div>' +
    '<div class="main-header__right">' +
    '<nav class="main-header__nav">' +
    '<a class="main-header__link" data-i18n data-key="nav.about" data-ru="О нас" data-en="About" href="soon.html">О нас</a>' +
    '<a class="main-header__link" data-i18n data-key="nav.projects" data-ru="Проекты" data-en="Projects" href="portfolio.html">Проекты</a>' +
    '</nav>' +
    '<div class="lang-switcher" aria-label="Language switcher" role="group">' +
    '<button type="button" class="lang-switcher__btn is-active" data-lang-switch="ru" aria-pressed="true">РУ</button>' +
    '<button type="button" class="lang-switcher__btn" data-lang-switch="en" aria-pressed="false">EN</button>' +
    '</div></div></header>';

  function inject(markup) {
    slots.forEach(function (slot) {
      slot.innerHTML = markup;
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
