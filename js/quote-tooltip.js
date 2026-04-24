(function () {
  'use strict';

  var quote = document.getElementById('interactive-quote');
  var tooltip = document.getElementById('quote-tooltip');
  if (!quote || !tooltip) return;

  var tooltipText = tooltip.querySelector('.quote-tooltip__text');
  if (!tooltipText) return;
  var suppressHideUntil = 0;
  var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Tooltip text values per language.
  var tooltipByLang = {
    ru: {
      food: 'Делаем визуалы с KFC, I’m, Subway, Papa Jones, Pizza Hut для межнара Яндекс Еды и Yango. До этого 3 года запускали новинки в Додо Пицце — всё снимали вживую, ещё до нейронок. Сейчас можем сочно показать еду и на съемке и в генерации.',
      communications: 'Сделали 114 проектов для Яндекса, 6 айдентик, 2 сайта, 2 упаковки и 2 аудита для других наших клиентов.',
      corporateExperience: 'За плечами фаундеров 4 года в инхаусе Dodo Brands и год студийной работы с Яндексом. Понимаем корпоративные процессы, чувствуем гайды, предлагаем улучшения, быстро попадаем в результат.',
      systematicInvolved: 'Заморачиваемся над результатом. Отвечаем в пятницу вечером. Чётко расписываем проект по этапам и держим в курсе статусов. Если выбиваемся, предупреждаем и предлагаем решения.',
      vibe: 'Всё это мы слышим от наших клиентов: оунеров, продюсеров и артдиров, с которыми мы работали и работаем.'
    },
    en: {
      food: 'We create visuals with KFC, I’m, Subway, Papa Jones, and Pizza Hut for Yandex Eats and Yango international markets. Before that, we spent 3 years launching new products at Dodo Pizza. We shot everything live, even before neural tools. Now we can make food look delicious both in production shoots and in generative workflows.',
      communications: 'We delivered 114 projects for Yandex, plus 6 brand identities, 2 websites, 2 packaging projects, and 2 audits for our other clients.',
      corporateExperience: 'The founders have 4 years of in-house experience at Dodo Brands and one year of studio work with Yandex. We understand corporate processes, feel comfortable with brand guidelines, suggest improvements, and get to strong results quickly.',
      systematicInvolved: 'We care about details. We reply on Friday evenings. We meet deadlines and respond quickly. We break projects down into clear stages and keep everyone updated on statuses. If something shifts, we warn early and offer solutions.',
      vibe: 'This is exactly what we hear from our clients: owners, producers, and art directors we have worked and continue to work with.'
    }
  };

  function getCurrentLang() {
    var attrLang = document.documentElement.getAttribute('data-lang');
    if (attrLang === 'en' || attrLang === 'ru') return attrLang;
    return 'ru';
  }

  function hideTooltip() {
    if (Date.now() < suppressHideUntil) return;
    var active = quote.querySelector('.quote-word.is-active');
    if (active) active.classList.remove('is-active');
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function showTooltip(wordEl) {
    var key = wordEl.getAttribute('data-quote-key');
    var lang = getCurrentLang();
    var dict = tooltipByLang[lang] || tooltipByLang.ru;
    var content = dict[key];
    if (!content) return;

    var prev = quote.querySelector('.quote-word.is-active');
    if (prev && prev !== wordEl) prev.classList.remove('is-active');
    wordEl.classList.add('is-active');

    tooltipText.textContent = content;

    var container = tooltip.offsetParent || document.body;
    var containerRect = container.getBoundingClientRect();
    var wordRect = wordEl.getBoundingClientRect();
    var tooltipWidth = tooltip.offsetWidth || 0;

    // Place tooltip below the hovered word.
    // Align tooltip top close to the word bottom so it visually sits "under" the word.
    var gapPx = (parseFloat(getComputedStyle(tooltipText).fontSize) || 16) * 0.06;
    var top = wordRect.bottom - containerRect.top + gapPx;

    // Align tooltip from the left edge of the word (not centered).
    var left = wordRect.left - containerRect.left;
    var containerStyle = getComputedStyle(container);
    var containerPadLeft = parseFloat(containerStyle.paddingLeft) || 0;
    var containerPadRight = parseFloat(containerStyle.paddingRight) || 0;
    var minLeft = containerPadLeft;
    var maxLeft = containerRect.width - containerPadRight - tooltipWidth;

    if (maxLeft < minLeft) {
      maxLeft = minLeft;
    }

    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
  }

  quote.querySelectorAll('.quote-word').forEach(function (wordEl) {
    if (supportsHover) {
      wordEl.addEventListener('mouseenter', function () {
        showTooltip(wordEl);
      });

      wordEl.addEventListener('mouseleave', function () {
        hideTooltip();
      });
    }

    wordEl.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      // On mobile browsers, synthetic/cascading click events can arrive later
      // than the word click itself and immediately close the tooltip.
      suppressHideUntil = Date.now() + 800;
      var isSameActive = wordEl.classList.contains('is-active') && tooltip.classList.contains('is-visible');
      if (isSameActive) {
        suppressHideUntil = 0;
        hideTooltip();
        return;
      }
      showTooltip(wordEl);
    });
  });

  if (supportsHover) {
    quote.addEventListener('mouseleave', hideTooltip);
  }

  document.addEventListener('click', function (event) {
    if (!tooltip.classList.contains('is-visible')) return;
    var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    var clickedWord = target && target.closest && target.closest('.quote-word');
    var clickedTooltip = target && target.closest && target.closest('#quote-tooltip');
    if (clickedWord || clickedTooltip) return;
    hideTooltip();
  });
})();
