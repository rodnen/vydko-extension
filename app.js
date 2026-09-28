import { Utils } from './utils/utils.js';
import { ErrorReporter } from './utils/reporter.js';

import { DOMElements } from './dom/domElements.js';
import { CacheManager } from './managers/cacheManager.js';
import { ThemeView } from './view/themeView.js';
import { NotificationView } from './view/notificationView.js';
import { MessageManager } from './managers/messageManager.js';
import { DialogManager } from './managers/dialogManager.js';
import { VersionManager } from './managers/versionManager.js';
import { DateManager } from './managers/dateManager.js';
import { SelectManager } from './managers/selectManager.js';
import { InputManager } from './managers/inputManager.js';
import { DataManager } from './managers/dataManager.js';
import { RefreshManager } from './managers/refreshManager.js';
import { MainPopupManager } from './managers/mainPopupManager.js';
import { LanguagePopupManager } from './managers/languagePopupManager.js';
import { I18n } from './core/i18n.js';

// ============================================================================
// ГОЛОВНИЙ ДОДАТОК
// ============================================================================
export class App {
  constructor() {
    this.dom = new DOMElements();
    requestAnimationFrame(() => requestAnimationFrame(() => this.init()));
  }

  async init() {
    const { dom } = this;

    this.i18n = new I18n();
    await this.i18n.init();

    this.cacheManager = new CacheManager();
    await this.cacheManager.load();

    this.themeView = new ThemeView(dom, this.i18n);
    this.messageManager = new MessageManager(dom);
    this.dialogManager = new DialogManager(dom, this.messageManager, this.i18n);
    this.versionManager = new VersionManager(this.dialogManager, this.messageManager, this.i18n);
    this.dateManager = new DateManager(dom, this.i18n, () => this.dataManager.loadData());
    this.notificationView = new NotificationView(dom, this.i18n);

    const onSelectionChange = (type) => {
      if (type === 'dsoId') {
        const { dsoId } = this.selectManager.getValues();

        if (Utils.isInvalidValue(dsoId)) this.inputManager.removeInputs();
        else this.inputManager.renderInputs();
      }

      this.dataManager.loadData();
    };

    this.selectManager = new SelectManager(
      dom,
      this.i18n,
      this.cacheManager,
      onSelectionChange
    );

    this.inputManager = new InputManager(
      dom,
      this.cacheManager,
      this.i18n,
      async (g) => {
        await this.selectManager.setAndSaveValue('queue', g);
        await this.dataManager.loadData();
      }
    );

    this.dataManager = new DataManager(
      dom,
      this.i18n,
      this.selectManager,
      this.dateManager
    );

    this.errorReporter = new ErrorReporter({
      endpoint: "https://docs.google.com/forms/d/e/1FAIpQLScSGSLvZoB6t3RG17AS2ueH0vgCaVl5T813QQElPqkIEMXJKQ/formResponse",
      fieldsMap: {
        error: "entry.581983976",
        stack: "entry.1526738214",
        mode: "entry.1382745580",
        userAgent: "entry.1303966238",
        platform: "entry.1541979604",
        language: "entry.804086390",
        screen: "entry.698707174",
        version: "entry.1787521461"
      }
    });

    const onModeChange = async (mode) => {
      await Utils.sendMessage({ action: 'clearTableCache' });
      await Utils.setStorageData({ mode });
      this.selectManager.setMode(mode);
      this.dataManager.loadData();
    }

    this.mainPopupManager = new MainPopupManager(
      dom,
      this.dialogManager,
      this.themeView,
      this.errorReporter,
      this.i18n,
      onModeChange
    );

    this.languagePopupManager = new LanguagePopupManager(
      dom,
      this.i18n
    );
    this.refreshManager = new RefreshManager(
      dom,
      this.cacheManager,
      this.messageManager,
      this.i18n,
      async () => {
        await this.dataManager.loadData();
        this.dateManager.updateDateNumbers();
        this.dateManager.updateIndicator();
      }
    );

    this.themeView.init();
    this.selectManager.init();
    this.mainPopupManager.init();
    this.languagePopupManager.init();
    this.notificationView.init();

    this.i18n.localize();
  }
}
