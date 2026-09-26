import { AddressService } from './addressService.js';
import { AlarmController } from './alarmController.js';
import { BackgroundCacheService } from './cacheService.js';
import { MessageRouter } from './messageRouter.js';
import { ScheduleService } from './scheduleService.js';
import { UpdateService } from './updateService.js';

export function createBackgroundServices() {
  const cacheService = new BackgroundCacheService();
  const addressService = new AddressService();
  const scheduleService = new ScheduleService({
    cacheService,
    addressService
  });
  const updateService = new UpdateService();

  return {
    cacheService,
    addressService,
    scheduleService,
    updateService,
    alarmController: new AlarmController(),
    messageRouter: new MessageRouter({
      updateService,
      scheduleService,
      addressService,
      cacheService
    })
  };
}

export function registerBackgroundServices() {
  const services = createBackgroundServices();

  services.alarmController.register();
  services.updateService.registerNotificationHandler();
  services.messageRouter.register();

  return services;
}
