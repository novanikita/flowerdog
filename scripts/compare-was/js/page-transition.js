(function () {
  'use strict';

  var STORAGE_KEY = 'fd-page-transition';
  var ENTER_MS = 340;
  var LEAVE_MS = 280;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isGalleryMediaLink(link) {
    if (!link) return false;
    if (link.closest('ids-gallery, .ids__gallery, .project-gallery')) return true;

    var href = link.getAttribute('href');
    if (!href) return false;

    return /\.(avif|webp|jpe?g|png|gif|svg|mp4|webm|mov)(\?|#|$)/i.test(href);
  }

  function isInternalLink(link) {
    if (!link || link.tagName !== 'A') return false;
    if (link.hasAttribute('download')) return false;
    if (link.target && link.target.toLowerCase() !== '_self') return false;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    try {
      var url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }

  function isSameDocumentNavigation(url) {
    var current = new URL(window.location.href);
    if (url.pathname.replace(/\/$/, '') !== current.pathname.replace(/\/$/, '')) return false;
    if (url.search !== current.search) return false;
    return true;
  }

  function supportsCrossDocumentViewTransition() {
    return typeof CSS !== 'undefined'
      && CSS.supports('navigation: auto')
      && CSS.supports('view-transition-name', 'root');
  }

  function clearTransitionClasses() {
    document.documentElement.classList.remove(
      'is-page-enter-prep',
      'is-page-entering',
      'is-page-leaving'
    );
  }

  function runEnterAnimation() {
    if (prefersReducedMotion || !document.documentElement.classList.contains('is-page-enter-prep')) return;

    sessionStorage.removeItem(STORAGE_KEY);
    document.documentElement.classList.remove('is-page-enter-prep');
    document.documentElement.classList.add('is-page-entering');

    window.setTimeout(function () {
      document.documentElement.classList.remove('is-page-entering');
    }, ENTER_MS);
  }

  function leaveAndNavigate(url) {
    if (prefersReducedMotion) {
      window.location.href = url;
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, '1');
    document.documentElement.classList.remove('is-page-enter-prep', 'is-page-entering');
    document.documentElement.classList.add('is-page-leaving');

    window.setTimeout(function () {
      window.location.href = url;
    }, LEAVE_MS);
  }

  function onDocumentClick(event) {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target.closest('a');
    if (!isInternalLink(link)) return;
    if (isGalleryMediaLink(link)) return;

    var url = new URL(link.href, window.location.href);
    if (isSameDocumentNavigation(url) && url.hash) return;

    if (supportsCrossDocumentViewTransition()) return;

    event.preventDefault();
    leaveAndNavigate(url.href);
  }

  // Back/forward often restores the page from bfcache with is-page-leaving
  // still applied (body opacity: 0), and scripts do not re-run.
  window.addEventListener('pagehide', function () {
    document.documentElement.classList.remove('is-page-leaving');
  });

  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    sessionStorage.removeItem(STORAGE_KEY);
    clearTransitionClasses();
  });

  document.addEventListener('click', onDocumentClick, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runEnterAnimation);
  } else {
    runEnterAnimation();
  }
})();
