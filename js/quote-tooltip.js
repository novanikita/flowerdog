(function () {
  'use strict';

  var quote = document.getElementById('interactive-quote');
  var tooltip = document.getElementById('quote-tooltip');
  if (!quote || !tooltip) return;

  var tooltipText = tooltip.querySelector('.quote-tooltip__text');
  if (!tooltipText) return;

  // Text values are centralized here for easy updates.
  var tooltipByKey = {
    cool: 'У нас сильный артдирекшен и уровень в дизайне, ниже которого мы никогда не позволяем себе опускаться даже в рутинных задачах.',
    food: 'Знаем как показать продукт вкусно, на чём сделать акценты. Начали работать с едой в Додо Пицце в 2020 году. Снимали сцены для кей-вижуалов для промо новых пицц и других продуктов. Сейчас работаем с продуктовыми брендами, Яндекс Едой и Yango, делаем концепции, кей-вижи, видео-ролики и наружку с KFC, I’m, Subway, Papa Jones, Pizza Hut и другими крутыми ребятами.',
    communications: 'Разрабатывали кейвижуалы для флагманских продуктов в Додо Пицце и федеральным промо компаниям. За 2025 год сделали 92 проекта для межнара Яндекса. Можем принести концепцию кей-вижуала за 1 день. За неделю собираем доох и олв рекламные компании с озвучкой на 8 языках и тиражом на 200+ ресайзов.',
    corporateExperience: 'За плечами фаундеров 4 года в инхаусе Dodo Brands в роли дизайнера, артдира и продакта. Сейчас плотно работаем с Яндексом и Yango. Знаем как устроенны процессы внутри корпораций и как с ними взаимодействовать из вне.',
    systematic: 'На старте составляем понимание задачи, чтобы свериться и начать делать именно то что нужно делать. В начале проекта составляем план и держим в курсе статусов по ходу проекта. Если не успеваем, пишем как есть и передоговариваемся.',
    involved: 'Относимся к проектам так, как относились бы к ним работая в инхаусе. Нам важно чтобы результат соответствовал уровню дизайна в бренде или двигал его вперёд. Всегда выбираем заморочиться над деталями, когда есть возможность. Когда важно успеть в моменте, можем залипнуть до 10 вечера или на выходных.',
    vibe: 'Клиенты говорят, что с нами хорошо. Мы всегда на связи, делаем быстро и аккуратно, не пропадаем. Держим в курсе статусов по проектам, делаем быстро. Вовлекаемся в процесс, предлагаем варианты, делаем с душой.'
  };

  function hideTooltip() {
    var active = quote.querySelector('.quote-word.is-active');
    if (active) active.classList.remove('is-active');
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function showTooltip(wordEl) {
    var key = wordEl.getAttribute('data-quote-key');
    var content = tooltipByKey[key];
    if (!content) return;

    var prev = quote.querySelector('.quote-word.is-active');
    if (prev && prev !== wordEl) prev.classList.remove('is-active');
    wordEl.classList.add('is-active');

    tooltipText.textContent = content;

    var container = tooltip.offsetParent || document.body;
    var containerRect = container.getBoundingClientRect();
    var quoteRect = quote.getBoundingClientRect();
    var wordRect = wordEl.getBoundingClientRect();
    var tooltipHeight = tooltip.offsetHeight || 0;
    var tooltipWidth = tooltip.offsetWidth || 0;

    // Place tooltip above the hovered word.
    // Align tooltip bottom close to the word top so it visually sits “over” the word.
    var gapPx = (parseFloat(getComputedStyle(tooltipText).fontSize) || 16) * 0.06;
    var top = wordRect.top - containerRect.top - tooltipHeight - gapPx;
    // No need to clamp `top` to quote boundaries: keeping it above the word is priority.

    // Align tooltip from the left edge of the word (not centered).
    var left = wordRect.left - containerRect.left;
    var minLeft = quoteRect.left - containerRect.left;
    var maxLeft = quoteRect.right - containerRect.left - tooltipWidth;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
  }

  quote.querySelectorAll('.quote-word').forEach(function (wordEl) {
    wordEl.addEventListener('mouseenter', function () {
      showTooltip(wordEl);
    });

    wordEl.addEventListener('mouseleave', function () {
      hideTooltip();
    });
  });

  quote.addEventListener('mouseleave', hideTooltip);
})();
