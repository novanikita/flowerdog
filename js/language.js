(function () {
  'use strict';
  var STORAGE_KEY = 'site_lang';
  var DEFAULT_LANG = 'ru';
  var SUPPORTED = ['ru', 'en'];

  function getSavedLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.indexOf(saved) !== -1 ? saved : DEFAULT_LANG;
  }

  function saveLang(lang) {
    if (SUPPORTED.indexOf(lang) !== -1) localStorage.setItem(STORAGE_KEY, lang);
  }

  function applyLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    document.documentElement.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var text = el.getAttribute('data-' + lang);
      if (text != null) el.textContent = text;
    });

    document.querySelectorAll('.tag[data-tag-en], .tag[data-tag-ru]').forEach(function (el) {
      var text = el.getAttribute('data-tag-' + lang);
      if (text != null) el.textContent = text;
    });

    document.querySelectorAll('[data-lang-switch]').forEach(function (btn) {
      var isActive = btn.getAttribute('data-lang-switch') === lang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setLang(lang) {
    saveLang(lang);
    applyLang(lang);
  }

  function init() {
    applyLang(getSavedLang());
    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-lang-switch]');
      if (!target || SUPPORTED.indexOf(target.getAttribute('data-lang-switch')) === -1) return;
      e.preventDefault();
      setLang(target.getAttribute('data-lang-switch'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SiteLang = { getCurrent: getSavedLang, set: setLang, apply: applyLang };
})();