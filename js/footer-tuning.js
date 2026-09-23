/*
 * Tuning panel for the footer reveal. Loaded by js/footer-include.js on
 * local copies of the site only, never on flowerdog.studio. Every slider
 * changes a value in the reveal's CONFIG live, so the feel can be set by
 * eye; "Скопировать" produces the changed values to paste into a chat.
 * Changes are kept in localStorage between reloads; "Сбросить" clears.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'fd-footer-tuning';
  var FIELDS = [
    ['Ощущение'],
    ['arrival.maxPx', 'Подскок при доскролле, px', 0, 160, 2],
    ['arrival.perSpeed', 'Подскок — чувствительность к скорости', 0, 0.06, 0.002],
    ['springs.arrival.response', 'Подскок — период', 0.2, 1.2, 0.02],
    ['peekMax', 'Подглядывание, доля галереи', 0.2, 0.9, 0.05],
    ['wheelOpenPull', 'Толчок для открытия, px', 60, 400, 10],
    ['wheelPullRatePxPerS', 'Скорость толчка, px/с', 600, 3000, 100],
    ['autoCloseMs', 'Автозакрытие, мс', 500, 6000, 100],
    ['slideIntervalMs', 'Смена картинок, мс', 80, 1000, 20],
    ['rubberC', 'Сопротивление растяжения', 0.2, 1, 0.05],
    ['maxLiftRatio', 'Макс. подъём, доля экрана', 0.5, 1, 0.05],
    ['Пружины: период, с / затухание / толчок'],
    ['springs.open.response', 'Открытие — период', 0.2, 1, 0.02],
    ['springs.open.damping', 'Открытие — затухание', 0.5, 1, 0.02],
    ['springs.cancel.response', 'Возврат подглядывания — период', 0.2, 1, 0.02],
    ['springs.close.response', 'Закрытие свайпом — период', 0.3, 1.5, 0.02],
    ['springs.close.damping', 'Закрытие свайпом — затухание', 0.5, 1, 0.02],
    ['springs.close.kick', 'Закрытие свайпом — толчок', 0, 4, 0.1],
    ['springs.autoClose.response', 'Автозакрытие — период', 0.3, 1.5, 0.02],
    ['springs.autoClose.damping', 'Автозакрытие — затухание', 0.5, 1, 0.02],
    ['springs.autoClose.kick', 'Автозакрытие — толчок', 0, 4, 0.1],
    ['springs.follow.response', 'Слежение за вводом — период', 0.05, 0.4, 0.01],
    ['Касания'],
    ['touchOpenAt', 'Порог открытия пальцем, доля', 0.1, 0.8, 0.05],
    ['touchCloseAt', 'Порог закрытия пальцем, доля', 0.5, 1, 0.05],
    ['touchFlingPxPerS', 'Флик, px/с', 200, 1500, 50],
    ['touchNearEndPx', 'Зона захвата у конца, px', 0, 300, 10]
  ];

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }

  function set(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    var target = keys.reduce(function (o, k) { return o[k]; }, obj);
    target[last] = value;
  }

  function readStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function writeStored(values) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch (e) {}
  }

  /*
   * Frame pacing, so a "feels like a lower framerate" can be looked at
   * instead of guessed: the rate over the last half second, the worst gap
   * between frames in the last two seconds, and whether the footer's
   * listeners are armed right now (they make the browser wait on this
   * script before scrolling, which is the first thing to suspect).
   */
  function startFpsMeter(node) {
    var frames = [];
    var worst = [];
    var last = 0;
    var shownAt = 0;

    function tick(now) {
      if (last) {
        var gap = now - last;
        frames.push(now);
        worst.push({ t: now, gap: gap });
        while (frames.length && now - frames[0] > 500) frames.shift();
        while (worst.length && now - worst[0].t > 2000) worst.shift();
        if (now - shownAt > 250) {
          shownAt = now;
          var span = frames.length > 1 ? (frames[frames.length - 1] - frames[0]) / 1000 : 0;
          var rate = span > 0 ? Math.round((frames.length - 1) / span) : 0;
          var peak = worst.reduce(function (max, f) { return Math.max(max, f.gap); }, 0);
          var armed = document.documentElement.classList.contains('is-footer-near');
          node.innerHTML = '<b>' + rate + '</b> к/с · худший кадр ' + Math.round(peak) + ' мс · подвал ' + (armed ? 'рядом' : 'далеко');
          node.classList.toggle('is-low', rate > 0 && rate < 50);
        }
      }
      last = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function build(config) {
    var defaults = JSON.parse(JSON.stringify(config));
    var stored = readStored();
    Object.keys(stored).forEach(function (path) { set(config, path, stored[path]); });

    var style = document.createElement('style');
    style.textContent =
      '.fd-tune{position:fixed;top:8px;left:8px;z-index:2147483647;font:13px/1.3 -apple-system,system-ui,sans-serif;color:#111}' +
      '.fd-tune__toggle{padding:6px 10px;border:0;border-radius:999px;background:#0056d3;color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
      '.fd-tune__fps{margin-left:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.15);font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.fd-tune__fps.is-low{background:#ffd7d7}' +
      '.fd-tune__fps b{font-weight:700}' +
      '.fd-tune__body{display:none;margin-top:6px;width:min(320px,calc(100vw - 16px));max-height:min(70vh,560px);overflow:auto;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 8px 30px rgba(0,0,0,.18);backdrop-filter:blur(8px)}' +
      '.fd-tune.is-open .fd-tune__body{display:block}' +
      '.fd-tune__head{margin:10px 0 4px;font-weight:700;opacity:.55;text-transform:uppercase;font-size:11px;letter-spacing:.04em}' +
      '.fd-tune__row{display:grid;grid-template-columns:1fr 52px;gap:2px 8px;align-items:center;margin:6px 0}' +
      '.fd-tune__row label{grid-column:1/3;font-size:12px}' +
      '.fd-tune__row input[type=range]{width:100%;margin:0}' +
      '.fd-tune__row output{font-variant-numeric:tabular-nums;text-align:right;font-size:12px}' +
      '.fd-tune__row.is-changed label{color:#0056d3;font-weight:600}' +
      '.fd-tune__actions{display:flex;gap:8px;margin-top:12px}' +
      '.fd-tune__actions button{flex:1;padding:8px;border:1px solid #0056d3;border-radius:8px;background:#fff;color:#0056d3;font:inherit;cursor:pointer}' +
      '.fd-tune__out{width:100%;height:110px;margin-top:8px;font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre;display:none}' +
      '.fd-tune__out.is-shown{display:block}';
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.className = 'fd-tune';
    var toggle = document.createElement('button');
    toggle.className = 'fd-tune__toggle';
    toggle.type = 'button';
    toggle.textContent = 'Подвал: настройки';
    var fps = document.createElement('span');
    fps.className = 'fd-tune__fps';
    fps.textContent = '…';
    var body = document.createElement('div');
    body.className = 'fd-tune__body';
    root.appendChild(toggle);
    root.appendChild(fps);
    root.appendChild(body);
    startFpsMeter(fps);

    toggle.addEventListener('click', function () { root.classList.toggle('is-open'); });

    var rows = [];

    FIELDS.forEach(function (field) {
      if (field.length === 1) {
        var head = document.createElement('div');
        head.className = 'fd-tune__head';
        head.textContent = field[0];
        body.appendChild(head);
        return;
      }
      var path = field[0];
      var row = document.createElement('div');
      row.className = 'fd-tune__row';
      var label = document.createElement('label');
      label.textContent = field[1];
      var input = document.createElement('input');
      input.type = 'range';
      input.min = field[2];
      input.max = field[3];
      input.step = field[4];
      input.value = get(config, path);
      var output = document.createElement('output');
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(output);
      body.appendChild(row);

      function refresh() {
        var value = get(config, path);
        output.textContent = String(Math.round(value * 1000) / 1000);
        input.value = value;
        row.classList.toggle('is-changed', value !== get(defaults, path));
      }

      input.addEventListener('input', function () {
        set(config, path, parseFloat(input.value));
        refresh();
        var changed = readStored();
        if (get(config, path) === get(defaults, path)) delete changed[path];
        else changed[path] = get(config, path);
        writeStored(changed);
      });

      rows.push(refresh);
      refresh();
    });

    var actions = document.createElement('div');
    actions.className = 'fd-tune__actions';
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Скопировать';
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Сбросить';
    actions.appendChild(copy);
    actions.appendChild(reset);
    body.appendChild(actions);
    var out = document.createElement('textarea');
    out.className = 'fd-tune__out';
    out.readOnly = true;
    body.appendChild(out);

    copy.addEventListener('click', function () {
      var changed = readStored();
      var text = Object.keys(changed).length ? JSON.stringify(changed, null, 2) : '(ничего не менялось)';
      out.value = text;
      out.classList.add('is-shown');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
    });

    reset.addEventListener('click', function () {
      Object.keys(readStored()).forEach(function (path) { set(config, path, get(defaults, path)); });
      writeStored({});
      rows.forEach(function (refresh) { refresh(); });
      out.value = '';
      out.classList.remove('is-shown');
    });

    // Input over the panel is the panel's: it must never reach the sheet's
    // window listeners and lift the footer while a slider is being dragged.
    ['touchstart', 'touchmove', 'touchend', 'wheel', 'pointerdown'].forEach(function (type) {
      root.addEventListener(type, function (event) { event.stopPropagation(); }, { passive: true });
    });

    document.body.appendChild(root);
  }

  var tries = 0;
  (function wait() {
    if (window.footerRevealConfig) {
      build(window.footerRevealConfig);
    } else if (tries++ < 50) {
      setTimeout(wait, 100);
    }
  })();
})();
