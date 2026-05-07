(function () {
  'use strict';

  var LOGO_MIN_EM = 2;
  var LOGO_SHRINK_DISTANCE = 260;

  function isCasePage() {
    return Boolean(
      document.querySelector('.project-case-text, .project-gallery, .project-meta, ids-gallery, .ids__gallery')
    );
  }

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function syncHeaderLogoScale(header) {
    if (!header || !isCasePage()) return;
    var logoLink = header.querySelector('.main-header__left .logo a');
    var rightBlock = header.querySelector('.main-header__right');
    if (!logoLink) return;

    if (!header.__logoExpandedPx || header.__logoExpandedPx <= 0) {
      header.__logoExpandedPx = parseFloat(window.getComputedStyle(logoLink).fontSize) || 0;
    }
    if (!header.__logoExpandedPx || header.__logoExpandedPx <= 0) return;

    var rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    var minPx = LOGO_MIN_EM * rootFontSize;
    var expandedPx = Math.max(header.__logoExpandedPx, minPx);
    var progress = clamp01(window.scrollY / LOGO_SHRINK_DISTANCE);
    var currentPx = expandedPx - (expandedPx - minPx) * progress;

    logoLink.style.fontSize = currentPx + 'px';

    if (rightBlock) {
      if (!header.__rightMarginTopExpandedPx || header.__rightMarginTopExpandedPx < 0) {
        header.__rightMarginTopExpandedPx = parseFloat(window.getComputedStyle(rightBlock).marginTop) || 0;
      }
      var currentRightMarginTopPx = header.__rightMarginTopExpandedPx * (1 - progress);
      rightBlock.style.marginTop = currentRightMarginTopPx + 'px';
    }
  }

  function reserveHeaderSpace(header) {
    var host = document.querySelector('[data-site-header]');
    if (!host || !header) return;
    var height = Math.ceil(header.getBoundingClientRect().height);
    if (height > 0) {
      host.style.minHeight = height + 'px';
    }
  }

  function initHeaderScroll() {
    var header = document.querySelector('header');
    if (!header) return;
    header.classList.remove('is-hidden');
    if (isCasePage()) {
      header.classList.add('is-fixed-on-case');
      reserveHeaderSpace(header);
      header.__logoExpandedPx = 0;
      header.__rightMarginTopExpandedPx = -1;
      syncHeaderLogoScale(header);
    }
    if (!header.__compactScrollBound) {
      window.addEventListener('scroll', function () {
        syncHeaderLogoScale(header);
      }, { passive: true });
      window.addEventListener('resize', function () {
        header.__logoExpandedPx = 0;
        header.__rightMarginTopExpandedPx = -1;
        reserveHeaderSpace(header);
        syncHeaderLogoScale(header);
      });
      header.__compactScrollBound = true;
    }
  }

  initHeaderScroll();
  document.addEventListener('site:header-ready', initHeaderScroll);
})();
