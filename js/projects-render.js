(function () {
  'use strict';

  function getFirstCoverImage(value) {
    if (!value) return '';
    return String(value).split('|')[0].trim();
  }

  function createCard(project) {
    var item = document.createElement('div');
    item.className = 'projects-grid-item' + (project.itemClass ? ' ' + project.itemClass : '');

    var link = document.createElement('a');
    link.className = 'project-promo-link';
    link.href = project.href || 'soon.html';
    if (project.typeTags) link.setAttribute('data-type-tags', project.typeTags);
    if (project.clientTag) link.setAttribute('data-client-tag', project.clientTag);
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

    var tags = document.createElement('div');
    tags.className = 'project-tags';
    tags.setAttribute('aria-label', 'Project tags');

    meta.appendChild(title);
    meta.appendChild(tags);
    link.appendChild(promo);
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
      more.href = 'portfolio.html';
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