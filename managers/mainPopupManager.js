import { CONSTANTS } from '../config/constants.js';
import { Utils } from '../utils/utils.js';
import { getUpdateStateMeta } from '../utils/updateState.js';
// ============================================================================
// МЕНЕДЖЕР POPUP-МЕНЮ
// ============================================================================
export class MainPopupManager {
  constructor(dom, dialogManager, themeView, errorReporter, i18n, onModeChange) {
    this.dom = dom;
    this.dialogManager = dialogManager;
    this.themeView = themeView;
    this.errorReporter = errorReporter;
    this.i18n = i18n;
    this.onModeChange = onModeChange;
  }

  #closePopups = (currentPopup) => {
    document.querySelectorAll('.popup-menu.active')
      .forEach(menu => {
        if (menu !== currentPopup) {
          menu.classList.remove('active');
        }
      });
  };

  async init() {
    const { dotsBtn, mainPopupMenu } = this.dom;
    if (!dotsBtn || !mainPopupMenu) return;

    const { mode } = await Utils.getMode();
    const checkbox = mainPopupMenu.querySelector('#checkbox-mode');
    const modeIndex = mode ?? 0;
    checkbox.checked = modeIndex === 1;

    dotsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#closePopups(mainPopupMenu);
      mainPopupMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => mainPopupMenu.classList.remove('active'));

    mainPopupMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('[data-action]');
      if (!item) return;

      this.handleMenuAction(item);
      if (item.classList.contains('close-at-click')) mainPopupMenu.classList.remove('active');
    });
  }

  async handleMenuAction(item) {
    switch (item.dataset.action) {
      case 'mode': {
        const checkbox = item.querySelector('#checkbox-mode');
        if (!checkbox) break;

        checkbox.checked = !checkbox.checked;
        const mode = checkbox.checked ? 1 : 0;

        try {
          this.onModeChange?.(mode);
        } catch (error) {
          console.error('Mode switch failed:', error);
          checkbox.checked = !checkbox.checked;
        }
        break;
      }

      case 'theme':
        this.themeView.toggleTheme();
        break;

      case 'notification': {
        try {
          const stored = await Utils.getStorageData([
            CONSTANTS.NOTIFICATION_ENABLED_KEY,
            CONSTANTS.NOTIFICATION_DELAY_KEY,
            CONSTANTS.NOTIFICATION_FREQUENCY_KEY
          ]);

          await this.dialogManager.showTimerSettings(
            {
              enabled: !!stored[CONSTANTS.NOTIFICATION_ENABLED_KEY],
              delay: stored[CONSTANTS.NOTIFICATION_DELAY_KEY],
              frequency: stored[CONSTANTS.NOTIFICATION_FREQUENCY_KEY]
            },
            async (data) => {
              await Utils.setStorageData({
                [CONSTANTS.NOTIFICATION_ENABLED_KEY]: data.enabled ? 1 : 0,
                [CONSTANTS.NOTIFICATION_DELAY_KEY]: data.delay,
                [CONSTANTS.NOTIFICATION_FREQUENCY_KEY]: data.frequency,
                [CONSTANTS.NOTIFICATION_STATE_KEY]: null
              });
            }
          );
        } catch (error) {
          console.error('Failed to load notification settings:', error);
        }
        break;
      }

      case 'bug-report':
        this.dialogManager.showBugReport((data) => {
          this.errorReporter.capture(data);
          this.errorReporter.flush();
        });
        break;

      case 'about':
        const [cache, info, storage, installDate] = await Promise.all([
          Utils.getStorageSize(),
          chrome.management.getSelf(),
          Utils.getStorageData([
            CONSTANTS.UPDATE_STATE_KEY,
            CONSTANTS.LATEST_VER_KEY,
          ]),
          Utils.getInstallDate(),
        ]);

        const updateState = storage[CONSTANTS.UPDATE_STATE_KEY];
        const latestVer = storage[CONSTANTS.LATEST_VER_KEY];

        const installDateMsg = installDate === undefined
          ? this.i18n.get('installDateUnknown')
          : this.i18n.formatDateOnly(installDate);

        const versionMeta = updateState !== undefined
          ? getUpdateStateMeta(updateState, latestVer, this.i18n)
          : getUpdateStateMeta(0, latestVer, this.i18n);

        this.dialogManager.showAbout({
          version: chrome.runtime.getManifest().version,
          cache,
          shortId: Utils.shortenId(info.id),
          installDate: installDateMsg,
          versionMeta,
          ...info,
        });
        break;

      case 'support':
        this.dialogManager.showSupport();
        break;

      default:
        console.warn(`Unknown menu action: ${item.dataset.action}`);
    }
  }
}
