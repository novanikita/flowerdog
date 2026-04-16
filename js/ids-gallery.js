import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.js';
import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.js';

/**
 * @param {HTMLDivElement} node
 */
const photoSwipeSize = (node) => {
  if (node.hasAttribute('data-pswp-width') && node.hasAttribute('data-pswp-height')) {
    return;
  }

  /** @type {HTMLIFrameElement | null} */
  const iframe = node.querySelector('iframe');
  if (iframe) {
    // Provide deterministic fallback size for iframe-based slides.
    node.setAttribute('data-pswp-width', '1280');
    node.setAttribute('data-pswp-height', '720');
    return;
  }

  /** @type {HTMLImageElement | null} */
  const img = node.querySelector('img');
  if (!img) {
    return;
  }

  const probe = new Image();
  probe.onload = () => {
    node.setAttribute('data-pswp-width', probe.width.toString());
    node.setAttribute('data-pswp-height', probe.height.toString());
  };
  probe.src = img.src;
};

/**
 * Normalize iframe-only figures to clickable <a> items for PhotoSwipe.
 * @param {HTMLElement} gallery
 */
const normalizeIframeItems = (gallery) => {
  gallery.querySelectorAll('figure iframe').forEach((iframe) => {
    const figure = iframe.closest('figure');
    if (!figure) return;
    if (iframe.closest('a')) return;

    const src = iframe.getAttribute('src');
    if (!src) return;

    const link = document.createElement('a');
    link.setAttribute('href', src);
    link.setAttribute('data-pswp-type', 'iframe');
    link.setAttribute('data-pswp-width', '1280');
    link.setAttribute('data-pswp-height', '720');
    link.className = 'ids-gallery__iframe-link';

    figure.insertBefore(link, iframe);
    link.appendChild(iframe);
  });
};

class IdsGallery extends HTMLElement {
  constructor() {
    super();
    this.classList.add('ids__gallery');
  }

  connectedCallback() {
    normalizeIframeItems(this);

    this.lightbox = new PhotoSwipeLightbox({
      gallery: this,
      children: 'a',
      pswpModule: PhotoSwipe,
      padding: { top: 20, bottom: 40, left: 100, right: 100 },
    });

    this.lightbox.on('uiRegister', () => {
      if (!this.getAttribute('zoom') && this.lightbox?.pswp?.ui?.uiElementsData?.length) {
        this.lightbox.pswp.ui.uiElementsData = this.lightbox.pswp.ui.uiElementsData.filter((el) => el.name !== 'zoom');
      }
    });

    this.lightbox.init();
    this.querySelectorAll('a').forEach(photoSwipeSize);
  }

  disconnectedCallback() {
    this.lightbox?.destroy();
  }
}

if (!window.customElements.get('ids-gallery')) {
  window.customElements.define('ids-gallery', IdsGallery);
}
