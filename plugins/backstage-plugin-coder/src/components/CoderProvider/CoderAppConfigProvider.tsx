import React, {
  type PropsWithChildren,
  createContext,
  useContext,
} from 'react';

import type { YamlConfig } from '../../hooks/useCoderEntityConfig';

export type CoderAppConfig = Readonly<{
  deployment: Readonly<{
    accessUrl: string;
  }>;

  workspaces: Readonly<
    Exclude<YamlConfig, undefined> & {
      // Only specified explicitly to make templateName required
      templateName: string;

      // Defined like this to ensure array always has at least one element
      repoUrlParamKeys: readonly [string, ...string[]];
    }
  >;
}>;

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
