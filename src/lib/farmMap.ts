export interface FarmMapConfig {
  apiKey: string;
  domain: string;
  enabled: boolean;
  sourceYear: string;
}

const STORAGE_KEY = 'farmland-survey:farmmap-config';

const envConfig: FarmMapConfig = {
  apiKey: import.meta.env.VITE_FARMMAP_API_KEY ?? '',
  domain: import.meta.env.VITE_FARMMAP_DOMAIN ?? window.location.origin,
  enabled: Boolean(import.meta.env.VITE_FARMMAP_API_KEY),
  sourceYear: import.meta.env.VITE_FARMMAP_YEAR ?? '2025',
};

export function loadFarmMapConfig(): FarmMapConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return envConfig;
    return { ...envConfig, ...JSON.parse(raw) };
  } catch {
    return envConfig;
  }
}

export function saveFarmMapConfig(config: FarmMapConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('farmmap-config-changed', { detail: config }));
}

export function clearFarmMapConfig() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('farmmap-config-changed', { detail: envConfig }));
}

export const FARMMAP_WMS_ENDPOINT = 'https://agis.epis.or.kr/ASD/farmmapApi/wms.do';

export function getFarmMapWmsUrl(config: FarmMapConfig) {
  const query = new URLSearchParams({
    apiKey: config.apiKey,
    domain: config.domain,
  });
  return `${FARMMAP_WMS_ENDPOINT}?${query.toString()}`;
}
