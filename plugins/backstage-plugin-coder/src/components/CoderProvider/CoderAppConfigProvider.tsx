import React, {
  type PropsWithChildren,
  createContext,
  useContext,
} from 'react';
import type { WorkspaceCreationMode } from '../../hooks/useCoderWorkspacesConfig';

export type CoderAppConfig = Readonly<{
  deployment: Readonly<{
    accessUrl: string;
  }>;

  oauth?: Readonly<{
    clientId?: string;
    backendUrl?: string;
  }>;

  // Type is meant to be used with YamlConfig from useCoderWorkspacesConfig;
  // not using a mapped type because there's just enough differences that
  // maintaining a relationship that way would be a nightmare of ternaries
  workspaces: Readonly<{
    defaultMode?: WorkspaceCreationMode;
    defaultTemplateName?: string;
    params?: Record<string, string | undefined>;

    // Defined like this to ensure array always has at least one element
    repoUrlParamKeys: readonly [string, ...string[]];
  }>;
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
