(function () {
  'use strict';

  var words = document.querySelectorAll('.quote-word');
  if (!words.length) return;

  var suppressHideUntil = 0;
  var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var activeWord = null;
  var activeTooltip = null;

  // Tooltip text values per language.
  var tooltipByLang = {
    ru: {
      food: 'Делаем визуалы с KFC, I’m, Subway, Papa Johns, Pizza Hut для межнара Яндекс Еды и Yango. До этого 3 года запускали новинки в Додо Пицце — всё снимали вживую, ещё до нейронок. Сейчас можем сочно показать еду и на съемке и в генерации.',
      communications: 'Сделали 114 проектов для Яндекса, 6 айдентик, 2 сайта, 2 упаковки и 2 аудита для других наших клиентов.',
      corporateExperience: 'За плечами фаундеров 4 года в инхаусе Dodo Brands и год студийной работы с Яндексом. Понимаем корпоративные процессы, чувствуем гайды, предлагаем улучшения, быстро попадаем в результат.',
      systematicInvolved: 'Заморачиваемся над результатом. Отвечаем в пятницу вечером. Чётко расписываем проект по этапам и держим в курсе статусов. Если выбиваемся, предупреждаем и предлагаем решения.',
      vibe: 'Всё это мы слышим от наших клиентов: оунеров, продюсеров и артдиров, с которыми мы работали и работаем.',
      teamHiring:
        'Раз в несколько месяцев мы проводим итерационный подбор. Публикуем вакансии в профильных каналах, тщательно отсматриваем кандидатов. Иногда сами пишем дизайнерам, если находим интересные работы.\n\n' +
        'В работах интересует баланс между красотой и реальностью. Важно, чтобы проекты были стильными, современными, приятными, но при этом жизнеспособными.\n\n' +
        'В плане коммуникации, мы подбираем людей, близких нам по вайбу: открытых, спокойных, понятных, умеющих обсуждать решения, вести диалог и работать в команде.\n\n' +
        'Ещё один важный критерий — вовлечённость. Мы смотрим, насколько человек готов включаться в задачу, быстро реагировать, брать ответственность и действительно проживать проект, а не бездумно выполнять задачи, как по промптам.'
    },
    en: {
      food: 'We create visuals with KFC, I’m, Subway, Papa Johns, and Pizza Hut for Yandex Eats and Yango international markets. Before that, we spent 3 years launching new products at Dodo Pizza. We shot everything live, even before neural tools. Now we can make food look delicious both in production shoots and in generative workflows.',
      communications: 'We delivered 114 projects for Yandex, plus 6 brand identities, 2 websites, 2 packaging projects, and 2 audits for our other clients.',
      corporateExperience: 'The founders have 4 years of in-house experience at Dodo Brands and one year of studio work with Yandex. We understand corporate processes, feel comfortable with brand guidelines, suggest improvements, and get to strong results quickly.',
      systematicInvolved: 'We care about details. We reply on Friday evenings. We meet deadlines and respond quickly. We break projects down into clear stages and keep everyone updated on statuses. If something shifts, we warn early and offer solutions.',
      vibe: 'This is exactly what we hear from our clients: owners, producers, and art directors we have worked and continue to work with.',
      teamHiring:
        'Every few months we run an iterative hiring round. We post vacancies in specialist channels and carefully review candidates. Sometimes we write to designers ourselves if we find interesting work.\n\n' +
        'In the work, we look for a balance between beauty and reality. Projects should be stylish, contemporary, and pleasant — and also viable.\n\n' +
        'On communication, we look for people close to us in vibe: open, calm, clear, able to discuss decisions, hold a conversation, and work as a team.\n\n' +
        'Another important criterion is involvement. We look at how ready someone is to dive into the task, react quickly, take responsibility, and actually live the project — not mindlessly execute tasks like prompts.'
    }
  };

  function getCurrentLang() {
    var attrLang = document.documentElement.getAttribute('data-lang');
    if (attrLang === 'en' || attrLang === 'ru') return attrLang;
    return 'ru';
  }

  function getTooltipForWord(wordEl) {
    var wrapper = wordEl.closest('.ids__wrapper') || document.body;
    return wrapper.querySelector('.quote-tooltip');
  }

  function resetTooltipPosition(tooltip) {
    tooltip.style.left = '';
    tooltip.style.top = '';
  }

  function hideTooltip() {
    if (Date.now() < suppressHideUntil) return;
    if (activeWord) activeWord.classList.remove('is-active');
    if (activeTooltip) {
      var tooltip = activeTooltip;
      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('aria-hidden', 'true');

      var cleared = false;
      function clearPosition() {
        if (cleared || tooltip.classList.contains('is-visible')) return;
        cleared = true;
        resetTooltipPosition(tooltip);
      }

      tooltip.addEventListener(
        'transitionend',
        function onEnd(event) {
          if (event.propertyName !== 'opacity') return;
          tooltip.removeEventListener('transitionend', onEnd);
          clearPosition();
        }
      );
      window.setTimeout(clearPosition, 520);
    }
    activeWord = null;
    activeTooltip = null;
  }

  function showTooltip(wordEl) {
    var tooltip = getTooltipForWord(wordEl);
    if (!tooltip) return;
    var tooltipText = tooltip.querySelector('.quote-tooltip__text');
    if (!tooltipText) return;

    var key = wordEl.getAttribute('data-quote-key');
    var lang = getCurrentLang();
    var dict = tooltipByLang[lang] || tooltipByLang.ru;
    var content = dict[key];
    if (!content) return;

    if (activeWord && activeWord !== wordEl) activeWord.classList.remove('is-active');
    if (activeTooltip && activeTooltip !== tooltip) {
      activeTooltip.classList.remove('is-visible');
      activeTooltip.setAttribute('aria-hidden', 'true');
    }

    wordEl.classList.add('is-active');
    activeWord = wordEl;
    activeTooltip = tooltip;
    tooltipText.textContent = content;

    var container = tooltip.offsetParent || document.body;
    var containerRect = container.getBoundingClientRect();
    var wordRect = wordEl.getBoundingClientRect();
    var tooltipWidth = tooltip.offsetWidth || 0;
    var placeAside = tooltip.classList.contains('quote-tooltip--aside');
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var gapPx = (parseFloat(getComputedStyle(tooltipText).fontSize) || 16) * 0.06;
    var top;
    var left;
    var containerStyle = getComputedStyle(container);
    var containerPadLeft = parseFloat(containerStyle.paddingLeft) || 0;
    var containerPadRight = parseFloat(containerStyle.paddingRight) || 0;
    var minLeft = containerPadLeft;
    var maxLeft = containerRect.width - containerPadRight - tooltipWidth;

    if (placeAside && !isMobile) {
      var block =
        wordEl.closest('.founder-quote') ||
        wordEl.closest('.quote-words-root') ||
        wordEl;
      var blockRect = block.getBoundingClientRect();
      top = blockRect.top - containerRect.top;
      tooltip.style.left = '';
      tooltip.style.top = top + 'px';
    } else if (placeAside && isMobile) {
      // Absolute plaque centered in the quote block, nudged up so the trigger stays visible.
      var mobileBlock =
        wordEl.closest('.founder-quote') ||
        wordEl.closest('.quote-words-root') ||
        wordEl;
      var mobileBlockRect = mobileBlock.getBoundingClientRect();
      var tooltipHeight = tooltip.offsetHeight || 0;
      var nudgeUp = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) * 1.5;
      top =
        mobileBlockRect.top -
        containerRect.top +
        Math.max(0, (mobileBlockRect.height - tooltipHeight) / 2 - nudgeUp);
      tooltip.style.left = '';
      tooltip.style.top = top + 'px';
    } else {
      top = wordRect.bottom - containerRect.top + gapPx;
      left = wordRect.left - containerRect.left;

      if (maxLeft < minLeft) maxLeft = minLeft;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
  }

  words.forEach(function (wordEl) {
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
      suppressHideUntil = Date.now() + 800;
      var tooltip = getTooltipForWord(wordEl);
      var isSameActive =
        wordEl.classList.contains('is-active') &&
        tooltip &&
        tooltip.classList.contains('is-visible');
      if (isSameActive) {
        suppressHideUntil = 0;
        hideTooltip();
        return;
      }
      showTooltip(wordEl);
    });
  });

  if (supportsHover) {
    document.querySelectorAll('#interactive-quote, .quote-words-root').forEach(function (root) {
      root.addEventListener('mouseleave', hideTooltip);
    });
  }

  document.addEventListener('click', function (event) {
    if (!activeTooltip || !activeTooltip.classList.contains('is-visible')) return;
    var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    var clickedWord = target && target.closest && target.closest('.quote-word');
    var clickedTooltip = target && target.closest && target.closest('.quote-tooltip');
    if (clickedWord) return;
    if (clickedTooltip) {
      suppressHideUntil = 0;
      hideTooltip();
      return;
    }
    hideTooltip();
  });

  document.addEventListener('site:lang-changed', function () {
    if (!activeWord || !activeTooltip) return;
    showTooltip(activeWord);
  });
})();
