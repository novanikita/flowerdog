# FDS — flowerdog design system. Свод правил (черновик)

Статус: черновик для обсуждения, версия 0.1 от 13 октября 2026.
Это рабочий документ. Когда правила согласованы, по нему переписывается код,
а затем собирается страница `/design-system`. Пометка **[решить]** означает
вопрос, на который нужен ответ до правки кода.

---

## 1. Принятые решения

- Страница живёт в `design-system.html`, публикуется как `flowerdog.studio/design-system/`. Ссылок на неё с сайта нет, индексация открыта.
- Язык страницы русский. Имена классов, токенов и файлов английские.
- Префикс системы `fds`. Всё, что было `ids`, становится `fds`.
- Рефакторинг глубокий: единая схема имён, слияние дублей, удаление мёртвого кода, замена хаков общими правилами.
- Семантика заголовков приводится в порядок: один `h1` на страницу, дальше `h2`/`h3`/`h4` по смыслу. Внешний вид заголовка задаётся классом текстового стиля, а не уровнем тега.
- Каждый шаг рефакторинга отдельным коммитом. До и после каждого шага снимаются скриншоты всех страниц в двух ширинах и сравниваются.

---

## 2. Файлы

### 2.1. CSS

Одна точка входа и каскадные слои. Страница подключает один файл вместо десяти.

```
css/
  fds.css               точка входа: @layer + @import всего ниже
  fds-tokens.css        переменные: цвет, радиусы, движение, z-index, сетка
  fds-settings.css      шрифт Sona, плотность, резиновый размер шрифта   (было settings.css)
  fds-normalize.css     сброс                                             (было normalize.css)
  fds-layout.css        обёртки, спейсеры, сетки                          (было layout.css + сетки из project-cards.css)
  fds-text.css          теги и текстовые стили                            (было ids.css)
  fds-link.css          ссылки и их варианты                              (собрано из 6 мест)
  fds-chip.css          чипы                                              (было tags.css + project-tag-chip)
  fds-header.css        шапка, мобильное меню, переключатель языка        (было project-header.css)
  fds-footer.css        футер и reveal                                    (было project-footer.css)
  fds-card.css          карточка проекта, кнопка «ещё»                    (из project-cards.css)
  fds-person.css        карточка человека, аватары, кредиты               (из project-cards.css + project-misc.css)
  fds-step.css          карточка этапа процесса                           (из project-cards.css)
  fds-quote.css         цитата основателя, тултип термина                 (из project-cards.css + project-page.css)
  fds-gallery.css       галерея, figure, кнопка звука                     (было gallery.css + галерейная часть project-misc.css)
  fds-case.css          мета кейса, якоря                                 (из project-page.css)
  fds-transition.css    переход между страницами                          (было page-transition.css)
  design-system.css     только для страницы документации, префикс ds-
```

Слои в `fds.css`:

```css
@layer tokens, base, layout, text, components, pages, utilities;
```

Зачем слои: сейчас половина правил завёрнута в `.ids` ради специфичности,
хотя `.ids` стоит на каждом `body`. Со слоями порядок задаётся явно,
и обёртка `.ids` больше не нужна. Удаляются ещё и `project.css` с его
`@import` внутри и `project-vars.css`.

Все файлы пишутся в одном стиле: плоские селекторы, без вложенности `&`
(сейчас три файла с вложенностью, остальные плоские). **[решить]** Можно
наоборот, все с вложенностью. Плоские проще читать в diff.

### 2.2. JS

Файлы остаются, переименовывается только галерея и хуки:

| Было | Станет |
|---|---|
| `js/ids-gallery.js`, элемент `<ids-gallery>` | `js/fds-gallery.js`, элемент `<fds-gallery>` |
| `[data-site-header]`, `[data-site-footer]` | `[data-fds-header]`, `[data-fds-footer]` |
| ссылки на классы в JS | обновляются по карте из раздела 6 |

Остальные `data-*` хуки (`data-i18n`, `data-ru`, `data-en`, `data-client-tag`, `data-type-tags`, `data-cover-*`, `data-sound-*`, `data-lang-switch`) остаются как есть: это контент и поведение, а не стиль.

### 2.3. HTML

- `<body class="ids">` убирается. Скоуп страницы, где он нужен (`page-about`, `page-how-we-work`, `page-vacancies`), становится атрибутом `<html data-page="about">`.
- Инлайновые `style="margin-left: 0;"` на кейсах (10 штук) уходят в класс. Инлайновые `background-image` на карточках остаются: это контент.
- Партиалы `partials/header.html` и `partials/footer.html` переписываются на новые имена.
- Копии в `preview/<токен>/` пересобираются скриптом после правок.

---

## 3. Токены (`fds-tokens.css`)

### 3.1. Цвет

Два слоя: палитра и семантика. В компонентах используется только семантика.

Палитра:

```css
--fds-blue:   #0056d3;
--fds-orange: #ff6900;
--fds-white:  #ffffff;
```

Оттенки: только прозрачность палитры, через `color-mix`, чтобы не держать таблицу rgba:

```css
--fds-blue-50:   color-mix(in srgb, var(--fds-blue) 50%, transparent);
--fds-blue-20:   color-mix(in srgb, var(--fds-blue) 20%, transparent);
--fds-blue-10:   color-mix(in srgb, var(--fds-blue) 10%, transparent);
--fds-blue-5:    color-mix(in srgb, var(--fds-blue)  5%, transparent);
--fds-orange-50: color-mix(in srgb, var(--fds-orange) 50%, transparent);
--fds-orange-10: color-mix(in srgb, var(--fds-orange) 10%, transparent);
--fds-white-70:  color-mix(in srgb, var(--fds-white) 70%, transparent);
```

Семантика:

| Токен | Значение | Где |
|---|---|---|
| `--fds-text` | blue | весь текст, иконки, рамки |
| `--fds-text-muted` | blue-50 | роли, юридический блок |
| `--fds-accent` | orange | hover и активное состояние, цитата с акцентом |
| `--fds-accent-muted` | orange-50 | роль в акцентной цитате |
| `--fds-bg` | white | фон страницы, шапки, футера |
| `--fds-surface` | blue-10 | подложка карточек, чипов, кнопки, заглушка обложки |
| `--fds-surface-accent` | orange-10 | подложка при hover |
| `--fds-surface-faint` | blue-5 | фон `code` |
| `--fds-line` | blue-20 | подчёркивания ссылок, `hr` |
| `--fds-inverse-bg` | blue | мобильное меню, тултип, звуковая карточка |
| `--fds-inverse-text` | white | текст на синем |
| `--fds-shadow` | rgb(0 0 0 / 0.16) | тень листа над футером |

Правила:

1. Синий это чернила. Весь текст синий, чёрного на сайте нет.
2. Оранжевый только для реакции: hover, focus, активное состояние, и для акцентной цитаты. Оранжевым ничего не пишется в покое.
3. Оттенки только прозрачностью. Новых цветов нет.

Что меняется по пути:

- `--color-gray` сегодня не существует (см. раздел 9), использовался только в `aside` и `.project-date`. **[решить]** `aside` на `--fds-surface`, серый удалить.
- `--color-black-0` (на деле прозрачный синий) удаляется.
- Рамка `figure--bordered` `rgba(0,0,0,0.3)` единственное место с чёрным. **[решить]** Перевести на `--fds-blue-20` или оставить как исключение.

### 3.2. Типографика (`fds-settings.css`)

Как в IDS, без изменений:

```css
--fds-font: "Sona", sans-serif;      /* variable 100..900 */
--fds-density: 1.3;                  /* базовый интерлиньяж */
--fds-font-min-mobile: 14;  --fds-font-max-mobile: 32;
--fds-font-min-desktop: 11; --fds-font-max-desktop: 22.5;
--fds-viewport-min: 320; --fds-breakpoint: 768; --fds-viewport-max: 1500;
```

Размер шрифта `html` растёт линейно от 14px на 320px до 32px на 768px,
затем от 11px на 768px до 22.5px на 1500px и дальше не растёт. Все размеры
в системе задаются в `em` от этого значения. Это единственное место с `px`.

### 3.3. Радиусы

Шкала с двумя режимами: на мобиле те же токены меньше.

| Токен | Десктоп | Мобила | Где |
|---|---|---|---|
| `--fds-radius-xs` | 0.2em | 0.2em | `code`, `aside`, чип с рамкой |
| `--fds-radius-s` | 0.8em | 1em → **[решить]** | мелкие figure в галерее |
| `--fds-radius-m` | 1.4em | 1em | карточка проекта, figure L/XL, фото человека, тултип (сейчас 1em) |
| `--fds-radius-l` | 2em | 1.2em | карточка этапа, фото пространства, модификатор `--soft` |
| `--fds-radius-pill` | 100em | 100em | чипы-пилюли, кнопка, модификатор `--round` |

Сейчас в коде 19 разных значений, включая три записи пилюли (50em, 999px, 50%). Особые радиусы кейса Dodo (0.6, 0.4, 0.3, 0.25em) становятся модификатором `fds-figure--tight` с `--fds-radius-xs`. **[решить]** Готовы ли мы, что у Dodo углы станут 0.2em вместо 0.3..0.6.

### 3.4. Движение

| Токен | Значение | Где |
|---|---|---|
| `--fds-duration-fast` | 0.12s | полоска обложек |
| `--fds-duration-base` | 0.2s | hover, стрелки, фон карточки звука, мобильное меню (сейчас 0.18s) |
| `--fds-duration-slow` | 0.3s | скрытие шапки (сейчас 0.28s), выход страницы |
| `--fds-duration-enter` | 0.34s | вход страницы |
| `--fds-duration-lazy` | 0.5s | тултип, уход цвета |
| `--fds-ease-out` | cubic-bezier(0.22, 1, 0.36, 1) | появление |
| `--fds-ease-in` | cubic-bezier(0.4, 0, 0.2, 1) | исчезновение |
| `--fds-ease` | ease | всё остальное |

Правило: `prefers-reduced-motion: reduce` выключает всё, что двигается. Пружины футера живут в `js/footer-reveal.js` и описываются на странице как есть, в токены не выносятся.

### 3.5. Слои (z-index)

```css
--fds-z-reveal: 0;      /* панель с картинками под листом */
--fds-z-sheet: 1;       /* main и футер */
--fds-z-sound: 3;       /* кнопка звука на видео */
--fds-z-tip: 1000;      /* тултип */
--fds-z-header: 1100;
--fds-z-menu: 1200;     /* мобильное меню */
--fds-z-menu-top: 1300; /* логотип и крестик над меню */
```

### 3.6. Сетка и брейкпоинт

Один брейкпоинт. Мобила это `width <= 768px`, десктоп всё, что шире. Во всём коде пишется одинаково:

```css
@media (width <= 768px) { … }
```

Сейчас три записи (`max-width: 768px`, `width < 767px`, `min-width: 769px`) и ничейная зона 767..769px. Кастомный медиа `--ids__mobile` не объявлен и удаляется.

Отступы контейнера: `--fds-gutter: 1em` на десктопе, `0.5em` на мобиле. Сейчас встречаются 1em, 0.5em и `density * 0.6em`.

---

## 4. Именование

Схема: `fds-блок__элемент--модификатор`. Состояния `is-*` и `has-*` без префикса, их ставит JS. Страничный скоуп через `data-page`.

```html
<a class="fds-card fds-card--sound is-playing">
  <div class="fds-card__cover fds-card__cover--round"></div>
  <div class="fds-card__meta"> … </div>
</a>
```

Правила:

1. Блок называется по смыслу, а не по странице и не по человеку: `fds-quote--accent`, а не `founder-quote--max`; `fds-gallery`, а не `project-gallery--rangos`.
2. Размер это модификатор: `fds-wrap--l`, `fds-space--xl`, `fds-figure--xl`. Буквы строчные.
3. Нет селекторов по странице, клиенту или `data-client-tag`. Если компоненту нужно вести себя иначе, у него появляется модификатор.
4. Один компонент один файл.
5. Утилиты (`fds-desktop-only`, `fds-nowrap-mobile`) только в слое `utilities`, их список короткий.

**[решить]** Голые классы размеров IDS (`class="ids__space XL"`) компактнее, чем BEM (`class="fds-space fds-space--xl"`). Предлагаю BEM ради единообразия: 145 спейсеров и 91 обёртка переписываются sed-ом, руками их никто не трогает. Альтернатива: одноклассовая запись `fds-space-xl`, `fds-wrap-l` только для этих двух примитивов.

---

## 5. Типографика

### 5.1. Текстовые стили

Стиль задаётся классом, тег выбирается по смыслу. Любой стиль можно повесить на `h2`, `p` или `div`.

| Класс | Размер / интерлиньяж / вес | Мобила | Было |
|---|---|---|---|
| `fds-display` | 3em / 1 / 500 | 2em | `p.quote` |
| `fds-title` | 2em / 0.9 / 700 | 2em | `h1`, `h2` |
| `fds-heading` | 2em / 1.1 / 700 | 1.8em | заголовок карточки проекта (2em / 1.12) |
| `fds-subheading` | 1.5em / 1.18 / 700 | 1.5em | `h3` |
| `fds-lead` | 1.5em / 1.2 / 500 | 1.2em | `p.about`, `h1` на главной (500) |
| `fds-lead--s` | 1.3em / 1.2 / 500 | 1.1em | `.about` внутри цитаты основателя |
| `fds-body` | 1em / 1.3 / 400 | | `p` по умолчанию |
| `fds-body--tight` | 1em / 1.25 / 400 | 0.9em | био человека, текст этапа, описание меню, заметка в футере (1.15) |
| `fds-small` | 0.85em / 1.2 / 400 | | роль человека, `figcaption` (0.8), `h6` (0.8) |
| `fds-caption` | 0.7em / 1.2 / 400 | 0.6em | мета кейса, чипы, юридический блок (0.72), дата |
| `fds-label` | 0.95em / 1.2 / 500 | | ярлык и длительность этапа |

Кандидаты на схлопывание, где цифры чуть разъедутся **[решить]**:

- Заголовок этапа процесса 1.8em / 1.15 → `fds-heading` 2em / 1.1 или `fds-subheading`.
- Лид цитаты основателя 2em / 1.1 / 500 → `fds-heading` с весом 700, или свой модификатор `fds-heading--light`.
- Заметка в футере 1.15em → `fds-body--tight` 1em.
- Юридический блок 0.72em → `fds-caption` 0.7em.
- `h4` 1.1em, `h5` 1em, `h6` 0.8em uppercase сейчас не используются нигде. Удаляются из системы, `h4`+ выглядят как `fds-body` с весом 700.
- `h1.S`, `h1.XS`, `h2.XS`, `p.loud` не используются. Удаляются.

Крупные вещи вне шкалы, остаются свойствами компонента: логотип в шапке `clamp(3.4em, 13.2vw, 10em)`, пункты меню 1.5em / 800 (мобильное меню 2.5em), почта в футере `clamp(...) + 1em`.

### 5.2. Правила

- `strong` и `b` сейчас принудительно 400, а жирность делается классом `project-text-emphasis` (600). Станет наоборот: `strong` = 600, класс удаляется. Единственный `strong` в коде, в футере, уже 700 своим классом.
- Заголовок имеет `margin-bottom`, у текста `margin-bottom: density * 0.4em`. Вертикальный ритм между блоками задаётся спейсерами, а не марджинами компонентов. Правила вида `.ids :is(p, ul):has(+ .ids__space + .about-how-we-work-cta)` удаляются вместе с причиной.
- Неразрывные пробелы ставит `js/nbsp-typography.js`, в разметке `&nbsp;` только там, где скрипт не достаёт.
- Переносы строк в манифесте на главной задаются `<br>` и остаются.

### 5.3. Иерархия заголовков

| Страница | h1 | h2 | h3 |
|---|---|---|---|
| Главная | манифест (стиль `fds-lead`) | заголовки карточек проектов | |
| Проекты | «Проекты» (сейчас `h1` нет) | заголовки карточек | |
| О нас | «О нас» (сейчас 6 `h1` подряд) | Клиенты, Команда, Пространство, Как работаем, Аудит (стиль `fds-title`) | имена людей, пункты меню услуг |
| Кейс | название проекта | разделы кейса (сейчас `h3` с `id`) | подразделы |
| Как работаем | заголовок страницы (сейчас 2 `h1`) | разделы | заголовки этапов |
| Вакансии | «Вакансии» | каждая вакансия (сейчас `h3`) | |
| Аудит | заголовок | разделы | |

Везде: вордмарк в футере сейчас `<h1>`, становится `<div>`. Это второй `h1` на каждой странице сайта.

**[решить]** На «Проекты» и «О нас» `h1` показывать или прятать визуально (`fds-visually-hidden`)? Предлагаю показывать стилем `fds-title`, как на остальных страницах.

---

## 6. Карта переименований

Все 176 классов. «Удалить» означает, что класс не используется ни в HTML, ни в JS, либо его роль берёт другой класс.

### 6.1. Каркас

| Было | Станет |
|---|---|
| `body.ids` | удалить |
| `.ids__wrapper` | `.fds-wrap` (70%) |
| `.ids__wrapper.L` | `.fds-wrap--l` (100%) |
| `.ids__wrapper.S` | `.fds-wrap--s` (60%) |
| `.ids__wrapper.XS` | `.fds-wrap--xs` (50%) |
| `.main-page-text-fixed` (50%) | `.fds-wrap--xs` |
| `.main-page-intro` (72%) | `.fds-wrap` |
| `.main-page-header` (70%) | удалить |
| `.ids__text-width` | удалить |
| `.ids__space`, `.S` | `.fds-space`, `.fds-space--s` (одно и то же, 0.7em) |
| `.ids__space.XS / .M / .L / .XL` | `.fds-space--xs / --m / --l / --xl` |
| `.main-page` (обёртка шапки) | удалить, `[data-fds-header]` достаточно |
| `.ids__divider`, `hr.default` | `.fds-divider` |
| `.projects-grid` | `.fds-grid fds-grid--4` |
| `.projects-grid-item`, `.L`, `.XL` | `.fds-grid__item`, `--l` (2 колонки), `--xl` (все) |
| `.team-grid`, `.team-grid--extended`, `.team-grid-item` | `.fds-grid fds-grid--4 fds-grid--rows`, `.fds-grid__item` |
| `.process-cards` | `.fds-grid fds-grid--3 fds-grid--gap` |
| `.founder-quotes` | `.fds-grid fds-grid--2 fds-grid--gap-l` |
| `.space-images` | `.fds-grid fds-grid--2 fds-grid--gap` |
| `.menu-grid` | `.fds-grid fds-grid--4` |

Сетка одна: `fds-grid` с числом колонок `--2/--3/--4`, зазором `--gap` (0.5em) и `--gap-l` (2em), на мобиле все сетки схлопываются до 1 или 2 колонок по модификатору. **[решить]** Шесть сеток с разными зазорами в один компонент, или оставить сетку каждому компоненту.

### 6.2. Текст и утилиты

| Было | Станет |
|---|---|
| `p.quote` | `.fds-display` |
| `.quote--portraits` | `.fds-display--avatars` |
| `.quote--page`, `p.loud`, `h1.S`, `h1.XS`, `h2.XS` | удалить |
| `p.about` | `.fds-lead` |
| `.project-text-emphasis` | `<strong>` |
| `.project-case-text`, `.project-list` | удалить, ритм спейсерами |
| `.audit-break-desktop-only`, `.quote-break-desktop-only` | `.fds-desktop-only` |
| `.quote-word-nowrap-mobile` | `.fds-nowrap-mobile` |
| `.ids__figure__S/XS/XXS`, `figure.S/.XS/.XXS` | удалить (не используются) |
| `.how-we-work__title` | удалить (цвет и так синий) |
| `.how-we-work__section`, `.vacancies__section`, `h3[id]`, `.project-anchor` | `.fds-anchor` (только `scroll-margin-top`) |
| `.how-we-work__figure` | `.fds-figure` |

### 6.3. Ссылки (`fds-link.css`)

Сейчас «синяя ссылка с подчёркиванием, оранжевая при наведении» описана в шести местах, и у половины hover не оранжевый, а синий (по умолчанию `.ids a:hover` цвет не меняет).

| Было | Станет |
|---|---|
| `.ids a` | `a` в слое `text`: синий, подчёркивание `--fds-line`, при hover оранжевый |
| `.main-page-header__cta`, `.about-how-we-work-cta` | `.fds-link--cta` (подчёркивание сплошное), контейнер `.fds-cta` |
| `.project-anchor-link`, `.project-anchor-arrow` | `.fds-link--anchor`, `.fds-link__arrow` |
| `.project-case-link`, `.site-footer__link` | удалить, это обычная ссылка |
| `.site-footer__email` | `.fds-footer__email` (размер свой, цвета от `a`) |
| `.quote-word` | `.fds-term` (триггер тултипа) |
| `.main-page-text-fixed a:hover`, `.page-vacancies .ids__wrapper.S a:hover` | удалить, поведение становится общим |

**[решить]** Общее правило «любая ссылка при hover оранжевая» меняет поведение ссылок в кейсах и на «О нас», где сейчас hover ничего не делает. Предлагаю принять.

### 6.4. Чипы (`fds-chip.css`)

| Было | Станет |
|---|---|
| `.project-tag-chip`, `.project-promo-link .project-tags .tag` | `.fds-chip` (пилюля, `--fds-surface`) |
| `.tag` (с рамкой, рендерит `tags.js`) | `.fds-chip--outline` |
| `.project-tag-chip--soon` | `.fds-chip--soon` |
| `.project-tag-row`, `.project-tags`, `.project-header-tags` | `.fds-chips` |
| `style="margin-left: 0"` на `.project-tag-row` | удалить, у `.fds-chips` отступа нет |

### 6.5. Шапка (`fds-header.css`)

| Было | Станет |
|---|---|
| `header`, `.main-header` | `.fds-header` |
| `.main-header__left`, `__right`, `__nav`, `__link`, `__menu-toggle`, `__menu-line`, `__logo-image` | `.fds-header__left`, `__right`, `__nav`, `__link`, `__burger`, `__burger-line`, `__logo-image` |
| `.logo` | `.fds-header__logo` |
| `.lang-switcher`, `.lang-switcher__btn` | `.fds-lang`, `.fds-lang__btn` |
| `header.is-fixed-on-case` | `is-fixed` |
| `is-hidden`, `is-menu-open`, `.is-active` | без изменений |
| `body.has-mobile-menu-open` | `has-menu-open` |
| `[data-site-header]` | `[data-fds-header]` |

### 6.6. Футер (`fds-footer.css`)

| Было | Станет |
|---|---|
| `.site-footer` и все `__*` | `.fds-footer`, те же элементы: `__top`, `__contact`, `__email`, `__contact-note`, `__contact-lead`, `__nav`, `__nav-link`, `__legal`, `__legal-item`, `__legal-break`, `__brand`, `__flower`, `__wordmark` |
| `.site-footer-reveal__panel`, `__stage` | `.fds-reveal`, `.fds-reveal__stage` |
| `html.has-footer-reveal`, `is-sheet-moving`, `is-footer-near` | без изменений |
| `[data-site-footer]`, `[data-footer-reveal-script]` | `[data-fds-footer]`, `[data-fds-reveal-script]` |

### 6.7. Карточка проекта (`fds-card.css`)

| Было | Станет |
|---|---|
| `.project-promo-link`, `.menu-promo-link` | `.fds-card` |
| `.project-promo` | `.fds-card__cover` |
| `.project-promo-hard / -soft / -round`, `.team-promo-hard / -soft / -round` | `--hard`, `--soft`, `--round` на `__cover` и на `fds-person__photo` |
| `.project-promo--sound`, `.menu-promo-link--sound`, `.menu-sound-icon` | `.fds-card--sound`, `.fds-card__sound-icon` |
| `.project-cover-strip`, `__segment` | `.fds-card__strip`, `.fds-card__strip-segment` |
| `.project-promo-meta`, `.menu-promo-meta` | `.fds-card__meta`, `.fds-card__meta--stack` |
| `.project-promo-meta h2` | `.fds-card__title` (стиль `fds-heading`) |
| `.menu-item-desc` | `.fds-card__text` |
| `.projects-more-btn` | `.fds-button` (единственная кнопка на сайте) |
| `is-playing` | без изменений |

### 6.8. Люди (`fds-person.css`)

| Было | Станет |
|---|---|
| `.team-promo` | `.fds-person__photo` |
| `.team-meta`, `.team-name`, `.team-bio` | `.fds-person__meta`, `__name`, `__bio` |
| `.portreit`, `.portreit--zoom` | `.fds-avatar`, `--zoom` |
| `.portraits-inline`, `--start`, `__row`, `.portraits-gap` | `.fds-avatars`, `--start`, `__row` |
| `.project-team`, `__member`, `__role`, `__label` | `.fds-credits`, `__member`, `__role`, `__label` |

### 6.9. Этапы процесса (`fds-step.css`)

| Было | Станет |
|---|---|
| `.process-card` и `__header`, `__label`, `__duration`, `__illustration`, `__illustration--offset`, `__title`, `__text`, `__text-lead` | `.fds-step` и те же элементы |
| `.process-card--faded`, `__error` | удалить |

### 6.10. Цитата и тултип (`fds-quote.css`)

| Было | Станет |
|---|---|
| `.founder-quote`, `__content`, `__lead`, `__byline`, `__byline-text`, `__name`, `__role` | `.fds-quote` и те же элементы |
| `.founder-quote--max` | `.fds-quote--accent` |
| `.quote-tooltip`, `--wide`, `--aside`, `__text`, `is-visible` | `.fds-tip`, `--wide`, `--aside`, `__text`, `is-visible` |

### 6.11. Галерея (`fds-gallery.css`)

| Было | Станет |
|---|---|
| `<ids-gallery>`, `.ids__gallery` | `<fds-gallery>`, `.fds-gallery` |
| `.review` | `.fds-gallery--review` |
| `.project-gallery` | удалить (см. 7.3) |
| `.project-gallery--rangos / --lavatop / --dodo / --kim-chips / --toolpar` | удалить |
| `figure`, `figure.L`, `figure.XL` | `.fds-figure`, `--l`, `--xl` |
| `.project-figure--bordered`, `--logo`, `--soft-radius` | `.fds-figure--bordered`, `--logo`, `--tight` |
| `.video-sound-toggle`, `__icon`, `is-on` | `.fds-sound`, `__icon`, `is-on` |
| `video.has-sound-toggle`, `has-sound-on` | без изменений |

### 6.12. Кейс (`fds-case.css`)

| Было | Станет |
|---|---|
| `.project-meta-wrap`, `.project-meta`, `.project-date` | `.fds-meta`, `__item`, `__date` |
| `.page-about`, `.page-how-we-work`, `.page-vacancies` | `html[data-page="…"]`, и только если правило нельзя заменить модификатором |

### 6.13. Ложные срабатывания

`.css`, `.svg`, `.woff2`, `.default` в списке классов это куски `url()` и `hr.default`, не классы.

---

## 7. Что сливается и что умирает

### 7.1. Сливается

- Шесть описаний ссылки в одно (6.3).
- Три чипа в один (6.4).
- Модификаторы радиуса `hard/soft/round`, продублированные для проекта и человека, в один набор.
- Шесть сеток в одну (6.1, под вопросом).
- Четыре ширины текста (`main-page-header`, `main-page-text-fixed`, `main-page-intro`, `ids__wrapper.XS`) в размеры обёртки.
- Две утилиты «спрятать на мобиле» в одну.

### 7.2. Умирает

15 классов без единого использования: `.XS`, `.XXS`, `.ids__figure__S/XS/XXS`, `.ids__text-width`, `.loud`, `.main-page-header`, `.process-card--faded`, `.process-card__error`, `.project-anchor`, `.quote--page`, `.quote-break-desktop-only`, `.quote-word-nowrap-mobile`, а с ними `h4`..`h6`, `details`, `mark`, `blockquote`, `aside` как стилизованные теги **[решить]**: они из IDS, на сайте не встречаются. Предлагаю оставить `aside` и `blockquote` как часть системы (пригодятся в кейсах), остальное убрать.

Файлы: `project.css`, `project-vars.css`, `project-misc.css` исчезают, их содержимое расходится по компонентам.

Ещё: раздел «Что мы уже делали» на «О нас» стоит `hidden` с мая. Карточки меню услуг живут ради него. **[решить]** Удаляем раздел вместе с `fds-card--menu`, или он вернётся.

### 7.3. Хаки, которые заменяются правилом

- Галерея включается перечислением клиентов в `project-misc.css` (`[data-client-tag="yandex"] .project-gallery { display: block }`, 7 клиентов плюс 5 модификаторов по имени кейса). Станет: `.fds-gallery` видна всегда. Если где-то галерею прячут намеренно, там ставится `hidden`.
- `.ids__wrapper.S:has(> [hidden]) + .ids__wrapper.L:has(.project-gallery--kim-chips)` и подобные правила про отступы между скрытым текстом и галереей уходят: отступы спейсерами в разметке.
- Мобильные отступы «текст → картинка» через `:has(+ .ids__wrapper .project-gallery) > .ids__space.L:last-child` уходят: на мобиле спейсер перед галереей ставится `--s` в разметке. **[решить]** Либо спейсеры получают мобильные значения в токенах, и это правило становится честным (`--l` на мобиле меньше).
- `html[data-lang="en"]` правки размеров (4 места: чип в команде, перенос био, CTA, роль) остаются, но переезжают к своим компонентам.
- `!important` в шапке (3 места) убирается вместе с `.ids`-специфичностью.

---

## 8. Компоненты с поведением

На странице системы эти компоненты показываются живыми, с тем же JS, что и на сайте.

| Компонент | JS | Что делает |
|---|---|---|
| Шапка | `header-include.js`, `header-scroll.js` | подгружает партиал, прячет шапку при скролле вниз на кейсах, мобильное меню |
| Язык | `language.js`, `site-dictionary.js` | RU/EN по `data-ru`/`data-en`, память в `localStorage` |
| Чипы и фильтр | `tags.js`, `project-meta-tags.js` | рендер чипов по словарю, фильтрация проектов |
| Карточки проектов | `projects-data.js`, `projects-render.js`, `project-cover-hover.js` | данные, рендер, смена обложек при наведении, полоска |
| Галерея | `fds-gallery.js`, `image-loading-optimizer.js`, `video-viewport-autoplay.js` | custom element, ленивые картинки, автоплей и звук видео |
| Термины | `quote-tooltip.js` | тултип по наведению |
| Футер | `footer-include.js`, `footer-reveal.js`, `footer-tuning.js` | партиал, лист поднимается над картинками, панель настройки пружин |
| Переходы | `page-transition-prep.js`, `page-transition.js` | затухание между страницами |
| Типографика | `nbsp-typography.js` | неразрывные пробелы |

---

## 9. Баги, которые чинятся по пути

1. `//`-комментарии в `colors.css` и `project-header.css`. В CSS их нет, парсер выбрасывает декларацию до ближайшей `;`. Из-за этого `--color-gray` и `--color-white-30` не объявлены, а у `.lang-switcher__btn` пропал `background`.
2. `--ids__radius` и `--ids__micro-padding` используются в `details`, нигде не объявлены.
3. `@media (--ids__mobile)` не объявлен, блок игнорируется.
4. Второй `h1` на каждой странице (вордмарк в футере), шесть `h1` на «О нас», ни одного на «Проекты».
5. `.ids strong { font-weight: 400 }` гасит смысловую жирность.
6. Зона 767..769px без мобильных и без десктопных правил.

---

## 10. Страница `/design-system`

Собирается на новых классах, подключает `fds.css` и штатный JS, шапку и футер сайта. Своего только `design-system.css` с префиксом `ds-`: плашка цвета, таблица «класс | живой пример | токены», блок кода, липкая навигация по разделам слева, как в IDS.

Разделы:

1. Введение: что это, где лежит, правило «нет класса в системе, нет стиля на сайте», как добавить компонент.
2. Настройки: шрифт, плотность, резиновый размер, брейкпоинт.
3. Цвет: палитра, оттенки, семантика, правила.
4. Каркас: обёртки, спейсеры, сетка, живые примеры.
5. Типографика: таблица стилей с образцами, иерархия заголовков.
6. Элементы: ссылка и варианты, список, `aside`, `code`, `figure`, `hr`, аватар.
7. Компоненты: шапка, язык, чип, кнопка, карточка проекта, человек, этап, цитата, тултип, галерея, звук, мета кейса, CTA, футер.
8. Движение: токены, reduced-motion, переходы, reveal футера.
9. Контент: двуязычие, словарь тегов, именование картинок, `nbsp`.
10. Шаблоны страниц: скелеты главной, «О нас», кейса, портфолио, вакансии.
11. Changelog.

---

## 11. Порядок работы

Каждый пункт отдельный коммит. Перед пунктом 3 и после каждого пункта с 3 по 6 снимаются скриншоты всех страниц в 390px и 1440px и сравниваются попиксельно. Намеренные изменения (hover ссылок, радиусы Dodo, схлопнутые размеры) фиксируются списком заранее и проверяются глазами.

1. Этот документ и исключение `docs/` из сборки. Готово.
2. Скрипт скриншотов и эталонные снимки.
3. Токены и слои: `fds-tokens.css`, `fds.css`, починка `//`, замена вшитых значений переменными, единый брейкпоинт. Имена классов не трогаются. Снимки совпадают.
4. Переименование по карте из раздела 6, одним механическим проходом по CSS, HTML, JS и партиалам. Переименование файлов. Пересборка `preview/`. Снимки совпадают.
5. Слияния и удаления из раздела 7, хаки на правила. Снимки совпадают, кроме списка намеренных изменений.
6. Семантика заголовков, `strong`, инлайновые стили. Снимки совпадают.
7. `design-system.html` и `design-system.css`.
8. README и памятка: как добавлять новое.

---

## 12. Открытые вопросы, собранные вместе

1. Плоские селекторы или вложенность (2.1).
2. `aside` на `--fds-surface`, серый удалить (3.1).
3. Рамка `figure--bordered`: синяя или остаётся чёрной (3.1).
4. Мобильный `--fds-radius-s`: 0.8em или 1em (3.3).
5. Радиусы Dodo на 0.2em (3.3).
6. BEM для спейсеров и обёрток или одноклассовая запись (4).
7. Схлопывание размеров: заголовок этапа, лид цитаты, заметка футера, юридический блок (5.1).
8. `h1` на «Проекты» и «О нас» показывать или прятать (5.3).
9. Одна сетка или сетка у каждого компонента (6.1).
10. Hover всех ссылок оранжевый (6.3).
11. Какие теги IDS оставить: `aside`, `blockquote`, `details`, `mark`, `h4`..`h6` (7.2).
12. Скрытый раздел «Что мы уже делали» и карточки меню услуг (7.2).
13. Мобильные отступы перед галереей: спейсер в разметке или мобильные значения у спейсеров (7.3).
