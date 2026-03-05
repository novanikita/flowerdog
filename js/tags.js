/**
 * Global tag system: project type tags and client tags.
 * - Collects tags from #site-projects-data and project cards
 * - Computes tag counts and renders in h1 blocks, on cards, and on project pages
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
   * Count tag occurrences from a list of project data elements
   * @param {HTMLCollection|NodeList} elements - elements with data-type-tags and data-client-tag
   * @returns {{ type: Record<string, number>, client: Record<string, number> }}
   */
  function countTagsFromElements(elements) {
    var typeCounts = {};
    var clientCounts = {};
    var i, el, typeTags, clientTag, tag;

    for (i = 0; i < elements.length; i++) {
      el = elements[i];
      typeTags = parseTags(el.getAttribute('data-type-tags') || '');
      clientTag = (el.getAttribute('data-client-tag') || '').trim();
      typeTags.forEach(function (t) {
        if (t) typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      if (clientTag) clientCounts[clientTag] = (clientCounts[clientTag] || 0) + 1;
    }
    return { type: typeCounts, client: clientCounts };
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
   * Render tags with counts into a container; append as comma-separated style (trailing comma on all but last)
   * @param {HTMLElement} container
   * @param {Record<string, number>} tagCounts
   * @param {string} kind - 'type' or 'client'
   */
  function renderHeadingTags(container, tagCounts, kind) {
    if (!container) return;
    container.innerHTML = '';
    var keys = Object.keys(tagCounts).sort();
    keys.forEach(function (slug, index) {
      var tagEl = createTagEl(slug, tagCounts[slug], kind);
      container.appendChild(tagEl);
      if (index < keys.length - 1) {
        var comma = document.createTextNode(', ');
        container.appendChild(comma);
      }
    });
  }

  /**
   * Update heading tag blocks from #site-projects-data and gallery cards
   */
  function updateHeadingTags() {
    var items = [];
    var dataRoot = document.getElementById('site-projects-data');
    if (dataRoot) {
      items = [].slice.call(dataRoot.querySelectorAll('[data-type-tags], [data-client-tag]'));
    }
    var galleryLinks = document.querySelectorAll('.card-stack__link[data-type-tags], .card-stack__link[data-client-tag]');
    items = items.concat([].slice.call(galleryLinks));
    if (items.length === 0) return;
    var counts = countTagsFromElements(items);

    var typeContainer = document.getElementById('heading-type-tags');
    var clientContainer = document.getElementById('heading-client-tags');
    if (typeContainer) renderHeadingTags(typeContainer, counts.type, TAG_TYPE);
    if (clientContainer) renderHeadingTags(clientContainer, counts.client, TAG_CLIENT);
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

  /**
   * Gallery filter: one active tag at a time; click tag to filter, click again to reset
   */
  function initHeadingTagFilters() {
    var links = document.querySelectorAll('.card-stack__link');
    if (links.length === 0) return;
    var activeFilter = null; // { slug: string, kind: string } or null
    var zonesContainer = document.querySelector('.card-stack__hover-zones');
    var zones = zonesContainer ? zonesContainer.querySelectorAll('.card-stack__hover-zone') : [];
    var headingContainers = document.querySelectorAll('#heading-type-tags, #heading-client-tags');

    function cardMatchesFilter(link, slug, kind) {
      if (kind === TAG_TYPE) {
        var typeStr = (link.getAttribute('data-type-tags') || '').trim();
        return parseTags(typeStr).indexOf(slug) !== -1;
      }
      return (link.getAttribute('data-client-tag') || '').trim() === slug;
    }

    var CARD_WIDTH_EM = 12;
    var OVERLAP_EM = 10; /* match main layout: margin-right -10em → step 2em */
    var STEP_EM = CARD_WIDTH_EM - OVERLAP_EM; /* 2em: next card left edge */
    var stackEl = document.querySelector('.card-stack');

    function applyFilter() {
      if (!stackEl) return;
      var slug = activeFilter ? activeFilter.slug : null;
      var kind = activeFilter ? activeFilter.kind : null;
      var isFiltered = !!slug;

      if (isFiltered) {
        stackEl.classList.add('card-stack--filtered');
        var visibleIndex = 0;
        links.forEach(function (link, i) {
          var show = cardMatchesFilter(link, slug, kind);
          var zone = zones[i];
          if (show) {
            link.classList.remove('is-hidden');
            link.style.left = visibleIndex * STEP_EM + 'em';
            if (zone) {
              zone.classList.remove('is-hidden');
              zone.style.left = visibleIndex * STEP_EM + 'em';
            }
            visibleIndex++;
          } else {
            link.classList.add('is-hidden');
            link.style.left = '-9999em';
            if (zone) {
              zone.classList.add('is-hidden');
              zone.style.left = '-9999em';
            }
          }
        });
      } else {
        stackEl.classList.remove('card-stack--filtered');
        links.forEach(function (link, i) {
          link.classList.remove('is-hidden');
          link.style.left = '';
          if (zones[i]) {
            zones[i].classList.remove('is-hidden');
            zones[i].style.left = '';
          }
        });
      }
    }

    function setActiveTag(tagEl) {
      headingContainers.forEach(function (cont) {
        var tags = cont.querySelectorAll('.tag[data-tag]');
        for (var j = 0; j < tags.length; j++) tags[j].classList.remove('is-active');
      });
      if (tagEl) tagEl.classList.add('is-active');
    }

    function onTagClick(e) {
      var tagEl = e.target.closest('.tag[data-tag][data-tag-kind]');
      if (!tagEl) return;
      var slug = tagEl.getAttribute('data-tag');
      var kind = tagEl.getAttribute('data-tag-kind');
      if (activeFilter && activeFilter.slug === slug && activeFilter.kind === kind) {
        activeFilter = null;
        setActiveTag(null);
      } else {
        activeFilter = { slug: slug, kind: kind };
        setActiveTag(tagEl);
      }
      applyFilter();
    }

    function onTagKeydown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onTagClick(e);
    }

    headingContainers.forEach(function (container) {
      container.addEventListener('click', onTagClick);
      container.addEventListener('keydown', onTagKeydown);
    });
  }

  function init() {
    updateHeadingTags();
    initProjectCards();
    initProjectPage();
    /* Defer so .card-stack__hover-zones exist (created by card-stack.js) */
    setTimeout(initHeadingTagFilters, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
