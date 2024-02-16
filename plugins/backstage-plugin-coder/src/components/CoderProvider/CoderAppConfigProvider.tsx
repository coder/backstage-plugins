import React, {
  type PropsWithChildren,
  createContext,
  useContext,
} from 'react';

import type { YamlConfig } from '../../hooks/useCoderEntityConfig';

export type CoderWorkspaceConfig = Readonly<
  Exclude<YamlConfig, undefined> & {
    // Only specified explicitly to make templateName required
    templateName: string;

    // Defined like this to ensure array always has at least one element
    repoUrlParamKeys: readonly [string, ...string[]];
  }
>;

export type CoderDeploymentConfig = Readonly<{
  accessUrl: string;
}>;

export type CoderAppConfig = Readonly<{
  workspaces: CoderWorkspaceConfig;
  deployment: CoderDeploymentConfig;
}>;

const AppConfigContext = createContext<CoderAppConfig | null>(null);

export function useCoderAppConfig() {
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
