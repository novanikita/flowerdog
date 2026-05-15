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
    strip.className = 'project-cover-strip';
    strip.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < count; i += 1) {
      var segment = document.createElement('span');
      segment.className = 'project-cover-strip__segment' + (i === 0 ? ' is-active' : '');
      strip.appendChild(segment);
    }
    return strip;
  }

  function createCard(project) {
    var item = document.createElement('div');
    item.className = 'projects-grid-item' + (project.itemClass ? ' ' + project.itemClass : '');
    if (project.id) item.setAttribute('data-project-id', project.id);

    var link = document.createElement('a');
    link.className = 'project-promo-link';
    link.href = project.href || 'soon.html';
    if (project.coverImages) link.setAttribute('data-cover-images', project.coverImages);

    var promo = document.createElement('div');
    promo.className = 'project-promo' + (project.promoClass ? ' ' + project.promoClass : '');
    var firstCover = getFirstCoverImage(project.coverImages);
    if (firstCover) {
      promo.style.backgroundImage = "url('" + firstCover + "')";
    }

    var meta = document.createElement('div');
    meta.className = 'project-promo-meta';

    var title = document.createElement('h2');
    title.setAttribute('data-i18n', '');
    title.setAttribute('data-ru', project.titleRu || '');
    title.setAttribute('data-en', project.titleEn || project.titleRu || '');
    title.textContent = project.titleRu || '';

    meta.appendChild(title);
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
      more.className = 'projects-more-btn';
      more.href = 'soon.html';
      more.textContent = 'Ещё проекты';
      grid.appendChild(more);
    }

    grid.dataset.projectsRendered = 'true';
  }

  function init() {
    var grids = document.querySelectorAll('.projects-grid[data-projects-page]');
    grids.forEach(renderGrid);
    document.dispatchEvent(new CustomEvent('site:projects-rendered'));
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();