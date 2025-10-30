import React from 'react';
import {
  DefaultProviderSettings,
  ProviderSettingsItem,
} from '@backstage/plugin-user-settings';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { coderAuthApiRef } from '../api/CoderAuthApi';
import { CoderLogo } from './CoderLogo';

/**
 * Provider settings component that includes Coder along with all default Backstage auth providers.
 * 
 * Use this as the `providerSettings` prop for `UserSettingsPage` to display Coder
 * alongside GitHub, Google, and other configured providers in the Settings page.
 * 
 * @example
 * ```tsx
 * import { UserSettingsPage } from '@backstage/plugin-user-settings';
 * import { CoderProviderSettings } from '@coder/backstage-plugin-coder';
 * 
 * <Route 
 *   path="/settings" 
 *   element={<UserSettingsPage providerSettings={<CoderProviderSettings />} />} 
 * />
 * ```
 * 
 * @public
 */
export const CoderProviderSettings = () => {
  const configApi = useApi(configApiRef);
  const providersConfig = configApi.getOptionalConfig('auth.providers');
  const configuredProviders = [...(providersConfig?.keys() || [])];

  return (
    <>
      {configuredProviders.includes('coder') && (
        <ProviderSettingsItem
          title="Coder"
          description="Sign in to Coder to access your development workspaces"
          apiRef={coderAuthApiRef}
          icon={() => <CoderLogo />}
        />
      )}
      <DefaultProviderSettings configuredProviders={configuredProviders} />
    </>
  );
};

