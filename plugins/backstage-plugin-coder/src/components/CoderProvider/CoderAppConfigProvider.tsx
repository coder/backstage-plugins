import React, {
  type PropsWithChildren,
  createContext,
  useContext,
} from 'react';
import type { Config as CoderAppConfig } from '../../../config.d.ts';

export type { Config as CoderAppConfig } from '../../../config.d.ts';

const AppConfigContext = createContext<CoderAppConfig | null>(null);

export function useCoderAppConfig(): CoderAppConfig {
  const value = useContext(AppConfigContext);
  if (value === null) {
    throw new Error(
      `Hook ${useCoderAppConfig.name} must be called from a CoderProvider component`,
    );
  }

  return value;
}

type CoderSettingsProviderProps = Readonly<
  PropsWithChildren<{
    appConfig: CoderAppConfig;
  }>
>;

export const CoderAppConfigProvider = ({
  children,
  appConfig,
}: CoderSettingsProviderProps) => {
  return (
    <AppConfigContext.Provider value={appConfig}>
      {children}
    </AppConfigContext.Provider>
  );
};
