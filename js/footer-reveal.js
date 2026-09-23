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
    // How long after the last event a claimed gesture is still treated as
    // going on. Safari's trackpad stream stutters for over 100ms at a time
    // in the middle of a gesture, and a claimed gesture is one the browser
    // will not scroll for — so this has to outlast any stutter, or the page
    // stops moving in the middle of a swipe.
    claimReleaseMs: 450,
    wheelOpenPull: 170,
    wheelIsolatedGapMs: 30,
    wheelKickPull: 50,
    // Browsers scale wheel deltas very differently for the same gesture —
    // Safari's run several times Chromium's, and a hard swipe there
    // delivers over 100px in a single 8ms event — so the sheet is pulled
    // by a rate-limited step instead of the raw delta. Without it the same
    // flick opens instantly in one browser and gently in another.
    wheelPullRatePxPerS: 1400,
    wheelNotchMinPx: 4,
    wheelFreshMinPx: 12,
    wheelPushesToOpen: 2,
    wheelPushWindowMs: 700,
    pullHoldMs: 280,
    peekMax: 0.55,
    catchFallingAt: 0.15,

    // Touch. Ratios are fractions of the gallery height.
    touchNearEndPx: 140, // a swipe up that starts this close to the end is the sheet's
    touchOpenAt: 0.3,
    touchCloseAt: 0.85,
    touchFlingPxPerS: 550, // finger speed, not sheet speed
    touchFlingMinLiftPx: 12,

    // Pulling past the page end or past fully open: UIScrollView's rubber
    // band, (1 - 1 / (x * c / d + 1)) * d, with d = viewport height.
    rubberC: 0.55,
    maxLiftRatio: 0.9, // of the viewport height
    stretchHoldMs: 120, // wheel/trackpad stretch springs back after this pause

    // The bump on arriving at the end with momentum: a critically damped
    // spring kicked upward, height proportional to the arrival speed.
    hint: {
      perSpeed: 0.012, // px of bump per px/s of arrival speed
      minSpeed: 350, // px/s; slower arrivals get no bump
      maxDesktopPx: 28,
      maxTouchPx: 40 // taller, so it clears the iOS toolbar's edge fade
    },

    // response ≈ seconds per oscillation; damping 1 = no overshoot; kick =
    // starting speed, as a multiple of the remaining distance per second,
    // so a close starts moving at once instead of easing in from rest.
    springs: {
      follow: { response: 0.12, damping: 1, kick: 0 },
      open: { response: 0.46, damping: 0.78, kick: 0 },
      cancel: { response: 0.4, damping: 1, kick: 0 },
      close: { response: 0.7, damping: 0.82, kick: 2.5 },
      autoClose: { response: 0.85, damping: 0.8, kick: 2.2 },
      hint: { response: 0.5, damping: 1, kick: 0 }
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

  function appleRubber(x) {
    if (x <= 0) return 0;
    var d = window.innerHeight;
    return (1 - 1 / (x * CONFIG.rubberC / d + 1)) * d;
  }

  function appleUnrubber(value) {
    if (value <= 0) return 0;
    var d = window.innerHeight;
    var ratio = Math.min(value / d, 0.999);
    return (1 / (1 - ratio) - 1) * d / CONFIG.rubberC;
  }

  function maxScrollY() {
    return Math.max(0, html.scrollHeight - window.innerHeight);
  }

  function gapToEnd() {
    return maxScrollY() - window.scrollY;
  }

  // Pinch-zoomed in, a swipe pans the zoomed view first; the end of the
  // page is not the end of what the user can move.
  function pinchZoomed() {
    var viewport = window.visualViewport;
    return !!viewport && viewport.scale > 1.01;
  }

  function atEnd() {
    return !pinchZoomed() && gapToEnd() <= CONFIG.endTolerancePx;
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

    var coarsePointer = window.matchMedia('(pointer: coarse)');

    /*
     * Whether the browser's own bounce past the end of the page may be
     * switched off near the footer (css/project-footer.css). Chromium and
     * Gecko: always. WebKit: only until a wheel is involved — with the
     * root's overscroll-behavior set to none and a non-passive wheel
     * listener present, WebKit stops scrolling the page altogether, so on
     * a Mac the bounce stays on and does the arrival's showing by itself.
     */
    var wheelSafeEngine = !!navigator.userAgentData ||
      (window.CSS && CSS.supports && CSS.supports('-moz-appearance', 'none'));
    var macLike = /Mac|iP(hone|ad|od)/.test(navigator.platform || '');
    if (wheelSafeEngine || coarsePointer.matches) html.classList.add('can-lock-end');
    if (!wheelSafeEngine) {
      window.addEventListener('wheel', function () {
        html.classList.remove('can-lock-end');
      }, { passive: true, once: true });
    }

    // An arrival by momentum gets the sheet's own bump unless the browser
    // is about to bounce the page natively anyway.
    function wantsArrivalBump() {
      return html.classList.contains('can-lock-end') || !macLike;
    }

    var panel = document.createElement('div');
    panel.className = 'site-footer-reveal__panel';
    panel.setAttribute('aria-hidden', 'true');
    var stage = document.createElement('div');
    stage.className = 'site-footer-reveal__stage';
    panel.appendChild(stage);
    document.body.appendChild(panel);

    var galleryHeight = 0;

    function measureSizes() {
      galleryHeight = stage.offsetHeight;
    }

    measureSizes();

    function maxLift() {
      return Math.max(galleryHeight, window.innerHeight * CONFIG.maxLiftRatio);
    }

    function hintMax() {
      return coarsePointer.matches ? CONFIG.hint.maxTouchPx : CONFIG.hint.maxDesktopPx;
    }

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
        stage.appendChild(img);
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
    var phase = 'idle'; // idle | hint | peek | open | closing
    var springName = 'cancel';

    // Input-driven targets; at most one is active at a time.
    var pulling = false; // wheel push holding a peek
    var pull = 0;
    var stretching = false; // wheel push past fully open
    var stretch = 0;

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
    var wheelTrain = false; // the last wheel event came right after another
    var claiming = false; // this gesture is the page's; the browser scrolls none of it
    var wheelEndTimer = 0;
    var touch = null;
    var lastScroll = null;

    var armed = false;
    var nearEnd = false;
    var shownScale = 1;

    function render() {
      // A fall onto the closed position is drawn mirrored (|y|), so an
      // underdamped spring toward 0 reads as the sheet bouncing off the end
      // of the page instead of sinking below it.
      var shown = Math.min(Math.abs(y), maxLift());
      var dpr = window.devicePixelRatio || 1;
      shown = Math.round(shown * dpr) / dpr;

      // Past fully open, the pictures grow from their bottom edge to fill
      // the extra room instead of leaving a gap above them.
      var scale = shown > galleryHeight && galleryHeight > 0 ? shown / galleryHeight : 1;
      if (scale !== shownScale) {
        shownScale = scale;
        stage.style.transform = scale > 1 ? 'scale(' + scale + ')' : '';
      }

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

    function currentTarget() {
      if (pulling) return rubber(pull, galleryHeight * CONFIG.peekMax, 1);
      if (stretching) return galleryHeight + appleRubber(stretch);
      return phase === 'open' ? galleryHeight : 0;
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(0.064, Math.max(0, (now - lastFrameAt) / 1000));
      lastFrameAt = now;

      if (touch && touch.owned) return;

      // Input that stops arriving holds for a beat, then springs back.
      if (pulling && now - lastInputAt > CONFIG.pullHoldMs) {
        pulling = false;
        pull = 0;
        phase = 'closing';
        springName = 'cancel';
      }
      if (stretching && now - lastInputAt > CONFIG.stretchHoldMs) releaseStretch();

      var held = pulling || stretching;
      var target = currentTarget();
      integrate(dt, target, held ? CONFIG.springs.follow : CONFIG.springs[springName]);

      // The open timer runs from the moment the pictures are fully in view
      // (or back in view after a stretch), not from full settling.
      if (phase === 'open' && !stretching && !autoCloseScheduled && Math.abs(Math.abs(y) - galleryHeight) <= 4) {
        scheduleAutoClose();
      }

      if (!held && Math.abs(Math.abs(y) - target) < 0.5 && Math.abs(v) < 10) {
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

    function resetDrives() {
      pulling = false;
      pull = 0;
      stretching = false;
      stretch = 0;
    }

    function toIdle() {
      phase = 'idle';
      springName = 'cancel';
      resetDrives();
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
      claiming = false;
      touch = null;
      stream = null;
      toIdle();
    }

    function open() {
      catchSheet();
      phase = 'open';
      springName = 'open';
      resetDrives();
      isolatedPushes = 0;
      clearAutoClose();
      autoCloseScheduled = false;
      wake();
    }

    function close(name) {
      if (phase === 'idle' || phase === 'hint' || (phase === 'closing' && springName === name)) return;
      catchSheet();
      phase = 'closing';
      springName = name;
      resetDrives();
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
        // A finger is on the screen, or the sheet is being stretched: re-armed
        // once that input ends.
        if (touch || stretching) {
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

    // ---- the arrival bump --------------------------------------------------

    /*
     * Arriving at the end with speed nudges the sheet up a little and lets
     * it settle back — UIScrollView's bounce at its edge, scaled way down —
     * so there is a hint that something lies under the page. One kick per
     * arrival, sized by how fast the page was moving; whatever momentum is
     * left is spent against the end. It can never open the gallery; that
     * takes a new, deliberate push.
     */
    function startHint(speed) {
      if (phase !== 'idle' || speed < CONFIG.hint.minSpeed) return;
      var peak = Math.min(hintMax(), speed * CONFIG.hint.perSpeed);
      beginMotion();
      phase = 'hint';
      springName = 'hint';
      // A critically damped spring kicked from rest peaks at v0 / (ω·e).
      v = peak * (2 * Math.PI / CONFIG.springs.hint.response) * Math.E;
      wake();
    }

    // ---- wheel & trackpad --------------------------------------------------

    /*
     * Momentum that carried the page to its end must not open anything —
     * that is the "you reached the end" moment; it only bumps the sheet
     * (the hint above). So a wheel stream only pulls the sheet open if it
     * began while already at the end, or if a new swipe clearly
     * accelerates on top of a decaying momentum tail (macOS cancels
     * momentum the instant fingers touch the pad again, without a gap in
     * events). The same test tells a deliberate push past fully open from
     * the momentum tail of the push that opened the sheet.
     */
    function isFreshSwipe(recent, magnitude) {
      if (recent.length < 3 || magnitude < CONFIG.wheelFreshMinPx) return false;
      var a = recent[recent.length - 3];
      var b = recent[recent.length - 2];
      var c = recent[recent.length - 1];
      // Three steps of real acceleration, not one spike: a dying tail is
      // noisy (Safari's last events jitter between 1 and 10px), and any
      // single jump in it would otherwise read as a new swipe.
      return a < b && b < c && magnitude > c && magnitude >= a * 1.8;
    }

    // Once the fingers leave the pad, a trackpad keeps sending the swipe's
    // momentum: a run of shrinking deltas. (A finger slowing down before it
    // lifts looks the same, and ends the same way.)
    function isDying(recent) {
      var n = recent.length;
      if (n < 4) return false;
      for (var i = n - 3; i < n; i += 1) {
        if (recent[i] > recent[i - 1]) return false;
      }
      return recent[n - 1] <= recent[n - 4] * 0.85;
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
      resetDrives();
      pull = unrubber(y, max, 1);
      phase = 'peek';
      pulling = true;
      return true;
    }

    /*
     * A trackpad sends a continuous train of events (one per frame), a
     * wheel mouse one event per notch — and a notch can be as small as a
     * few px on macOS. So an event that opens a stream after a pause counts
     * as a discrete push: it gets a minimum visible peek, and two of them
     * within wheelPushWindowMs open the gallery, whatever their delta. A
     * trackpad train only ever opens one stream, so it opens on distance
     * instead — and the stutters inside that train (Safari drops out for up
     * to ~120ms at a time) are not pushes of their own.
     */
    function applyPush(delta, notch, now) {
      if (!pulling && !beginPull()) {
        if (stream) stream.spent = true;
        return;
      }
      pull += delta;
      if (notch && delta >= 2) {
        if (pull < CONFIG.wheelKickPull) pull = CONFIG.wheelKickPull;
        if (now - lastPushAt > CONFIG.wheelPushWindowMs) isolatedPushes = 0;
        isolatedPushes += 1;
        lastPushAt = now;
      }
      lastInputAt = now;
      if (pull >= CONFIG.wheelOpenPull || isolatedPushes >= CONFIG.wheelPushesToOpen) {
        if (stream) stream.spent = true;
        open();
        return;
      }
      wake();
    }

    function applyStretch(delta, now) {
      if (!stretching) {
        catchSheet();
        stretch = appleUnrubber(Math.max(0, y - galleryHeight));
        stretching = true;
        clearAutoClose();
        autoCloseScheduled = false;
      }
      stretch = Math.max(0, stretch + delta);
      lastInputAt = now;
      wake();
    }

    function releaseStretch() {
      if (!stretching) return;
      stretching = false;
      stretch = 0;
      springName = 'open';
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
     * died, so it can run on for as long as the user keeps swiping. Once
     * the sheet is down again, the remaining events are therefore scrolled
     * here by hand; dropping them left the page frozen until the user
     * paused. That claim is kept outside the stream bookkeeping below and
     * only let go after a real pause: Safari stutters mid-gesture for long
     * enough to look like a new stream, and letting go there stopped the
     * page dead in the middle of a swipe. An event the browser has already
     * made non-cancelable is its own to scroll and is never touched.
     */
    function onWheel(event) {
      if (event.ctrlKey) return;

      var now = performance.now();
      var delta = wheelDeltaPx(event);
      if (Math.abs(event.deltaX) > Math.abs(delta)) delta = 0;
      var magnitude = Math.abs(delta);
      var sinceLast = now - lastWheelAt;
      var isolated = sinceLast >= CONFIG.wheelIsolatedGapMs;
      var end = atEnd();
      var fresh = false;

      // spent: this stream's push already did its job (opened the sheet,
      // bumped it on arrival, or stretched it and let go); the rest of it
      // is momentum, and only a fresh swipe on top of it counts again.
      if (!stream || sinceLast > CONFIG.streamGapMs) {
        stream = { fromEnd: end, recent: [], spent: false };
      } else if (!end) {
        stream.fromEnd = false;
      } else if (delta > 0 && isFreshSwipe(stream.recent, magnitude)) {
        fresh = true;
        stream.fromEnd = true;
      }
      // A discrete notch only ever opens a stream; everything inside a
      // train is the same push, however ragged the browser's cadence is.
      var notch = isolated && magnitude >= CONFIG.wheelNotchMinPx && stream.recent.length <= 1;
      // How far this event pulls the sheet: the raw delta, but never
      // faster than wheelPullRatePxPerS, so a push feels the same in
      // every browser. The page itself is still scrolled by the raw delta.
      var step = Math.min(magnitude, CONFIG.wheelPullRatePxPerS * Math.min(Math.max(sinceLast, 4), 40) / 1000);
      if (delta < 0) step = -step;

      if (magnitude) {
        stream.recent.push(magnitude);
        if (stream.recent.length > 6) stream.recent.shift();
      }
      lastWheelAt = now;
      wheelTrain = !isolated;

      // Only a sheet that is up (or being held up) holds the page; while it
      // is falling or merely bumping, the same swipe scrolls the page.
      var lifted = phase === 'peek' || phase === 'open';

      if (!event.cancelable) {
        claiming = false;
      } else if (lifted || end) {
        // At the end of the page every new gesture is the sheet's: a push
        // lifts it, a swipe up is scrolled by hand — and neither can set
        // off the browser's own bounce, whichever engine this is.
        event.preventDefault();
        claiming = true;
      }
      if (claiming) {
        window.clearTimeout(wheelEndTimer);
        wheelEndTimer = window.setTimeout(onWheelEnd, CONFIG.claimReleaseMs);
      }

      if (!delta || (touch && touch.owned)) return;

      if (!lifted) {
        if (delta > 0 && end && stream.fromEnd && (!stream.spent || fresh || notch)) {
          // A push at the end: opens, or catches a falling sheet. A stream
          // that already did its job is inert: its momentum must not push
          // the sheet open again after it has closed.
          if (claiming) event.preventDefault();
          applyPush(step, notch, now);
        } else if (delta > 0 && end && !claiming) {
          // The momentum that carried the page here: one bump, as hard as
          // it arrived.
          if (!stream.spent) {
            stream.spent = true;
            if (wantsArrivalBump() || notch) startHint(magnitude / Math.max(8, sinceLast) * 1000);
          }
        } else if (claiming) {
          event.preventDefault();
          // A wheel notch keeps the browser's smooth step (scroll-behavior
          // on html); a trackpad's stream is applied as it comes.
          if (notch) window.scrollBy(0, delta);
          else instantScrollBy(delta);
        }
        return;
      }

      if (phase === 'peek') {
        if (delta > 0) applyPush(step, notch, now);
        else close('cancel');
        return;
      }

      // Open.
      if (delta > 0) {
        if (stream.spent && !fresh && !notch) return;
        if (stretching && !fresh && !notch && isDying(stream.recent)) {
          // Fingers off the pad: spring back now rather than hang on the
          // momentum until it runs out.
          stream.spent = true;
          releaseStretch();
          return;
        }
        stream.spent = false;
        applyStretch(step, now);
      } else if (stretching && stretch > 0) {
        applyStretch(step, now);
      } else {
        close('close');
      }
    }

    function onWheelEnd() {
      wheelEndTimer = 0;
      claiming = false;
      if (!nearEnd) disarm();
    }

    // ---- touch -------------------------------------------------------------

    /*
     * Ownership of a touch gesture is decided on its first move and kept
     * to the end: iOS Safari will not let a page take over a gesture the
     * browser already started scrolling, and will not hand one back once
     * touchmove was prevented.
     *
     * A swipe up that starts at, or just short of, the end of the page is
     * the sheet's. "Just short" matters on iOS: at the end of a page Safari
     * expands its bottom toolbar, which shortens the viewport and leaves the
     * page tens of px short of its end without anything having scrolled —
     * a strict at-the-end test then rejects exactly the swipe meant for the
     * sheet. Here the rest of the page is scrolled by hand, 1:1 with the
     * finger, and the pull continues into the sheet in one motion.
     *
     * A swipe that starts well up the page stays native — momentum carrying
     * it to the end is the "end" moment and only bumps the sheet.
     */
    function onTouchStart(event) {
      if (event.touches.length !== 1) {
        if (touch) endTouch();
        return;
      }
      var point = event.touches[0];
      touch = {
        id: point.identifier,
        startX: point.clientX,
        startY: point.clientY,
        nearEnd: !pinchZoomed() && gapToEnd() <= CONFIG.touchNearEndPx,
        decided: false,
        owned: false,
        mode: null,
        originY: 0,
        originLift: 0,
        originScrollY: 0,
        endScrollY: 0,
        handedOff: 0,
        samples: []
      };
      if (phase === 'peek' || phase === 'open' || phase === 'closing') {
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
        var lifted = phase === 'peek' || phase === 'open' || phase === 'closing';
        var sideways = Math.abs(point.clientX - touch.startX);
        if (!move && !sideways) {
          if (lifted && event.cancelable) event.preventDefault();
          return;
        }
        touch.decided = true;
        // A move the browser has already made non-cancelable is its own
        // to scroll; taking it as well would move the page twice.
        if (lifted && event.cancelable) {
          touch.owned = true;
          touch.mode = 'drag';
        } else if (touch.nearEnd && move > 0 && sideways <= move && event.cancelable) {
          touch.owned = true;
          touch.mode = 'push';
          beginMotion();
          phase = 'peek';
        }
        if (!touch.owned) {
          endTouch();
          return;
        }
        stopLoop();
        resetDrives();
        catchSheet();
        touch.originY = point.clientY;
        touch.originLift = Math.abs(y);
        touch.originScrollY = window.scrollY;
        touch.endScrollY = maxScrollY();
      }

      if (event.cancelable) event.preventDefault();
      var delta = touch.originY - point.clientY;
      var next;

      if (touch.mode === 'push') {
        // First the rest of the page, then the sheet — the same rubber band
        // a native page has at its end, all the way through.
        var remainder = Math.max(0, touch.endScrollY - touch.originScrollY);
        var pageTarget = touch.originScrollY + Math.min(Math.max(delta, 0), remainder);
        var pageStep = pageTarget - window.scrollY;
        if (Math.abs(pageStep) >= 0.5) instantScrollBy(pageStep);
        next = appleRubber(appleUnrubber(touch.originLift) + Math.max(0, delta - remainder));
      } else {
        var raw = touch.originLift + delta;
        next = raw > galleryHeight ? galleryHeight + appleRubber(raw - galleryHeight) : Math.max(0, raw);
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

      if (gesture.mode === 'push') liftScrollY = Math.min(window.scrollY, maxScrollY());

      var fingerUp = -releaseRate(gesture.samples, 'finger');
      var lift = Math.abs(y);
      var flingUp = fingerUp > CONFIG.touchFlingPxPerS;
      var flingDown = fingerUp < -CONFIG.touchFlingPxPerS;
      v = releaseRate(gesture.samples, 'lift');

      if (gesture.mode === 'push') {
        if (lift >= galleryHeight * CONFIG.touchOpenAt || (flingUp && lift >= CONFIG.touchFlingMinLiftPx)) {
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
      if (phase === 'idle' || phase === 'hint' || event.defaultPrevented) return;
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
     * Two jobs. Anything that moves the page up while the sheet is lifted —
     * the scrollbar, an anchor, find-in-page, focus — drops the sheet; only
     * movement away from the end counts, because Safari reports positions
     * past the end while it settles there and iOS changes innerHeight
     * rather than scrollY when its toolbar shows. And a scroll that lands
     * on the end with speed while nothing else drives the sheet — touch
     * momentum, a keyboard jump — gives the arrival bump. Wheel-driven
     * arrivals bump from the wheel's own momentum tail instead.
     */
    function onScroll() {
      var now = performance.now();
      var sy = window.scrollY;
      var previous = lastScroll;
      var dt = previous ? now - previous.t : 0;
      var speed = dt > 0 && dt <= 120 ? (sy - previous.y) / dt * 1000 : 0;
      lastScroll = { y: sy, t: now, speed: speed };

      if (touch && touch.owned) return;

      if (phase === 'peek' || phase === 'open') {
        if (sy < liftScrollY - CONFIG.scrollAwayPx) close('close');
        return;
      }

      // Only the end of a run of steps is an arrival with momentum; a lone
      // jump (scroll restoration on reload, an anchor) is not. A trackpad's
      // momentum still arriving as wheel events: the wheel handler sizes
      // the bump from those instead.
      if (phase !== 'idle' || speed <= 0 || !(previous.speed > 0)) return;
      if (wheelTrain && now - lastWheelAt < 100) return;
      var max = maxScrollY();
      if (max - sy > CONFIG.endTolerancePx || max - previous.y <= CONFIG.endTolerancePx || pinchZoomed()) return;
      // The last step is cut short by the end itself; the one before it
      // still carries the full speed.
      if (wantsArrivalBump()) startHint(Math.max(speed, previous.speed));
    }

    function onResize() {
      measureSizes();
      if (phase === 'idle' || phase === 'hint' || (touch && touch.owned)) return;
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

    /*
     * Non-passive wheel/touchmove listeners make the browser wait on this
     * script before scrolling, so they are only attached near the end of
     * the page, never while reading the rest of it. The same class switches
     * off the browser's own bounce there (css/project-footer.css), and only
     * there — elsewhere, including pull-to-refresh at the top, stays native.
     */
    function arm() {
      if (armed) return;
      armed = true;
      html.classList.add('is-footer-near');
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
      html.classList.remove('is-footer-near');
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
