/*
 * Tuning panel for the footer reveal. Loaded by js/footer-include.js on
 * local copies of the site only, never on flowerdog.studio.
 *
 * Nine sliders, one per thing a person actually feels — how easy it is to
 * open, how quickly it answers, how bouncy it is — rather than one per
 * value in the reveal's CONFIG. Each moves several of those values
 * together. Each starts where the feel was last settled, and in that
 * position reproduces exactly the values in js/footer-reveal.js — so
 * nothing changes until a slider is moved, and "Сбросить" comes back here. "Скопировать" lists the CONFIG values that came out
 * different, to paste into a chat; positions are kept in localStorage
 * between reloads, and "Сбросить" clears them.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'fd-footer-feel';

  // From a at t=0 through today's value b at t=mid to c at t=1.
  function along(a, b, c, t, mid) {
    var m = mid === undefined ? 0.5 : mid;
    return t <= m ? a + (b - a) * (t / m) : b + (c - b) * ((t - m) / (1 - m));
  }

  function round(value, places) {
    var f = Math.pow(10, places);
    return Math.round(value * f) / f;
  }

  /*
   * Each feel: a title, what the two ends mean, the range (natural units
   * where there is one, 0–1 otherwise), where today's values sit on it,
   * and how a position becomes CONFIG values. `base` is the CONFIG as it
   * was loaded, so scaling keeps today's proportions.
   */
  var FEELS = [
    ['Доскролл'],
    {
      id: 'bump', title: 'Подскок при доскролле', ends: ['нет', 'высокий'],
      min: 0, max: 120, step: 2, start: 108, unit: ' px',
      apply: function (c, v) {
        c.arrival.maxPx = v;
        // the same arrival speed reaches the ceiling, whatever it is
        c.arrival.perSpeed = round(v / 2400, 4);
      }
    },
    ['Открытие'],
    {
      id: 'ease', title: 'Открыть', ends: ['тяжело', 'легко'],
      min: 0, max: 1, step: 0.05, start: 0.05,
      apply: function (c, t) {
        c.wheelOpenAt = round(along(0.6, 0.35, 0.2, t), 3);
        c.wheelPullRatePxPerS = Math.round(along(1200, 2000, 3000, t));
        c.touchOpenAt = round(along(0.5, 0.3, 0.18, t), 3);
      }
    },
    {
      id: 'stages', title: 'Сильный толчок', ends: ['сначала подглядывает', 'открывает сразу'],
      min: 0, max: 1, step: 0.05, start: 0.65,
      apply: function (c, t) {
        c.peekMax = round(along(0.9, 0.8, 0.6, t), 3);
        c.wheelSnapOpen = round(along(1, 0.95, 0.5, t), 3);
      }
    },
    {
      id: 'answer', title: 'Отклик на тачпад', ends: ['мягко, с запаздыванием', 'мгновенно'],
      min: 0, max: 1, step: 0.05, start: 0.7,
      apply: function (c, t) {
        c.springs.follow.response = round(along(0.2, 0.12, 0.06, t), 3);
        c.pullHoldMs = Math.round(along(420, 280, 120, t));
        c.stretchHoldMs = Math.round(along(200, 120, 60, t));
      }
    },
    ['Движение'],
    {
      id: 'speed', title: 'Скорость движений', ends: ['медленно', 'быстро'],
      min: 0, max: 1, step: 0.05, start: 0.75,
      apply: function (c, t) {
        // fixed reference periods, not the ones in CONFIG: those are this
        // slider's own output, and scaling them again would compound
        var reference = { open: 0.4, cancel: 0.26, close: 0.7, autoClose: 1, arrival: 0.5 };
        var f = along(1.6, 1, 0.55, t);
        Object.keys(reference).forEach(function (name) {
          c.springs[name].response = round(reference[name] * f, 3);
        });
      }
    },
    {
      id: 'bounce', title: 'Пружинистость', ends: ['ровно', 'пружинит'],
      min: 0, max: 1, step: 0.05, start: 0.45,
      apply: function (c, t) {
        c.springs.open.damping = round(along(1, 0.7, 0.5, t), 3);
        c.springs.close.damping = round(along(1, 0.82, 0.6, t), 3);
        c.springs.autoClose.damping = round(along(1, 0.6, 0.45, t), 3);
      }
    },
    ['Открытый подвал'],
    {
      id: 'hold', title: 'Держится открытым', ends: ['', ''],
      min: 300, max: 5000, step: 100, start: 500, unit: ' мс',
      apply: function (c, v) { c.autoCloseMs = v; }
    },
    {
      id: 'stretch', title: 'Растяжение вверх', ends: ['нет', 'высоко и легко'],
      min: 0, max: 1, step: 0.05, start: 0,
      apply: function (c, t) {
        // 0 leaves the lift capped at the gallery height: no stretch at all
        c.maxLiftRatio = round(along(0, 0.8, 1, t, 0.6), 3);
        c.rubberC = round(along(0.3, 0.6, 0.9, t, 0.6), 3);
      }
    },
    {
      id: 'slides', title: 'Смена картинок', ends: ['', ''],
      min: 80, max: 600, step: 20, start: 260, unit: ' мс',
      apply: function (c, v) { c.slideIntervalMs = v; }
    }
  ];

  function readStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function writeStored(values) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch (e) {}
  }

  // Every leaf of a plain object, as dotted paths.
  function leaves(obj, prefix, out) {
    Object.keys(obj).forEach(function (key) {
      var path = prefix ? prefix + '.' + key : key;
      if (obj[key] && typeof obj[key] === 'object') leaves(obj[key], path, out);
      else out[path] = obj[key];
    });
    return out;
  }

  /*
   * Frame pacing, so a "feels like a lower framerate" can be looked at
   * instead of guessed: the rate over the last half second, the worst gap
   * between frames in the last two seconds, and whether the footer's
   * listeners are armed right now.
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
    var base = JSON.parse(JSON.stringify(config));
    var stored = readStored();
    var positions = {};

    var style = document.createElement('style');
    style.textContent =
      '.fd-tune{position:fixed;top:8px;left:8px;z-index:2147483647;font:13px/1.3 -apple-system,system-ui,sans-serif;color:#111}' +
      '.fd-tune__toggle{padding:6px 10px;border:0;border-radius:999px;background:#0056d3;color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
      '.fd-tune__fps{margin-left:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.15);font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.fd-tune__fps.is-low{background:#ffd7d7}' +
      '.fd-tune__fps b{font-weight:700}' +
      '.fd-tune__body{display:none;margin-top:6px;width:min(320px,calc(100vw - 16px));max-height:min(75vh,620px);overflow:auto;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 8px 30px rgba(0,0,0,.18);backdrop-filter:blur(8px)}' +
      '.fd-tune.is-open .fd-tune__body{display:block}' +
      '.fd-tune__head{margin:12px 0 2px;font-weight:700;opacity:.5;text-transform:uppercase;font-size:11px;letter-spacing:.04em}' +
      '.fd-tune__row{margin:10px 0}' +
      '.fd-tune__title{display:flex;justify-content:space-between;font-size:13px;font-weight:600}' +
      '.fd-tune__title output{font-weight:400;font-variant-numeric:tabular-nums;opacity:.7}' +
      '.fd-tune__row input[type=range]{width:100%;margin:4px 0 0}' +
      '.fd-tune__ends{display:flex;justify-content:space-between;font-size:11px;opacity:.55}' +
      '.fd-tune__row.is-changed .fd-tune__title{color:#0056d3}' +
      '.fd-tune__actions{display:flex;gap:8px;margin-top:14px}' +
      '.fd-tune__actions button{flex:1;padding:8px;border:1px solid #0056d3;border-radius:8px;background:#fff;color:#0056d3;font:inherit;cursor:pointer}' +
      '.fd-tune__out{width:100%;height:120px;margin-top:8px;font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre;display:none}' +
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

    FEELS.forEach(function (feel) {
      if (Array.isArray(feel)) {
        var head = document.createElement('div');
        head.className = 'fd-tune__head';
        head.textContent = feel[0];
        body.appendChild(head);
        return;
      }
      var row = document.createElement('div');
      row.className = 'fd-tune__row';
      var title = document.createElement('div');
      title.className = 'fd-tune__title';
      var name = document.createElement('span');
      name.textContent = feel.title;
      var output = document.createElement('output');
      title.appendChild(name);
      title.appendChild(output);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = feel.min;
      input.max = feel.max;
      input.step = feel.step;
      var ends = document.createElement('div');
      ends.className = 'fd-tune__ends';
      ends.innerHTML = '<span></span><span></span>';
      ends.children[0].textContent = feel.ends[0];
      ends.children[1].textContent = feel.ends[1];
      row.appendChild(title);
      row.appendChild(input);
      if (feel.ends[0] || feel.ends[1]) row.appendChild(ends);
      body.appendChild(row);

      function show() {
        var value = positions[feel.id];
        input.value = value;
        output.textContent = feel.unit ? value + feel.unit : '';
        row.classList.toggle('is-changed', value !== feel.start);
      }

      function setTo(value) {
        positions[feel.id] = value;
        feel.apply(config, value, base);
        show();
      }

      input.addEventListener('input', function () {
        setTo(parseFloat(input.value));
        var saved = readStored();
        if (positions[feel.id] === feel.start) delete saved[feel.id];
        else saved[feel.id] = positions[feel.id];
        writeStored(saved);
      });

      setTo(stored[feel.id] !== undefined ? stored[feel.id] : feel.start);
      rows.push({ feel: feel, setTo: setTo });
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
      var was = leaves(base, '', {});
      var now = leaves(config, '', {});
      var changed = {};
      Object.keys(now).forEach(function (path) { if (now[path] !== was[path]) changed[path] = now[path]; });
      var feels = readStored();
      var text = Object.keys(changed).length
        ? JSON.stringify({ feel: feels, config: changed }, null, 2)
        : '(ничего не менялось)';
      out.value = text;
      out.classList.add('is-shown');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
    });

    reset.addEventListener('click', function () {
      writeStored({});
      rows.forEach(function (r) { r.setTo(r.feel.start); });
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
