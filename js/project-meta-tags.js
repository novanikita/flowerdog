// Auto-transform project metadata+tags on yandex.html.
// Turns: p.project-date "№97, 20.01.2025, Казахстан, Концепция, KV, ..." into:
//   p.project-meta (first 3 comma-separated parts)
//   div.project-tag-row (remaining parts as chips)
(function () {
  'use strict';

  var COUNTRY_RULES = [
    { re: /Казахстан/i, value: 'Казахстан' },
    { re: /Узбекистан/i, value: 'Узбекистан' },
    { re: /Таджикистан/i, value: 'Таджикистан' },
    { re: /Кыргызстан/i, value: 'Кыргызстан' },
    { re: /Беларус/i, value: 'Беларусь' },
    { re: /Груз/i, value: 'Грузия' },
    { re: /Армен/i, value: 'Армения' },
    { re: /Болив/i, value: 'Боливия' }
  ];

  function buildMetaParagraph(tokens) {
    var p = document.createElement('p');
    p.className = 'project-meta';

    tokens.forEach(function (t) {
      var span = document.createElement('span');
      span.textContent = t;
      p.appendChild(span);
    });

    return p;
  }

  function buildTagRow(tokens) {
    var row = document.createElement('div');
    row.className = 'project-tag-row';
    row.setAttribute('aria-label', 'Project tags');

    tokens.forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'project-tag-chip';
      chip.textContent = t;
      row.appendChild(chip);
    });

    return row;
  }

  function extractCountryFromText(text) {
    if (!text) return '';
    for (var i = 0; i < COUNTRY_RULES.length; i++) {
      var rule = COUNTRY_RULES[i];
      if (rule.re.test(text)) return rule.value;
    }
    return '';
  }

  function transformCombinedFormat(dateEl) {
    // Transform p.project-date when it already contains:
    // "№xx, дата, страна, тег1, тег2, ..."
    var raw = (dateEl && dateEl.textContent ? dateEl.textContent : '').trim();
    if (!raw) return false;
    if (!raw.startsWith('№')) return false;
    if (raw.indexOf(',') === -1) return false;

    var parts = raw
      .split(',')
      .map(function (s) {
        return (s || '').trim();
      })
      .filter(Boolean);

    if (parts.length < 4) return false;

    var metaTokens = parts.slice(0, 3);
    var tagTokens = parts.slice(3);
    if (!metaTokens.length) return false;

    var parent = dateEl.parentNode;
    if (!parent) return false;

    var metaEl = buildMetaParagraph(metaTokens);
    var tagRowEl = buildTagRow(tagTokens);

    parent.insertBefore(metaEl, dateEl);
    parent.insertBefore(tagRowEl, dateEl);
    dateEl.remove();
    return true;
  }

  function transformSplitFormat(dateEl) {
    // Fallback:
    // dateEl is p.project-date with only date (e.g. "20.01.2025")
    // and number+title are in the next <p> as:
    // <code class="project-number">№xx</code> ...text...
    var raw = (dateEl && dateEl.textContent ? dateEl.textContent : '').trim();
    if (!raw) return false;
    if (raw.indexOf(',') !== -1) return false;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return false;

    // Avoid re-processing already converted blocks.
    var prev = dateEl.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('project-meta')) return false;

    var nextP = dateEl.nextElementSibling;
    if (!nextP || nextP.tagName !== 'P') return false;

    var codeEl = nextP.querySelector('code.project-number');
    if (!codeEl) return false;

    var numberText = (codeEl.textContent || '').trim();
    if (!numberText) return false;

    var containerText = nextP.textContent || '';
    var country = extractCountryFromText(containerText);

    var parent = dateEl.parentNode;
    if (!parent) return false;

    // Remove number from the description paragraph (since it becomes part of project-meta).
    codeEl.remove();
    // Important: do not reassign `textContent` here.
    // The `<p>` may contain additional markup (links/media/etc.) and `textContent`
    // would strip it. We only remove the `<code>` number element.

    var metaTokens = [numberText, raw];
    if (country) metaTokens.push(country);
    else metaTokens.push('—'); // Keep 3-token layout for consistent spacing.

    var metaEl = buildMetaParagraph(metaTokens);
    // Tags are not present in the split format yet; render empty row as a base.
    var tagRowEl = buildTagRow([]);

    parent.insertBefore(metaEl, dateEl);
    parent.insertBefore(tagRowEl, dateEl);
    dateEl.remove();
    return true;
  }

  function init() {
    var items = document.querySelectorAll('p.project-date');
    if (!items || !items.length) return;

    items.forEach(function (p) {
      // 1) If date line is already in combined "№, date, country, tags..." format -> convert.
      if (transformCombinedFormat(p)) return;
      // 2) Otherwise try split fallback: date-only + next <p> with code.project-number.
      transformSplitFormat(p);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

