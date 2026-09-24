(function () {
  'use strict';

  var CONFIG = {
    autoCloseMs: 1000,
    slideIntervalMs: 160,
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
    // A wheel notch is an event with a real pause before it. A trackpad's
    // events are 8–16ms apart even at the slow start of a swipe; a second
    // deliberate click of a wheel never comes sooner than this.
    wheelNotchGapMs: 100,
    wheelKickPull: 50,
    // Browsers scale wheel deltas very differently for the same gesture —
    // Safari's run several times Chromium's, and a hard swipe there
    // delivers over 100px in a single 8ms event — so the sheet is pulled
    // by a rate-limited step instead of the raw delta. Without it the same
    // flick opens instantly in one browser and gently in another.
    wheelPullRatePxPerS: 2000,
    wheelNotchMinPx: 4,
    wheelFreshMinPx: 12,
    wheelPushesToOpen: 2,
    wheelPushWindowMs: 700,
    pullHoldMs: 280,
    // When a push ends, the sheet opens if it got at least this far up
    // (a fraction of the gallery height). What the user sees decides,
    // not how much delta their machine happened to send for the gesture.
    wheelOpenAt: 0.35,
    peekMax: 0.8,
    catchFallingAt: 0.15,

    // Touch. Ratios are fractions of the gallery height.
    touchNearEndPx: 60, // a swipe up that starts this close to the end is the sheet's
    touchOpenAt: 0.3,
    touchCloseAt: 0.85,
    touchFlingPxPerS: 550, // finger speed, not sheet speed
    touchFlingMinLiftPx: 12,

    // Pulling past the page end or past fully open: UIScrollView's rubber
    // band, (1 - 1 / (x * c / d + 1)) * d, with d = viewport height.
    rubberC: 0.6,
    maxLiftRatio: 0.8, // of the viewport height
    stretchHoldMs: 120, // wheel/trackpad stretch springs back after this pause

    /*
     * The bump on arriving at the end with momentum. The sheet lifts on a
     * spring of its own, as high as the arrival was fast, and settles
     * back; it never opens the gallery, that takes a deliberate push. It
     * does not touch the browser's own bounce and claims no gesture — the
     * page arrives natively, this only answers it.
     */
    arrival: {
      maxPx: 48, // ceiling, however fast the arrival
      perSpeed: 0.02, // px of bump per px/s of arrival speed
      minSpeed: 300 // px/s; slower arrivals get nothing
    },

    // response ≈ seconds per oscillation; damping 1 = no overshoot; kick =
    // starting speed, as a multiple of the remaining distance per second,
    // so a close starts moving at once instead of easing in from rest.
    springs: {
      follow: { response: 0.12, damping: 1, kick: 0 },
      open: { response: 0.4, damping: 0.7, kick: 0 },
      cancel: { response: 0.26, damping: 1, kick: 0 },
      close: { response: 0.7, damping: 0.82, kick: 2.5 },
      autoClose: { response: 1, damping: 0.6, kick: 0.5 },
      arrival: { response: 0.5, damping: 1, kick: 0 }
    }
  };

  // Read live by js/footer-tuning.js on local copies of the site, so the
  // feel can be set with sliders; every value above is read where it is
  // used, never cached.
  window.footerRevealConfig = CONFIG;

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
    var phase = 'idle'; // idle | arrival | peek | open | closing
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

      // Input that stops arriving holds for a beat, then the push is over.
      if (pulling && now - lastInputAt > CONFIG.pullHoldMs) endPush();
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
      if (phase === 'idle' || phase === 'arrival' || (phase === 'closing' && springName === name)) return;
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

    /*
     * The bump on arrival. The page has reached its end by itself, with
     * momentum the browser is spending on its own bounce; the sheet answers
     * with a lift of its own, as high as the arrival was fast, and settles
     * straight back. Nothing here cancels an event or claims a gesture.
     */
    function startArrivalBump(speed) {
      if (phase !== 'idle' || speed < CONFIG.arrival.minSpeed) return;
      var peak = Math.min(CONFIG.arrival.maxPx, speed * CONFIG.arrival.perSpeed);
      if (peak < 1) return;
      beginMotion();
      phase = 'arrival';
      springName = 'arrival';
      // A critically damped spring kicked from rest peaks at v0 / (ω·e).
      v = peak * (2 * Math.PI / CONFIG.springs.arrival.response) * Math.E;
      wake();
    }

    // ---- wheel & trackpad --------------------------------------------------

    /*
     * The momentum tail of the push that opened the sheet is not a new
     * push: it must neither stretch the sheet nor, once the sheet has
     * closed by itself, open it again. A new swipe on top of that tail
     * is — macOS cancels momentum the instant fingers touch the pad again,
     * without a gap in events, so it shows up as a clear acceleration.
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

    /*
     * Once the fingers leave the pad, a trackpad keeps sending the swipe's
     * momentum: a run of shrinking deltas, well below what the swipe itself
     * was worth. Both tests matter — a finger merely easing off also
     * shrinks its deltas, and taking that for the end of the gesture would
     * drop the sheet while the user is still pushing.
     */
    function isDying(recent) {
      var n = recent.length;
      if (n < 4) return false;
      for (var i = n - 3; i < n; i += 1) {
        if (recent[i] > recent[i - 1]) return false;
      }
      var peak = Math.max.apply(null, recent);
      return recent[n - 1] <= recent[n - 4] * 0.85 && recent[n - 1] <= peak * 0.5;
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
     * trackpad train only ever opens one stream, and the stutters inside
     * that train (Safari drops out for up to ~120ms at a time) are not
     * pushes of their own; it opens by how far it has lifted the sheet —
     * either right away, once the sheet is pinned against the top of its
     * peek, or when the push ends (endPush).
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
      var ceiling = galleryHeight * CONFIG.peekMax;
      if (rubber(pull, ceiling, 1) >= ceiling * 0.95 || isolatedPushes >= CONFIG.wheelPushesToOpen) {
        if (stream) stream.spent = true;
        open();
        return;
      }
      wake();
    }

    /*
     * The push is over: its events stopped, or what is still arriving is
     * only the momentum left after the fingers lifted. How far the sheet
     * actually rose decides whether it opens — the same gesture is worth
     * wildly different deltas from one machine to the next, and going by
     * those deltas made the sheet take real effort to open on some of them.
     */
    function endPush() {
      if (!pulling) return;
      if (stream) stream.spent = true;
      if (Math.abs(y) >= galleryHeight * CONFIG.wheelOpenAt) open();
      else close('cancel');
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
     * Gesture ownership. A gesture that starts at the end of the page, or
     * while the sheet is lifted, is the sheet's: every event of it is
     * cancelled — including the delta-less one Safari sends first, since
     * WebKit decides on that first event whether the page owns the
     * gesture, and if it goes through, nothing later in that gesture can
     * be cancelled. A gesture that started elsewhere and reaches the end by
     * momentum is the browser's, bounce included, and is never touched.
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
      var end = atEnd();

      // spent: this stream's push already did its job (opened the sheet,
      // or stretched it and let go); the rest of it is momentum, and only
      // a fresh swipe on top of it counts again.
      if (!stream || sinceLast > CONFIG.streamGapMs) {
        stream = { recent: [], spent: false };
      }
      var fresh = delta > 0 && isFreshSwipe(stream.recent, magnitude);
      // A discrete notch only ever opens a stream (or follows its opening
      // notch); everything inside a train is the same push, however ragged
      // the browser's cadence is.
      var notch = sinceLast >= CONFIG.wheelNotchGapMs && magnitude >= CONFIG.wheelNotchMinPx && stream.recent.length <= 1;
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

      // Only a sheet that is up (or being held up) holds the page; while it
      // is falling or merely bumping, the same swipe scrolls the page.
      var lifted = phase === 'peek' || phase === 'open';

      if (!event.cancelable) {
        claiming = false;
      } else if (lifted || end || claiming) {
        // At the end of the page every new gesture is the sheet's: a push
        // lifts it, a swipe up is scrolled by hand — and neither can set
        // off the browser's own bounce.
        event.preventDefault();
        claiming = true;
      }
      if (claiming) {
        window.clearTimeout(wheelEndTimer);
        wheelEndTimer = window.setTimeout(onWheelEnd, CONFIG.claimReleaseMs);
      }

      if (!delta || (touch && touch.owned)) return;

      if (!lifted) {
        if (delta > 0 && end && claiming && (!stream.spent || fresh || notch)) {
          // A push at the end: opens, or catches a falling sheet. Only a
          // gesture the sheet owns can push; momentum that carried the page
          // here is the browser's and gets its bounce instead. A stream
          // that already did its job is inert: its momentum must not push
          // the sheet open again after it has closed.
          if (pulling && !fresh && !notch && isDying(stream.recent)) endPush();
          else applyPush(step, notch, now);
        } else if (claiming) {
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
     * A swipe that starts well up the page stays native, momentum and the
     * browser's bounce at the end included.
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
      if (phase === 'idle' || phase === 'arrival' || event.defaultPrevented) return;
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
     * on the end carrying speed gives the arrival bump, whatever moved the
     * page — trackpad, wheel, finger, keyboard, scrollbar.
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
      // jump (scroll restoration on reload, an anchor) is not.
      if (phase !== 'idle' || speed <= 0 || !(previous.speed > 0)) return;
      var max = maxScrollY();
      if (max - sy > CONFIG.endTolerancePx || max - previous.y <= CONFIG.endTolerancePx || pinchZoomed()) return;
      // The last step is cut short by the end itself; the one before it
      // still carries the full speed.
      startArrivalBump(Math.max(speed, previous.speed));
    }

    function onResize() {
      measureSizes();
      if (phase === 'idle' || phase === 'arrival' || (touch && touch.owned)) return;
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
     * the page, never while reading the rest of it. The same class keeps
     * the picture panel visible there (css/project-footer.css).
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
