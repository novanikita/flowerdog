(function () {
  'use strict';

  var CONFIG = {
    autoCloseMs: 2000,
    slideIntervalMs: 200,
    imageCount: 13,
    imagePath: 'images/footer-animation/footer-',

    endTolerancePx: 2,
    scrollAwayPx: 64,
    resizeAwayPx: 120,

    // Wheel and trackpad. Pull is measured in wheel-delta px.
    streamGapMs: 160,
    wheelOpenPull: 170,
    wheelIsolatedGapMs: 30,
    wheelKickPull: 50,
    wheelPushesToOpen: 2,
    wheelPushWindowMs: 700,
    pullHoldMs: 280,
    peekMax: 0.55,
    catchFallingAt: 0.15,

    // Touch. Ratios are fractions of the gallery height.
    touchResistance: 0.55,
    touchPeekMax: 0.9,
    touchOpenAt: 0.3,
    touchCloseAt: 0.85,
    touchFlingPxPerS: 550, // finger speed, not sheet speed

    // Finger dragging past fully open. stretchMax is a fraction of the
    // overshoot allowance.
    stretchMax: 0.8,
    stretchResistance: 0.5,

    // response ≈ seconds per oscillation; damping 1 = no overshoot; kick =
    // starting speed, as a multiple of the remaining distance per second,
    // so a close starts moving at once instead of easing in from rest.
    springs: {
      follow: { response: 0.12, damping: 1, kick: 0 },
      open: { response: 0.46, damping: 0.78, kick: 0 },
      cancel: { response: 0.4, damping: 1, kick: 0 },
      close: { response: 0.7, damping: 0.82, kick: 2.5 },
      autoClose: { response: 0.85, damping: 0.8, kick: 2.2 }
    }
  };

  var html = document.documentElement;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function rubber(x, max, slope) {
    if (x <= 0 || max <= 0) return 0;
    return max * (1 - Math.exp(-x * slope / max));
  }

  function unrubber(value, max, slope) {
    if (value <= 0 || max <= 0) return 0;
    var ratio = Math.min(value / max, 0.999);
    return -max * Math.log(1 - ratio) / slope;
  }

  function maxScrollY() {
    return Math.max(0, html.scrollHeight - window.innerHeight);
  }

  function atEnd() {
    return window.scrollY >= maxScrollY() - CONFIG.endTolerancePx;
  }

  function wheelDeltaPx(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  // html has scroll-behavior: smooth (css/settings.css); these scrolls
  // must not animate. 'instant' as a scrollBy option is newer than the
  // browsers this has to work in, so the property is switched off inline.
  function instantScrollBy(delta) {
    var previous = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollBy(0, delta);
    html.style.scrollBehavior = previous;
  }

  function findTouch(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  function initReveal() {
    if (html.dataset.footerRevealInit === 'true') return;

    var slot = document.querySelector('[data-site-footer]');
    var footer = slot && slot.querySelector('.site-footer');
    var brand = footer && footer.querySelector('.site-footer__brand');
    var main = document.querySelector('main');
    if (!slot || !footer || !brand || !main) return;

    html.dataset.footerRevealInit = 'true';
    if (prefersReducedMotion()) return;
    html.classList.add('has-footer-reveal');

    var panel = document.createElement('div');
    panel.className = 'site-footer-reveal__panel';
    panel.setAttribute('aria-hidden', 'true');
    var measure = document.createElement('div');
    measure.className = 'site-footer-reveal__measure';
    panel.appendChild(measure);
    document.body.appendChild(panel);

    var galleryHeight = 0;
    var overshoot = 0;

    function measureSizes() {
      galleryHeight = measure.offsetHeight;
      overshoot = Math.max(0, panel.offsetHeight - galleryHeight);
    }

    measureSizes();

    // ---- pictures ----------------------------------------------------------

    var images = [];
    var imagesRequested = false;
    var slideIndex = 0;
    var slideTimer = 0;

    function requestImages() {
      if (imagesRequested) return;
      imagesRequested = true;
      for (var i = 1; i <= CONFIG.imageCount; i += 1) {
        var img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        if (i === 1) img.className = 'is-active';
        img.src = CONFIG.imagePath + (i < 10 ? '0' + i : String(i)) + '.avif';
        panel.appendChild(img);
        images.push(img);
        if (img.decode) img.decode().catch(function () {});
      }
    }

    function advanceSlide() {
      images[slideIndex].classList.remove('is-active');
      slideIndex = (slideIndex + 1) % images.length;
      images[slideIndex].classList.add('is-active');
    }

    function startSlides() {
      requestImages();
      if (slideTimer || images.length < 2) return;
      advanceSlide();
      slideTimer = window.setInterval(advanceSlide, CONFIG.slideIntervalMs);
    }

    function stopSlides() {
      if (!slideTimer) return;
      window.clearInterval(slideTimer);
      slideTimer = 0;
    }

    // ---- sheet state -------------------------------------------------------

    var y = 0; // px the sheet is lifted; drawn as |y|
    var v = 0;
    var phase = 'idle'; // idle | peek | open | closing
    var springName = 'cancel';
    var pulling = false; // wheel input is holding the sheet in a peek
    var pull = 0;
    var isolatedPushes = 0;
    var lastPushAt = -Infinity;
    var lastInputAt = 0;
    var liftScrollY = 0;

    var raf = 0;
    var lastFrameAt = 0;
    var autoCloseTimer = 0;
    var autoCloseScheduled = false;
    var stream = null;
    var lastWheelAt = -Infinity;
    var wheelEndTimer = 0;
    var touch = null;

    var armed = false;
    var nearEnd = false;

    function render() {
      // A fall onto the closed position is drawn mirrored (|y|), so an
      // underdamped spring toward 0 reads as the sheet bouncing off the end
      // of the page instead of sinking below it.
      var shown = Math.min(Math.abs(y), galleryHeight + overshoot);
      var dpr = window.devicePixelRatio || 1;
      shown = Math.round(shown * dpr) / dpr;
      if (shown === 0) {
        main.style.transform = '';
        slot.style.transform = '';
        return;
      }
      var value = 'translate3d(0,' + (-shown) + 'px,0)';
      main.style.transform = value;
      slot.style.transform = value;
    }

    function catchSheet() {
      if (y < 0) {
        y = -y;
        v = -v;
      }
    }

    function integrate(dt, target, spec) {
      var omega = 2 * Math.PI / spec.response;
      var k = omega * omega;
      var c = 2 * spec.damping * omega;
      var step = 1 / 240;
      while (dt > 0) {
        var s = dt < step ? dt : step;
        v += (-k * (y - target) - c * v) * s;
        y += v * s;
        dt -= s;
      }
    }

    function wake() {
      if (raf) return;
      lastFrameAt = performance.now();
      raf = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (!raf) return;
      window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(0.064, Math.max(0, (now - lastFrameAt) / 1000));
      lastFrameAt = now;

      if (touch && touch.owned) return;

      // An unfinished push holds for a beat, then springs back.
      if (pulling && now - lastInputAt > CONFIG.pullHoldMs) {
        pulling = false;
        pull = 0;
        phase = 'closing';
        springName = 'cancel';
      }

      var target = pulling
        ? rubber(pull, galleryHeight * CONFIG.peekMax, 1)
        : (phase === 'open' ? galleryHeight : 0);
      integrate(dt, target, pulling ? CONFIG.springs.follow : CONFIG.springs[springName]);

      // The open timer runs from the moment the pictures are fully in view,
      // not from when the spring has finished settling.
      if (phase === 'open' && !autoCloseScheduled && Math.abs(y) >= galleryHeight - 4) {
        scheduleAutoClose();
      }

      if (!pulling && Math.abs(Math.abs(y) - target) < 0.5 && Math.abs(v) < 10) {
        y = target;
        v = 0;
        render();
        if (phase === 'open') {
          if (!autoCloseScheduled) scheduleAutoClose();
        } else if (y === 0) {
          toIdle();
        }
        return;
      }

      render();
      raf = window.requestAnimationFrame(frame);
    }

    function beginMotion() {
      if (phase !== 'idle') return;
      liftScrollY = Math.min(window.scrollY, maxScrollY());
      html.classList.add('is-sheet-moving');
      startSlides();
    }

    function toIdle() {
      phase = 'idle';
      springName = 'cancel';
      pulling = false;
      pull = 0;
      y = 0;
      v = 0;
      clearAutoClose();
      stopSlides();
      html.classList.remove('is-sheet-moving');
      render();
      if (!nearEnd) disarm();
    }

    function hardReset() {
      stopLoop();
      window.clearTimeout(wheelEndTimer);
      wheelEndTimer = 0;
      touch = null;
      stream = null;
      toIdle();
    }

    function open() {
      catchSheet();
      phase = 'open';
      springName = 'open';
      pulling = false;
      pull = 0;
      isolatedPushes = 0;
      clearAutoClose();
      autoCloseScheduled = false;
      wake();
    }

    function close(name) {
      if (phase === 'idle' || (phase === 'closing' && springName === name)) return;
      catchSheet();
      phase = 'closing';
      springName = name;
      pulling = false;
      pull = 0;
      var kick = CONFIG.springs[name].kick;
      if (kick) v = Math.min(v, -kick * y);
      clearAutoClose();
      wake();
    }

    function scheduleAutoClose() {
      autoCloseScheduled = true;
      clearAutoClose();
      autoCloseTimer = window.setTimeout(function () {
        autoCloseTimer = 0;
        if (phase !== 'open') return;
        // A finger is on the screen: re-armed once it lifts.
        if (touch) {
          autoCloseScheduled = false;
          return;
        }
        close('autoClose');
      }, CONFIG.autoCloseMs);
    }

    function clearAutoClose() {
      if (!autoCloseTimer) return;
      window.clearTimeout(autoCloseTimer);
      autoCloseTimer = 0;
    }

    // ---- wheel & trackpad --------------------------------------------------

    /*
     * Momentum that carried the page to its end must not open anything —
     * that is the "you reached the end" moment. So a wheel stream only
     * pulls the sheet if it began while already at the end, or if a new
     * swipe clearly accelerates on top of a decaying momentum tail (macOS
     * cancels momentum the instant fingers touch the pad again, without a
     * gap in events).
     */
    function isFreshSwipe(recent, magnitude) {
      if (recent.length < 2 || magnitude < 6) return false;
      var a = recent[recent.length - 2];
      var b = recent[recent.length - 1];
      return b > a && magnitude > b && magnitude >= a * 1.8;
    }

    function beginPull() {
      beginMotion();
      catchSheet();
      var max = galleryHeight * CONFIG.peekMax;
      // Pushing at a sheet that is still well up — mid-fall, or already
      // peeked most of the way — is catching it: reopen outright.
      var caught = phase === 'closing' ? galleryHeight * CONFIG.catchFallingAt : max * 0.95;
      if (y >= caught) {
        open();
        return false;
      }
      pull = unrubber(y, max, 1);
      phase = 'peek';
      pulling = true;
      return true;
    }

    /*
     * A trackpad sends a continuous train of events (one per frame), a
     * wheel mouse one event per notch — and a notch can be as small as a
     * few px on macOS. So an event with a pause before it counts as a
     * discrete push: it gets a minimum visible peek, and two of them within
     * wheelPushWindowMs open the gallery, whatever their delta. Only the
     * first event of a trackpad train is isolated, so trackpads open on
     * distance instead.
     */
    function applyPush(delta, isolated, now) {
      if (!pulling && !beginPull()) return;
      pull += delta;
      if (isolated && delta >= 2) {
        if (pull < CONFIG.wheelKickPull) pull = CONFIG.wheelKickPull;
        if (now - lastPushAt > CONFIG.wheelPushWindowMs) isolatedPushes = 0;
        isolatedPushes += 1;
        lastPushAt = now;
      }
      lastInputAt = now;
      if (pull >= CONFIG.wheelOpenPull || isolatedPushes >= CONFIG.wheelPushesToOpen) {
        open();
        return;
      }
      wake();
    }

    /*
     * Gesture ownership. While the sheet is down, nothing is ever
     * cancelled: at the end of the page the browser has nowhere to scroll
     * (overscroll-behavior in css/project-footer.css keeps it from
     * bouncing), so the events can simply be read. While the sheet is
     * lifted, every event of a gesture is cancelled — including the
     * delta-less one Safari sends first: WebKit decides on that first
     * event whether the page owns the gesture, and if it goes through,
     * nothing later in that gesture can be cancelled.
     *
     * The flip side: a gesture the page has claimed is one the browser has
     * agreed not to scroll for, to its very end — momentum included, and
     * on a trackpad the next swipe often begins before that momentum has
     * died, so the stream can run on for as long as the user keeps
     * swiping. Once the sheet is down again, the remaining events of a
     * claimed stream are therefore scrolled here by hand; dropping them
     * left the page frozen until the user paused. An event the browser
     * has already made non-cancelable is its own to scroll and is never
     * touched.
     */
    function onWheel(event) {
      if (event.ctrlKey) return;

      var now = performance.now();
      var delta = wheelDeltaPx(event);
      if (Math.abs(event.deltaX) > Math.abs(delta)) delta = 0;
      var magnitude = Math.abs(delta);
      var isolated = now - lastWheelAt >= CONFIG.wheelIsolatedGapMs;
      var end = atEnd();

      if (!stream || now - lastWheelAt > CONFIG.streamGapMs) {
        stream = { fromEnd: end, recent: [], claimed: false };
      } else if (!end) {
        stream.fromEnd = false;
      } else if (!stream.fromEnd && delta > 0 && isFreshSwipe(stream.recent, magnitude)) {
        stream.fromEnd = true;
      }
      if (magnitude) {
        stream.recent.push(magnitude);
        if (stream.recent.length > 6) stream.recent.shift();
      }
      lastWheelAt = now;

      // Only a sheet that is up (or being held up) holds the page; while it
      // is falling, the same swipe already scrolls the page underneath.
      var lifted = phase === 'peek' || phase === 'open';

      if (!event.cancelable) {
        stream.claimed = false;
      } else if (lifted) {
        event.preventDefault();
        stream.claimed = true;
      }
      if (stream.claimed) {
        window.clearTimeout(wheelEndTimer);
        wheelEndTimer = window.setTimeout(onWheelEnd, CONFIG.streamGapMs);
      }

      if (!delta || (touch && touch.owned)) return;

      if (!lifted) {
        if (delta > 0 && end && stream.fromEnd) {
          // A push at the end: opens, or catches a falling sheet.
          if (stream.claimed) event.preventDefault();
          applyPush(delta, isolated, now);
        } else if (stream.claimed) {
          event.preventDefault();
          instantScrollBy(delta);
        }
        return;
      }

      if (phase === 'peek') {
        if (delta > 0) applyPush(delta, isolated, now);
        else close('cancel');
      } else if (delta < 0) {
        close('close');
      }
    }

    function onWheelEnd() {
      wheelEndTimer = 0;
      if (!nearEnd) disarm();
    }

    // ---- touch -------------------------------------------------------------

    /*
     * Ownership of a touch gesture is decided on its first move and kept
     * to the end: iOS Safari will not let a page take over a gesture the
     * browser already started scrolling, and will not hand one back once
     * touchmove was prevented. A swipe that arrives at the end of the page
     * therefore stays native (the "end" moment); the sheet only answers a
     * swipe that starts there and moves up, or any touch while it is
     * lifted.
     */
    function onTouchStart(event) {
      if (event.touches.length !== 1) {
        if (touch) endTouch();
        return;
      }
      var point = event.touches[0];
      touch = {
        id: point.identifier,
        startY: point.clientY,
        fromEnd: atEnd(),
        decided: false,
        owned: false,
        mode: null,
        originY: 0,
        originLift: 0,
        handedOff: 0,
        samples: []
      };
      if (phase !== 'idle') {
        clearAutoClose();
        autoCloseScheduled = false;
        stopLoop();
        catchSheet();
        v = 0;
      }
    }

    function recordSample(lift, fingerY) {
      var now = performance.now();
      touch.samples.push({ t: now, lift: lift, finger: fingerY });
      while (touch.samples.length > 2 && now - touch.samples[0].t > 100) {
        touch.samples.shift();
      }
    }

    function releaseRate(samples, key) {
      if (samples.length < 2) return 0;
      var first = samples[0];
      var last = samples[samples.length - 1];
      if (performance.now() - last.t > 80) return 0;
      var dt = (last.t - first.t) / 1000;
      return dt > 0 ? (last[key] - first[key]) / dt : 0;
    }

    function onTouchMove(event) {
      if (!touch) return;
      var point = findTouch(event.touches, touch.id);
      if (!point) return;
      var move = touch.startY - point.clientY;

      if (!touch.decided) {
        if (!move) {
          if (phase !== 'idle' && event.cancelable) event.preventDefault();
          return;
        }
        touch.decided = true;
        if (phase !== 'idle') {
          touch.owned = true;
          touch.mode = 'drag';
        } else if (touch.fromEnd && move > 0 && atEnd()) {
          touch.owned = true;
          touch.mode = 'push';
          beginMotion();
          phase = 'peek';
        }
        if (!touch.owned) {
          touch = null;
          return;
        }
        stopLoop();
        pulling = false;
        pull = 0;
        touch.originY = point.clientY;
        touch.originLift = Math.abs(y);
      }

      if (event.cancelable) event.preventDefault();
      var delta = touch.originY - point.clientY;
      var next;

      if (touch.mode === 'push') {
        next = rubber(delta, galleryHeight * CONFIG.touchPeekMax, CONFIG.touchResistance);
      } else {
        var raw = touch.originLift + delta;
        if (raw > galleryHeight) {
          next = galleryHeight + rubber(raw - galleryHeight, overshoot * CONFIG.stretchMax, CONFIG.stretchResistance);
        } else {
          next = Math.max(0, raw);
        }
        // Past fully closed, keep moving the page with the finger.
        var below = raw < 0 ? -raw : 0;
        var scrollStep = below - touch.handedOff;
        if (scrollStep) {
          touch.handedOff = below;
          instantScrollBy(-scrollStep);
        }
      }

      y = next;
      v = 0;
      recordSample(next, point.clientY);
      render();
    }

    function endTouch() {
      var gesture = touch;
      touch = null;
      if (!gesture) return;

      if (!gesture.owned) {
        if (phase === 'open') springName = 'open';
        if (phase !== 'idle') wake();
        return;
      }

      var fingerUp = -releaseRate(gesture.samples, 'finger');
      var lift = Math.abs(y);
      var flingUp = fingerUp > CONFIG.touchFlingPxPerS;
      var flingDown = fingerUp < -CONFIG.touchFlingPxPerS;
      v = releaseRate(gesture.samples, 'lift');

      if (gesture.mode === 'push') {
        if (lift >= galleryHeight * CONFIG.touchOpenAt || (flingUp && lift > 4)) {
          open();
        } else {
          close('cancel');
        }
        return;
      }

      if (flingDown || (!flingUp && lift < galleryHeight * CONFIG.touchCloseAt)) {
        close('close');
      } else {
        open();
      }
    }

    function onTouchEnd(event) {
      if (!touch) return;
      if (event.touches && findTouch(event.touches, touch.id)) return;
      endTouch();
    }

    // ---- keyboard, scroll, lifecycle --------------------------------------

    function onKeyDown(event) {
      if (phase === 'idle' || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

      var key = event.key;
      var space = (key === ' ' || key === 'Spacebar') && (target === document.body || target === html);
      if (key === 'Escape' || key === 'ArrowUp' || key === 'PageUp' || key === 'Home' || (space && event.shiftKey)) {
        event.preventDefault();
        close('close');
      } else if (key === 'ArrowDown' || key === 'PageDown' || key === 'End' || space) {
        event.preventDefault();
      }
    }

    /*
     * Anything else that moves the page up while the sheet is lifted — the
     * scrollbar, an anchor, find-in-page, focus — drops the sheet. Only
     * movement away from the end counts: Safari reports positions past the
     * end while it settles there, and iOS changes innerHeight rather than
     * scrollY when its toolbar shows.
     */
    function onScroll() {
      if (phase !== 'peek' && phase !== 'open') return;
      if (touch && touch.owned) return;
      if (window.scrollY < liftScrollY - CONFIG.scrollAwayPx) close('close');
    }

    function onResize() {
      measureSizes();
      if (phase === 'idle' || (touch && touch.owned)) return;
      // The page reflowed and its end moved away from under the lifted
      // sheet: drop it. A small change — a mobile toolbar showing or
      // hiding — keeps it open.
      if (maxScrollY() - window.scrollY > CONFIG.resizeAwayPx) {
        close('close');
        return;
      }
      liftScrollY = Math.min(window.scrollY, maxScrollY());
      wake();
    }

    // Non-passive wheel/touchmove listeners make the browser wait on this
    // script before scrolling, so they are only attached near the end of
    // the page, never while reading the rest of it.
    function arm() {
      if (armed) return;
      armed = true;
      requestImages();
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    function disarm() {
      // Never mid-way through a claimed gesture: the browser will not scroll
      // the rest of it, and without the listener neither would this script.
      if (!armed || phase !== 'idle' || touch || wheelEndTimer) return;
      armed = false;
      stream = null;
      window.removeEventListener('wheel', onWheel, { passive: false });
      window.removeEventListener('touchmove', onTouchMove, { passive: false });
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hardReset();
    });
    window.addEventListener('pagehide', hardReset);
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) hardReset();
    });

    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) {
        nearEnd = entries[entries.length - 1].isIntersecting;
        if (nearEnd) arm();
        else disarm();
      }, { root: null, rootMargin: '0px 0px 50% 0px', threshold: 0 }).observe(brand);
    } else {
      nearEnd = true;
      arm();
    }
  }

  document.addEventListener('site:footer-ready', initReveal);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();
