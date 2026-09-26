import { CONSTANTS } from '../config/constants.js';
import { Utils } from '../utils/utils.js';
// ============================================================================
// МЕНЕДЖЕР ТЕМИ
// ============================================================================
export class ThemeView {
  constructor(dom, i18n) {
    this.dom = dom;
    this.themes = CONSTANTS.THEMES;
    this.i18n = i18n;
  }

  async init() {
    const { theme } = await Utils.getStorageData(['theme']);

    this.applyTheme(theme || 'system');
  }

  async toggleTheme() {
    const { theme } = await Utils.getStorageData(['theme']);
    const current = theme || 'system';
    const next = this.getNextTheme(current);
    await Utils.setStorageData({ theme: next });
    this.applyTheme(next);
  }

  getNextTheme(current) {
    const index = this.themes.indexOf(current);
    return this.themes[(index + 1) % this.themes.length];
  }

  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    this.#updateButtonUI(theme);
  }

  #updateButtonUI(theme) {
    if (!this.dom.themeBtn) return;

    const icon = this.dom.themeBtn.querySelector('.icon');
    const text = this.dom.themeBtn.querySelector('span:last-child');

    const map = {
      system: { icon: 'ic_system', local: 'system', text: this.i18n.get('system') },
      dark: { icon: 'ic_moon', local: 'dark', text: this.i18n.get('dark') },
      light: { icon: 'ic_sun', local: 'light', text: this.i18n.get('light') }
    };

    if (icon) {
      const allIconClasses = Object.values(map).map(item => item.icon);
      icon.classList.remove(...allIconClasses);
      icon.classList.add(map[theme].icon);
    }

    if (text) {
      text.dataset.i18n = map[theme].local;
      text.textContent = map[theme].text;
    }
  }
}
