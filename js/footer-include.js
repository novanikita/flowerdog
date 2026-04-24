(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-site-footer]');
  if (!slots.length) return;

  /* Inline fallback when fetch fails (file://, offline, wrong base path on mobile). */
  var FALLBACK = '<footer><h1 class="footer-brand"><img src="images/logo.svg" alt="flowerdog" class="footer-brand__logo" draggable="false"> © 2024 → 2026</h1></footer>';

  function inject(markup) {
    slots.forEach(function (slot) {
      slot.innerHTML = markup;
    });
  }

  fetch('partials/footer.html')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load footer partial');
      }
      return response.text();
    })
    .then(function (markup) {
      if (!markup || !String(markup).trim()) {
        throw new Error('Empty footer partial');
      }
      inject(markup);
    })
    .catch(function () {
      inject(FALLBACK);
    });
})();
