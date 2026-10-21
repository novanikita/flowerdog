(function () {
  'use strict';

  var LOGO_MIN_EM = 2;
  var LOGO_SHRINK_DISTANCE = 260;
  var MOBILE_MAX_WIDTH = 768;
  var LOGO_MARGIN_TOP_START_EM = 0.05;
  var LOGO_MARGIN_TOP_END_EM = 0.2;
  var LOGO_MARGIN_BOTTOM_END_EM = 0.2;

  function isMobileViewport() {
    return window.matchMedia('(max-width: ' + MOBILE_MAX_WIDTH + 'px)').matches;
  }

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function resetHeaderInlineStyles(header) {
    if (!header) return;
    var logoLink = header.querySelector('.main-header__left .logo a');
    var rightBlock = header.querySelector('.main-header__right');
    if (logoLink) {
      logoLink.style.fontSize = '';
      logoLink.style.marginTop = '';
      logoLink.style.marginBottom = '';
    }
    if (rightBlock) rightBlock.style.marginTop = '';
  }

  function syncHeaderLogoScale(header) {
    if (!header) return;
    if (isMobileViewport()) {
      resetHeaderInlineStyles(header);
      return;
    }
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
    logoLink.style.marginTop = (LOGO_MARGIN_TOP_START_EM + (LOGO_MARGIN_TOP_END_EM - LOGO_MARGIN_TOP_START_EM) * progress) + 'em';
    logoLink.style.marginBottom = (LOGO_MARGIN_BOTTOM_END_EM * progress) + 'em';

    if (rightBlock) {
      if (!header.__rightMarginTopExpandedPx || header.__rightMarginTopExpandedPx < 0) {
        header.__rightMarginTopExpandedPx = parseFloat(window.getComputedStyle(rightBlock).marginTop) || 0;
      }

      var headerHeight = header.getBoundingClientRect().height;
      var rightHeight = rightBlock.getBoundingClientRect().height;
      var centerMarginTopPx = Math.max(0, (headerHeight - rightHeight) / 2);
      var expandedMarginPx = header.__rightMarginTopExpandedPx;
      var currentRightMarginTopPx = expandedMarginPx * (1 - progress) + centerMarginTopPx * progress;
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
    var header = document.querySelector('header.main-header') || document.querySelector('header');
    if (!header) return;

    header.classList.remove('is-hidden');
    header.classList.add('is-fixed-on-case');
    reserveHeaderSpace(header);
    header.__logoExpandedPx = 0;
    header.__rightMarginTopExpandedPx = -1;
    syncHeaderLogoScale(header);

    var lastScrollY = window.scrollY || 0;

    function isFooterVisible() {
      var footer = document.querySelector('.site-footer');
      if (!footer) return false;
      var rect = footer.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh && rect.bottom > 0;
    }

    function syncHeaderVisibility(header) {
      if (header.classList.contains('is-menu-open')) {
        header.classList.remove('is-hidden');
        return;
      }

      var y = window.scrollY || 0;
      var goingUp = y < lastScrollY - 1;
      lastScrollY = y;

      if (isFooterVisible() && !goingUp) {
        header.classList.add('is-hidden');
        return;
      }

      header.classList.remove('is-hidden');
    }

    function onScroll() {
      syncHeaderLogoScale(header);
      syncHeaderVisibility(header);
    }

    if (!header.__compactScrollBound) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () {
        header.__logoExpandedPx = 0;
        header.__rightMarginTopExpandedPx = -1;
        reserveHeaderSpace(header);
        syncHeaderLogoScale(header);
        syncHeaderVisibility(header);
      });
      header.__compactScrollBound = true;
    }

    syncHeaderVisibility(header);
  }

  initHeaderScroll();
  document.addEventListener('site:header-ready', initHeaderScroll);
})();
