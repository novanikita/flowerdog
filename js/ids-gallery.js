import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.js';
import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.js';

/**
 * @param {HTMLDivElement} node
 */
const photoSwipeSize = (node) => {
  if (node.hasAttribute('data-pswp-width') && node.hasAttribute('data-pswp-height')) {
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

class IdsGallery extends HTMLElement {
  constructor() {
    super();
    this.classList.add('ids__gallery');
  }

  connectedCallback() {
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
