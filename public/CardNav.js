// Vanilla JS version of CardNav - Vertical Right Side
class CardNav {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      logo: options.logo || '',
      logoAlt: options.logoAlt || 'Logo',
      items: options.items || [],
      baseColor: options.baseColor || '#fff',
      menuColor: options.menuColor || '#000'
    };

    this.isHamburgerOpen = false;
    this.isExpanded = false;
    this.navEl = null;
    this.cardsRefs = [];

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const isDark = document.documentElement.classList.contains('dark');
    
    const navHTML = `
      <nav class="card-nav">
        <div class="card-nav-top">
          <div class="hamburger-menu" role="button" aria-label="Open menu" tabindex="0">
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
          </div>
        </div>

        <div class="card-nav-content" aria-hidden="true">
          ${this.options.items.map((item, idx) => {
            const bgColor = isDark ? (item.bgColorDark || item.bgColor) : item.bgColor;
            const textColor = isDark ? (item.textColorDark || item.textColor) : item.textColor;
            const pageId = item.pageId || '';
            return `
              <div class="nav-card-link-wrapper" data-page-id="${pageId}" role="button" tabindex="0">
                <div class="nav-card" style="background-color: ${bgColor}; color: ${textColor};">
                  <div class="nav-card-label">${item.label}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </nav>
    `;

    this.container.innerHTML = navHTML;
    this.navEl = this.container.querySelector('.card-nav');
    this.cardsRefs = Array.from(this.container.querySelectorAll('.nav-card'));
  }

  toggleMenu() {
    console.log('CardNav: toggleMenu called');
    const hamburger = this.container.querySelector('.hamburger-menu');
    const content = this.container.querySelector('.card-nav-content');

    if (!this.isExpanded) {
      console.log('CardNav: Opening menu');
      this.isHamburgerOpen = true;
      this.isExpanded = true;
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-label', 'Close menu');
      this.navEl.classList.add('open');
      content.setAttribute('aria-hidden', 'false');
    } else {
      console.log('CardNav: Closing menu');
      this.isHamburgerOpen = false;
      this.isExpanded = false;
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-label', 'Open menu');
      this.navEl.classList.remove('open');
      content.setAttribute('aria-hidden', 'true');
    }
  }

  attachEventListeners() {
    const hamburger = this.container.querySelector('.hamburger-menu');
    console.log('CardNav: Attaching event listeners to hamburger:', hamburger);
    if (hamburger) {
      hamburger.addEventListener('click', (e) => {
        console.log('CardNav: Hamburger clicked!', e);
        this.toggleMenu();
      });
      hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleMenu();
        }
      });
    } else {
      console.error('CardNav: Hamburger menu not found!');
    }

    // Add click handlers for navigation items
    const navCards = this.container.querySelectorAll('.nav-card-link-wrapper');
    navCards.forEach(card => {
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        const pageId = card.getAttribute('data-page-id');
        if (pageId) {
          e.preventDefault();
          
          // Handle home page separately
          if (pageId === 'home') {
            if (typeof window.showHomePage === 'function') {
              window.showHomePage();
            }
          } else if (typeof window.showPage === 'function') {
            window.showPage(pageId);
          }
          
          // Close menu after navigation
          this.toggleMenu();
        }
      });

      // Keyboard accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const pageId = card.getAttribute('data-page-id');
          if (pageId) {
            // Handle home page separately
            if (pageId === 'home') {
              if (typeof window.showHomePage === 'function') {
                window.showHomePage();
              }
            } else if (typeof window.showPage === 'function') {
              window.showPage(pageId);
            }
            
            // Close menu after navigation
            this.toggleMenu();
          }
        }
      });
    });
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

// Make CardNav available globally
window.CardNav = CardNav;
