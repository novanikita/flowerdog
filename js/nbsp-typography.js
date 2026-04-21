(function () {
  'use strict';

  var NBSP = '\u00A0';

  var RU_WORDS =
    '(и|а|но|в|к|с|у|о|от|до|по|из|за|на|не|ни|об|со|ко|под|при|для)';
  var EN_WORDS =
    '(a|an|and|or|of|to|in|on|at|by|for|as|but|nor|yet|so|if)';

  var RU_RE = new RegExp('(^|[\\s(«"—–-])' + RU_WORDS + ' ([^\\s.,!?;:)"»])', 'gi');
  var EN_RE = new RegExp('(^|[\\s(«"—–-])' + EN_WORDS + ' ([^\\s.,!?;:)"»])', 'gi');

  function replaceInString(value) {
    if (!value || typeof value !== 'string') return value;
    var next = value.replace(RU_RE, function (_, prefix, word, nextChar) {
      return prefix + word + NBSP + nextChar;
    });
    next = next.replace(EN_RE, function (_, prefix, word, nextChar) {
      return prefix + word + NBSP + nextChar;
    });
    return next;
  }

  function normalizeTextNodes(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node || !node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var tag = parent.tagName;
        if (
          tag === 'SCRIPT' ||
          tag === 'STYLE' ||
          tag === 'NOSCRIPT' ||
          tag === 'CODE' ||
          tag === 'PRE' ||
          parent.isContentEditable
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) {
      var updated = replaceInString(node.nodeValue);
      if (updated !== node.nodeValue) {
        node.nodeValue = updated;
      }
    }
  }

  function normalizeI18nAttrs(root) {
    (root || document).querySelectorAll('[data-ru], [data-en]').forEach(function (el) {
      var ru = el.getAttribute('data-ru');
      var en = el.getAttribute('data-en');
      if (ru != null) {
        var nextRu = replaceInString(ru);
        if (nextRu !== ru) el.setAttribute('data-ru', nextRu);
      }
      if (en != null) {
        var nextEn = replaceInString(en);
        if (nextEn !== en) el.setAttribute('data-en', nextEn);
      }
    });
  }

  function apply() {
    normalizeI18nAttrs(document);
    normalizeTextNodes(document.body);
  }

  function init() {
    apply();

    document.addEventListener('site:header-ready', apply);
    document.addEventListener('site:projects-rendered', apply);
    document.addEventListener('click', function (e) {
      var switcher = e.target && e.target.closest ? e.target.closest('[data-lang-switch]') : null;
      if (!switcher) return;
      requestAnimationFrame(apply);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
