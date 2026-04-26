(function () {
  'use strict';
  var LAST_INDEX_SCROLL_KEY = 'site:last-index-scroll-y';
  var hasRestoredScrollPosition = false;

  function getFirstCoverImage(value) {
    if (!value) return '';
    return String(value).split('|')[0].trim();
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
    link.appendChild(meta);
    item.appendChild(link);
    return item;
  }

  function rememberCurrentScrollPosition() {
    try {
      sessionStorage.setItem(LAST_INDEX_SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
    } catch (error) {
      // Ignore storage errors in private mode or blocked storage.
    }
  }

  function restoreScrollPosition() {
    if (hasRestoredScrollPosition) return;
    var rawValue;
    try {
      rawValue = sessionStorage.getItem(LAST_INDEX_SCROLL_KEY);
    } catch (error) {
      return;
    }
    if (rawValue === null) return;
    var targetScrollY = Number(rawValue);
    if (!isFinite(targetScrollY)) targetScrollY = 0;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        var maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (targetScrollY < 0) targetScrollY = 0;
        if (targetScrollY > maxScrollY) targetScrollY = maxScrollY;
        window.scrollTo(0, targetScrollY);
        hasRestoredScrollPosition = true;
        try {
          sessionStorage.removeItem(LAST_INDEX_SCROLL_KEY);
        } catch (error) {
          // Ignore storage cleanup errors.
        }
      });
    });
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
      grid.addEventListener('click', function (event) {
        var link = event.target && event.target.closest('a');
        if (!link) return;
        rememberCurrentScrollPosition();
      });
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
    restoreScrollPosition();
    document.dispatchEvent(new CustomEvent('site:projects-rendered'));
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pageshow', restoreScrollPosition);
  window.addEventListener('beforeunload', rememberCurrentScrollPosition);
})();