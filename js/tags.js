/**
 * Global tag system: project type tags and client tags.
 * - Renders tags on project cards and project pages
 */
(function () {
  'use strict';

  var TAG_TYPE = 'type';
  var TAG_CLIENT = 'client';

  /**
   * Parse space-separated tag string into array of trimmed non-empty strings
   * @param {string} str
   * @returns {string[]}
   */
  function parseTags(str) {
    if (!str || typeof str !== 'string') return [];
    return str.trim().split(/\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /** Tag label translations: slug -> { en, ru } (type and client tags) */
  var TAG_LABELS = {
    branding: { en: 'Branding', ru: 'брендинг' },
    events: { en: 'Events', ru: 'мероприятие' },
    website: { en: 'Website', ru: 'сайт' },
    yandex: { en: 'Yandex', ru: 'Яндекс' },
    lavatop: { en: 'Lavatop', ru: 'Лаватоп' },
    sber: { en: 'Sber', ru: 'Сбер' },
    startup: { en: 'Startup', ru: 'стартап' },
    rangos: { en: 'Rangos', ru: 'Рангос' },
    'vse-instrumenty': { en: 'Vse Instrumenty', ru: 'Все Инструменты' },
    'pmk-park': { en: 'PMK Park', ru: 'ПМК Парк' },
    sporos: { en: 'Sporos', ru: 'Спорос' },
    'dodo-pizza': { en: 'Dodo Pizza', ru: 'Додо Пицца' }
  };

  /**
   * Format tag for display: capitalize first letter, replace hyphens with spaces
   * @param {string} slug
   * @returns {string}
   */
  function formatTagLabel(slug) {
    return slug
      .split('-')
      .map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
      .join(' ');
  }

  /**
   * Get tag label for a language
   * @param {string} slug
   * @param {string} lang - 'en' or 'ru'
   * @returns {string}
   */
  function getTagLabel(slug, lang) {
    var t = TAG_LABELS[slug];
    if (t && t[lang]) return t[lang];
    return formatTagLabel(slug);
  }

  /**
   * Create a single tag element (span.tag) with optional count
   * @param {string} slug
   * @param {number} [count]
   * @param {string} [kind] - 'type' or 'client' for optional class and filter data
   * @returns {HTMLSpanElement}
   */
  function createTagEl(slug, count, kind) {
    var suffix = (count != null && count !== '') ? ' ' + count : '';
    var labelEn = getTagLabel(slug, 'en') + suffix;
    var labelRu = getTagLabel(slug, 'ru') + suffix;
    var lang = (document.documentElement.getAttribute('data-lang') || 'en');
    var span = document.createElement('span');
    span.className = 'tag' + (kind ? ' tag--' + kind : '');
    span.setAttribute('data-tag-en', labelEn);
    span.setAttribute('data-tag-ru', labelRu);
    span.textContent = lang === 'ru' ? labelRu : labelEn;
    if (kind) {
      span.setAttribute('data-tag', slug);
      span.setAttribute('data-tag-kind', kind);
      span.setAttribute('role', 'button');
      span.setAttribute('tabindex', '0');
    }
    return span;
  }

  /**
   * Render tags for a single project (card or project page) into container
   * @param {HTMLElement} container
   * @param {string} typeTagsStr
   * @param {string} clientTagStr
   */
  function renderProjectTags(container, typeTagsStr, clientTagStr) {
    if (!container) return;
    container.innerHTML = '';
    var typeTags = parseTags(typeTagsStr || '');
    var clientTag = (clientTagStr || '').trim();
    typeTags.forEach(function (slug) {
      container.appendChild(createTagEl(slug, null, TAG_TYPE));
    });
    if (clientTag) container.appendChild(createTagEl(clientTag, null, TAG_CLIENT));
  }

  /**
   * Decorate all .project-promo-link that have data-type-tags or data-client-tag
   */
  function initProjectCards() {
    document.querySelectorAll('.project-promo-link[data-type-tags], .project-promo-link[data-client-tag]').forEach(function (link) {
      var container = link.querySelector('.project-tags');
      if (!container) return;
      renderProjectTags(
        container,
        link.getAttribute('data-type-tags'),
        link.getAttribute('data-client-tag')
      );
    });
  }

  /**
   * On project page: find wrapper with data-type-tags / data-client-tag and render tags before h1
   */
  function initProjectPage() {
    var wrapper = document.querySelector('[data-type-tags], [data-client-tag]');
    if (!wrapper) return;
    var header = wrapper.querySelector('h1');
    if (!header) return;
    var container = document.querySelector('.project-header-tags');
    if (!container) return;
    renderProjectTags(
      container,
      wrapper.getAttribute('data-type-tags'),
      wrapper.getAttribute('data-client-tag')
    );
  }

  function init() {
    initProjectCards();
    initProjectPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
