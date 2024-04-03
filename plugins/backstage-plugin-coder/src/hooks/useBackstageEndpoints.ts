import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { ASSETS_ROUTE_PREFIX, API_ROUTE_PREFIX } from '../api/CoderClient';

export type UseBackstageEndpointResult = Readonly<{
  baseUrl: string;
  assetsProxyUrl: string;
  apiProxyUrl: string;
}>;

export function useBackstageEndpoints(): UseBackstageEndpointResult {
  const backstageConfig = useApi(configApiRef);
  const baseUrl = backstageConfig.getString('backend.baseUrl');

  return {
    baseUrl,
    assetsProxyUrl: `${baseUrl}${ASSETS_ROUTE_PREFIX}`,
    apiProxyUrl: `${baseUrl}${API_ROUTE_PREFIX}`,
  };
}
