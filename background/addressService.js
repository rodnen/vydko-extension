import { YasnoAddressApi } from '../services/api/yasnoAddressApi.js';
import { DtekAddressApi } from '../services/api/dtekAddressApi.js';
import { serializeError } from './errorUtils.js';

const DEFAULT_PARAMS = {
  dnem: {
    city: 'м. Дніпро',
    street: 'тупик Шкільний'
  },
  kem: {
    city: null,
    street: 'бул. Шевченка Тараса'
  }
};

export class AddressService {
  #dtekApiInstances = {
    dnem: new DtekAddressApi('dnem'),
    kem: new DtekAddressApi('kem')
  };

  isYasnoType(type) {
    return type === 'yasno';
  }

  getDtekApi(type) {
    const api = this.#dtekApiInstances[type];
    if (!api) {
      throw new Error(`Невідомий тип DTEK: "${type}". Очікується "dnem" або "kem".`);
    }
    return api;
  }

  async getCities(params) {
    try {
      const { regionId, dsoId, query } = params;
      const api = new YasnoAddressApi({ regionId, dsoId });
      const data = await api.getCities(query);
      return { success: true, data };
    } catch (error) {
      console.error('[Address] помилка getCities:', error);
      return { success: false, error: serializeError(error) };
    }
  }

  async getStreets(type, params) {
    try {
      if (this.isYasnoType(type)) {
        const { regionId, dsoId, cityId, query } = params;
        const api = new YasnoAddressApi({ regionId, dsoId });
        const data = await api.getStreets(cityId, query);
        return { success: true, data };
      }

      const data = await this.getDtekApi(type).getStreets({ city: params.query });
      return { success: true, data };
    } catch (error) {
      console.error('[Address] помилка getStreets:', error);
      return { success: false, error: serializeError(error) };
    }
  }

  async getHouses(type, params) {
    try {
      if (this.isYasnoType(type)) {
        const { regionId, dsoId, cityId, streetId, query } = params;
        const api = new YasnoAddressApi({ regionId, dsoId });
        const data = await api.getHouses(cityId, streetId, query);
        return { success: true, data };
      }

      const data = await this.getDtekApi(type).getHomeNum(params);
      return { success: true, data };
    } catch (error) {
      console.error('[Address] помилка getHouseNumbers:', error);
      return { success: false, error: serializeError(error) };
    }
  }

  async getHouseData(type, params) {
    try {
      if (this.isYasnoType(type)) {
        const { regionId, dsoId, cityId, streetId, houseId } = params;
        const api = new YasnoAddressApi({ regionId, dsoId });
        const data = await api.getGroup(cityId, streetId, houseId);
        return { success: true, data };
      }

      const response = await this.getDtekApi(type).getHomeNum(params);
      const data = response.data?.[params.house]
        || response.data?.data?.[params.house]
        || {};

      return {
        success: true,
        data,
        updateTimestamp: response.updateTimestamp
      };
    } catch (error) {
      console.error('[DTEK/Yasno] помилка getHouseData:', error);
      return { success: false, error: serializeError(error) };
    }
  }

  async fetchDtekDefaultData(type) {
    const params = DEFAULT_PARAMS[type];
    const data = await this.getDtekApi(type).getHomeNum(params);
    return { success: true, data: data.fact };
  }
}

export { DEFAULT_PARAMS };
