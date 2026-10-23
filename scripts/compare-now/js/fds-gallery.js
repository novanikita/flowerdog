class IdsGallery extends HTMLElement {
  constructor() {
    super();
    this.classList.add('fds-gallery');
  }

  connectedCallback() {
    this.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
      }, true);
      link.style.cursor = 'default';
      if (!link.hasAttribute('aria-label')) {
        link.setAttribute('aria-label', 'Gallery media');
      }
      if (!link.hasAttribute('tabindex')) {
        link.setAttribute('tabindex', '-1');
      }
    });
  }
}

if (!window.customElements.get('fds-gallery')) {
  window.customElements.define('fds-gallery', IdsGallery);
}
