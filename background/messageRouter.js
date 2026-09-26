import { serializeError } from './errorUtils.js';

export class MessageRouter {
  constructor({
    updateService,
    scheduleService,
    addressService,
    cacheService
  }) {
    this.updateService = updateService;
    this.scheduleService = scheduleService;
    this.addressService = addressService;
    this.cacheService = cacheService;
  }

  createHandlers(message) {
    return {
      checkUpdate: () => this.updateService
        .check(message.owner, message.repo)
        .then(result => ({ result })),

      fetchYasno: () => this.scheduleService
        .buildYasnoTable(
          message.group,
          message.regionId,
          message.dsoId,
          message.currentDayNumber,
          message.dayType
        )
        .then(result => this.scheduleService.saveScheduleAndReturn(result)),

      fetchDTEK: () => this.scheduleService
        .buildDtekTable(message.type, message.group, message.dayType)
        .then(result => this.scheduleService.saveScheduleAndReturn(result)),

      fetchCity: () => this.addressService.getCities(message.params),
      fetchStreet: () => this.addressService.getStreets(message.type, message.params),
      fetchHouses: () => this.addressService.getHouses(message.type, message.params),
      fetchHouseData: () => this.addressService.getHouseData(message.type, message.params),

      clearTableCache: () => this.cacheService.clearTableCache(message.force === true),
      clearAllCache: () => this.cacheService.clearAllCache()
    };
  }

  handle(message, sender, sendResponse) {
    if (!message || typeof message.action !== 'string') {
      sendResponse({
        success: false,
        error: { message: chrome.i18n.getMessage('messageRouterInvalidMessage') }
      });
      return false;
    }

    const handler = this.createHandlers(message)[message.action];
    if (!handler) return false;

    Promise.resolve()
      .then(handler)
      .then(sendResponse)
      .catch(error => sendResponse({
        success: false,
        error: serializeError(error)
      }));

    return true;
  }

  register() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      return this.handle(message, sender, sendResponse);
    });
  }
}

export function registerMessageHandlers(services) {
  const router = new MessageRouter(services);
  router.register();
  return router;
}
