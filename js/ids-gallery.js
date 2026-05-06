import PhotoSwipe from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.js';
import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.js';

/**
 * @param {HTMLDivElement} node
 */
const photoSwipeSize = (node) => {
  if (node.hasAttribute('data-pswp-width') && node.hasAttribute('data-pswp-height')) {
    return;
  }

  /** @type {HTMLVideoElement | null} */
  const video = node.querySelector('video');
  if (video) {
    const setVideoSize = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      node.setAttribute('data-pswp-width', width.toString());
      node.setAttribute('data-pswp-height', height.toString());
    };

    if (video.readyState >= 1) {
      setVideoSize();
    } else {
      video.addEventListener('loadedmetadata', setVideoSize, { once: true });
    }
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

/**
 * Normalize video-only figures to clickable <a> items for PhotoSwipe.
 * @param {HTMLElement} gallery
 */
const normalizeVideoItems = (gallery) => {
  gallery.querySelectorAll('figure video').forEach((video) => {
    const figure = video.closest('figure');
    if (!figure) return;
    if (video.closest('a')) return;

    const source = video.querySelector('source');
    const src = video.currentSrc || video.getAttribute('src') || source?.getAttribute('src');
    if (!src) return;

    const link = document.createElement('a');
    link.setAttribute('href', src);
    link.setAttribute('data-pswp-type', 'video');
    link.setAttribute('data-pswp-width', '1280');
    link.setAttribute('data-pswp-height', '720');
    link.className = 'ids-gallery__video-link';

    figure.insertBefore(link, video);
    link.appendChild(video);
  });
};

class IdsGallery extends HTMLElement {
  constructor() {
    super();
    this.classList.add('ids__gallery');
  }

  connectedCallback() {
    normalizeIframeItems(this);
    normalizeVideoItems(this);

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

    this.lightbox.on('contentLoad', (event) => {
      const { content } = event;
      if (content.type !== 'video') return;

      event.preventDefault();

      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('controls', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.style.width = '100%';
      video.style.height = 'auto';
      video.style.display = 'block';

      const source = document.createElement('source');
      source.src = content.data.src;
      source.type = 'video/mp4';
      video.appendChild(source);

      content.element = video;
    });

    this.lightbox.on('contentDeactivate', ({ content }) => {
      if (content.type !== 'video') return;
      const video = content.element;
      if (video instanceof HTMLVideoElement) {
        video.pause();
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
