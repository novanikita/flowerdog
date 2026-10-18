(function () {
  'use strict';

  function parseCoverImages(value) {
    if (!value) return [];
    return String(value).split('|').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function getFirstCoverImage(value) {
    var images = parseCoverImages(value);
    return images[0] || '';
  }

  function createCoverStrip(count) {
    var strip = document.createElement('div');
    strip.className = 'fds-card__strip';
    strip.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < count; i += 1) {
      var segment = document.createElement('span');
      segment.className = 'fds-card__strip-segment' + (i === 0 ? ' is-active' : '');
      strip.appendChild(segment);
    }
    return strip;
  }

  function createCard(project) {
    var item = document.createElement('div');
    item.className = 'fds-grid__item' + (project.itemClass ? ' ' + project.itemClass : '');
    if (project.id) item.setAttribute('data-project-id', project.id);

    var link = document.createElement('a');
    link.className = 'fds-card';
    var linkPrefix = window.SITE_PROJECT_LINK_PREFIX || '';
    link.href = linkPrefix + (project.href || 'soon.html');
    if (project.coverImages) link.setAttribute('data-cover-images', project.coverImages);

    var promo = document.createElement('div');
    promo.className = 'fds-card__cover' + (project.promoClass ? ' ' + project.promoClass : '');
    var firstCover = getFirstCoverImage(project.coverImages);
    if (firstCover) {
      promo.style.backgroundImage = "url('" + firstCover + "')";
    }

    var meta = document.createElement('div');
    meta.className = 'fds-card__meta';

    var title = document.createElement('h2');
    title.className = 'fds-card__title';
    title.setAttribute('data-i18n', '');
    title.setAttribute('data-ru', project.titleRu || '');
    title.setAttribute('data-en', project.titleEn || project.titleRu || '');
    title.textContent = project.titleRu || '';

    meta.appendChild(title);

    if (project.badgeRu || project.badgeEn) {
      var badge = document.createElement('span');
      badge.className = 'fds-chip';
      badge.setAttribute('data-i18n', '');
      badge.setAttribute('data-ru', project.badgeRu || project.badgeEn || '');
      badge.setAttribute('data-en', project.badgeEn || project.badgeRu || '');
      badge.textContent = project.badgeRu || project.badgeEn || '';
      meta.appendChild(badge);
    }

    link.appendChild(promo);
    var coverImages = parseCoverImages(project.coverImages);
    if (coverImages.length > 1) {
      link.appendChild(createCoverStrip(coverImages.length));
    }
    link.appendChild(meta);
    item.appendChild(link);
    return item;
  }

  function renderGrid(grid) {
    if (grid.dataset.projectsRendered === 'true') return;
    var pageKey = grid.getAttribute('data-projects-page');
    var list = window.SiteProjectsData && window.SiteProjectsData[pageKey];
    if (!list || !list.length) return;

    grid.innerHTML = '';
    list.forEach(function (project) {
      grid.appendChild(createCard(project));
    });

    if (pageKey === 'index') {
      var more = document.createElement('a');
      more.className = 'fds-button';
      more.href = 'portfolio.html';
      more.setAttribute('data-i18n', '');
      more.setAttribute('data-ru', 'Ещё проекты');
      more.setAttribute('data-en', 'More projects');
      more.textContent = 'Ещё проекты';
      grid.appendChild(more);
      if (window.SiteLang && window.SiteLang.apply) window.SiteLang.apply();
    }

    grid.dataset.projectsRendered = 'true';
  }

  function init() {
    var grids = document.querySelectorAll('.fds-grid[data-projects-page]');
    grids.forEach(renderGrid);
    document.dispatchEvent(new CustomEvent('site:projects-rendered'));
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();