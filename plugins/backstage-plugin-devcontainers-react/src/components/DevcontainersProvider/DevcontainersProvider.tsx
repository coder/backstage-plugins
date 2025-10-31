import {
  type PropsWithChildren,
  createContext,
  useContext,
  useMemo,
} from 'react';

export const DEFAULT_DEVCONTAINERS_TAG = 'devcontainers-plugin';

export type DevcontainersConfig = Readonly<{
  /**
   * The tag appended by the devcontainers-backend plugin to flag components as
   * having a devcontainers file.
   *
   * By default, the backend and frontend plugins are configured to use the same
   * tag, but if the backend's tag is overridden, it must also be overridden in
   * the frontend config
   */
  tagName?: string;
}>;

type FullDevcontainersConfig = Required<DevcontainersConfig>;

const ConfigContext = createContext<FullDevcontainersConfig | null>(null);

export function useDevcontainersConfig() {
  const contextValue = useContext(ConfigContext);
  if (contextValue === null) {
    throw new Error(
      `${useDevcontainersConfig.name} is being called outside of a Devcontainers context`,
    );
  }

  return contextValue;
}

type Props = Readonly<
  PropsWithChildren<{
    config: DevcontainersConfig;
  }>
>;

export const DevcontainersProvider = ({ children, config }: Props) => {
  const stableConfig = useMemo<FullDevcontainersConfig>(() => {
    return {
      tagName: config.tagName ?? DEFAULT_DEVCONTAINERS_TAG,
    };
  }, [config]);

  return (
    <ConfigContext.Provider value={stableConfig}>
      {children}
    </ConfigContext.Provider>
  );
};
